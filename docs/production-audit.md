# KARIAKOO — Production Audit (Phase 1)

_Date: 2026-10-23 · Scope: full repository + live Supabase project `galecacpodrgshzsyitm`._

This is an evidence-based audit of the existing codebase. Every finding was verified
against the actual source, migrations, and (where noted) live database rows — not
inferred from docs. Severity reflects real exploitability / operational impact, not
theoretical risk.

## Baseline (verified)

| Check | Command | Result |
|-------|---------|--------|
| Typecheck | `npm run typecheck` | ✅ passed on 2026-10-24 |
| Unit tests | `npx vitest run` | ✅ 84 passed / 11 files (last recorded run) |
| Lint | `npm run lint` | ✅ passed on 2026-10-24 |
| Prod build | `npm run build` | ✅ passed on 2026-10-24 |
| RLS isolation suite | `supabase/tests/*.sql` | present; run only against a test DB, never prod |

Stack confirmed: Next.js 16.4.1 (App Router, Turbopack), React 19, TypeScript strict,
Supabase (`@supabase/ssr`), Zod 4, Tailwind 4, Vitest + Playwright. The app uses the
**publishable key only** — no service-role key in client or server code. ✅

## What is already strong (do not regress)

These are implemented correctly and must be preserved:

- **Server-authoritative checkout.** `place_order` (SECURITY DEFINER) reads every unit
  price and commission rate from the database; the client cannot change what is charged
  or owed. `reviewCheckout`/`placeOrder` recompute all totals server-side.
  (`src/app/[lang]/customer/checkout/actions.ts`, `20261019170000_dispatch_completion.sql`)
- **Idempotency is DB-enforced.** `orders` has `unique (customer_id, idempotency_key)`,
  so concurrent duplicate submissions cannot create two orders.
- **Role escalation is blocked.** `user_roles` has **no** insert/update/delete policy;
  roles are granted only by trusted server code. `has_role` is SECURITY DEFINER with an
  empty `search_path`.
- **PIN hash never leaves the DB.** `select` is revoked on `public.deliveries`; only
  non-PIN columns are granted. `delivery_pins` is readable only by the order's customer.
- **Immutability + guard triggers.** `order_items`, `commission_rules`, `audit_logs`
  are update/delete-blocked; `guard_shop_update` / `guard_product_update` /
  `guard_rider_update` / `guard_fulfillment_update` stop sellers/riders from editing
  moderation fields, approving themselves, or taking disallowed fulfilment steps.
- **Payment abstraction exists.** `getPaymentProviders()` gates checkout on
  `provider.configured`; orders start COD/`pending` with no fabricated success.

## Prioritized findings

### P0-1 · No stock restoration on rejection or cancellation — **High**
`place_order` decrements `products.stock` when an order is placed, but **no code path
ever restores it.** A grep across all migrations for stock increments / restoration
returns nothing. When a seller rejects a fulfilment group
(`awaiting_seller → rejected`, allowed by `guard_fulfillment_update`) or an order is
cancelled, the reserved stock is lost permanently. Over time, real inventory reads as
unavailable and sales are silently lost.
- **Files:** `20261015120000_core_schema_rls.sql` (guard), `20261019170000_dispatch_completion.sql`.
- **Fix:** a SECURITY DEFINER path that, on rejection/cancellation, restores
  `stock` for that group's items exactly once (idempotent — guard against double
  restore), inside a transaction. Add a DB regression test.
- Brief §6 explicitly requires "explicit stock-restoration rules."

### P0-2 · Demo data readable via public API (RLS gap) — **Medium**
The public read policies on `products` and `shops` filter only
`status='active' / status='approved'` — **not `is_demo`.** Live data:
**51 demo products** and **14 approved demo shops** are directly readable by anyone
holding the (public) publishable key, e.g. `GET /rest/v1/products?is_demo=eq.true`.
The customer UI is safe (`catalog-source.ts` filters `is_demo=false` twice), so the
storefront does not *show* demo data — but the **security boundary lives only in app
code, not in the database.**
- **Files:** `20261015120000_core_schema_rls.sql` (policies `products: public read live`,
  `shops: public read approved`), `src/lib/catalog-source.ts`.
- **Fix:** add `is_demo = false` to both public-read policies (defense in depth) and,
  for go-live, unapprove or purge demo shops/products.

### P1-3 · Delivery PIN: plaintext + no brute-force protection — **Medium**
`delivery_pins.pin` is stored in **plaintext** (the `deliveries.pin_hash` column exists
but is unused — an inconsistency). `rider_complete_delivery` compares a 4-digit PIN
(10,000 combinations) with **no attempt limit, lockout, or expiry.** The assigned rider
can brute-force completion without the customer ever providing the PIN.
- **Files:** `20261019170000_dispatch_completion.sql`.
- **Fix:** add a per-delivery attempt counter + lockout (e.g. 5 tries, then admin
  reset) and/or a validity window; hash the PIN at rest. Add a regression test.
- Brief §8/§13: "secure PIN verification with rate limits and expiry rules."

### P1-4 · `place_order` accepts a blank idempotency key — **Medium**
The idempotency match (`where ... idempotency_key = p_idempotency_key`) treats `''` as a
real key. A customer whose client ever sends an **empty** key would have their *second*
genuine order silently return the *first* order as `reused` and never be placed. The
client falls back to `crypto.randomUUID()` only when the field is **absent** (`?? `),
not when it is present-but-empty.
- **Files:** `20261019170000_dispatch_completion.sql`,
  `src/app/[lang]/customer/checkout/actions.ts:175`.
- **Fix:** reject null/blank keys in `place_order` (`raise` on `coalesce(btrim,'')=''`);
  ensure the client always generates a fresh non-empty UUID per checkout.

### P2-5 · Stock oversell race → confusing error (no data loss) — **Low**
`place_order` checks `stock < qty` from a snapshot read (no `FOR UPDATE`), then
decrements. The `products.stock >= 0` CHECK constraint **does** prevent oversell, so
there is no data corruption — but under concurrency the loser sees a raw
check-constraint error instead of "Not enough stock for X."
- **Fix:** guarded `UPDATE products SET stock = stock - qty WHERE id = ? AND stock >= qty`
  and raise the friendly message when 0 rows change (bundle with P1-4 in one
  `place_order` revision).

### P2-6 · Migration history drift — **Low/Medium**
DB migration versions (applied via the Supabase MCP) don't match the file-name
timestamps (e.g. file `20261019160000_place_order` vs DB `20261020061115`). A fresh
`supabase db push` could conflict or double-apply.
- **Fix:** reconcile `supabase_migrations.schema_migrations` with the files, and adopt
  one application path going forward.

## Phase 2 progress (2026-10-23)

**Shipped** — migration `20261023120000_stock_restoration_and_order_hardening.sql`,
regression test `supabase/tests/stock_restoration.sql`:

- ✅ **P0-1** — `restore_group_stock()` trigger on `fulfillment_groups` restores
  reserved stock exactly once when a group goes to `rejected`/`cancelled`, from any
  path, and records a `system` audit row.
- ✅ **P1-4** — `place_order` now rejects a blank/whitespace idempotency key (`22023`).
- ✅ **P2-5** — `place_order` locks each product row (`FOR UPDATE`) and decrements with a
  guarded `UPDATE ... WHERE stock >= qty`, so a concurrency loser gets a clear
  "Not enough stock" message.
- Verified: stock-restoration test 5/5 pass; existing `place_order` test still 5/5 pass
  (oversell still refused as `check_violation`); baseline vitest unchanged (no TS touched).

**Shipped** — migration `20261023130000_public_read_excludes_demo.sql`, test
`supabase/tests/public_demo_isolation.sql`:

- ✅ **P0-2** — the `shops`/`products` public-read policies now require
  `is_demo = false`, so demo rows are no longer reachable via the public API.
  Verified: anon visibility dropped from 51 demo products / 14 demo shops to **0 / 0**,
  real approved rows still visible; isolation test 4/4 pass.

**Shipped** — migration `20261023140000_pin_rate_limit.sql`, test
`supabase/tests/pin_rate_limit.sql`, callers updated
(`src/app/[lang]/rider/actions.ts`, `mobile/.../dispatch_repository.dart`):

- ✅ **P1-3** — `rider_complete_delivery` now locks the PIN after 5 wrong attempts
  for 15 minutes and resets on success. It returns jsonb (`{ok,error,...}`) instead
  of raising on a wrong/locked PIN, because a `RAISE` would roll the attempt counter
  back; authorization/state errors still raise. PIN stays plaintext by necessity (the
  customer must read it to hand it over); RLS + the rate limit are the controls.
  Verified: rate-limit test 6/6 pass; web typecheck 0 errors; vitest 84/84.

**Shipped** — migration `20261023150000_payment_transactions.sql`, code under
`src/lib/payments/`, tests `supabase/tests/payments_reconciliation.sql` +
`src/lib/payments/status.test.ts`, doc `docs/payments.md`:

- ✅ **Payments foundation (brief §9)** — an immutable, RLS-scoped
  `payment_transactions` ledger (idempotent on `(provider, provider_ref)`), an
  admin-only `record_payment_transaction` RPC that advances `orders.payment_status`
  through a validated state machine, a typed `PaymentAdapter` interface with a safe
  **disabled** registry (no live credentials, no fabricated success), and a COD
  reconciliation path. Verified: ledger test 6/6, status unit tests pass.
  Webhook routes + per-operator adapters remain credential-gated.

**Shipped** — migration `20261023160000_storage_product_images.sql`, code in
`src/lib/storage.ts` + seller composer wiring:

- ✅ **Product image uploads (brief §3)** — public `product-images` and
  `store-banners` buckets with owner-scoped storage RLS (a seller can write only
  under `product-images/{shop_id}/…`, enforced by `private.owns_shop` on the path;
  admins may moderate; public read). The seller composer now uploads the chosen
  photo to Storage and saves the public URL; `createProduct` validates the URL is
  under the shop's own folder before saving. `shops.banner_url` column added.
  Verified: buckets + 8 policies exist, storage helper unit tests pass, typecheck
  clean. Note: full upload e2e (logged-in seller + file picker) not run here;
  Storage image transformation/CDN resizing is a Pro-plan add-on if wanted later.

**Hardened** — migration `20261024180000_storage_upload_constraints.sql` also
enforces a 5 MB per-file limit and JPEG/PNG/WebP content types in both Storage
buckets; client-side file checks alone are not treated as a security boundary.

**Shipped** — migration `20261023170000_rider_incidents_settlements.sql`, test
`supabase/tests/rider_incidents_settlements.sql`, SafetyButton wired:

- ✅ **Rider SOS + settlement (brief §1 backend)** — `rider_incidents` table with
  `rider_report_incident` (rider-only) + `admin_update_incident` (validated
  open→acknowledged→resolved); the SafetyButton now files a DB-backed SOS alert
  (with best-effort GPS) instead of only showing call links. `rider_settlements`
  table + `admin_settle_rider_day` (idempotent daily reconciliation of DELIVERED
  payouts, one per rider/day) + `admin_mark_settlement_paid`; `deliveries.delivered_at`
  / `rider_settled_at` added and stamped on completion. Verified: rider-ops test
  10/10 pass; typecheck + unit suite green.

**Shipped** — `src/components/rider/JobOfferModal.tsx`, `DeliveryFlow` + rider
dashboard updated:

- ✅ **Rider dispatch UX (brief §1)** — a Bolt-style job-offer modal with a ticking
  countdown ring and Accept/Decline (replaces the plain offer list); the delivery
  flow now advances through accessible swipe-to-confirm steps (accept → picked up →
  on the way → PIN). Pickup/drop-off stay hidden until accept (RLS-correct). The map
  falls back to CARTO when no MapTiler key is set; confirm the provider's current
  commercial terms before production use. Typecheck + 92 unit tests green.

**Still open:** P2-6 (migration drift) — low priority. Credential-gated payment
webhooks + live operator adapters remain per the brief.

## Remaining production blockers

- **Payments:** no live Tanzanian provider adapter (M-Pesa / Mixx by Yas / Airtel /
  HaloPesa) is wired — the abstraction exists but orders are COD/pending only. Needs
  verified credentials + sandbox verification + signed, replay-protected webhooks.
- **Maps:** select a tile provider and plan whose terms cover production use; restrict
  any browser API key to the deployed domains.
- **E2E suite:** Playwright specs exist but were not run this pass (need a seeded test
  environment, never production).
- **Operational readiness:** complete a production-like security drill, backups/restore
  drill, monitoring and accessibility review.

## Follow-up

- Reconcile migration history between the connected Supabase project and this repo
  before the next production migration (`P2-6`).
- Integrate mobile-money providers only with real provider credentials, sandbox
  evidence, signed webhooks and idempotent reconciliation.
- Complete the production security, backup/restore, monitoring and accessibility
  reviews listed in [the launch checklist](production-launch-checklist.md).
