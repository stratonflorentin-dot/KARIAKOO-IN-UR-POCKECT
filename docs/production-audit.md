# KARIAKOO — Production Audit (Phase 1)

_Date: 2026-10-23 · Scope: full repository + live Supabase project `galecacpodrgshzsyitm`._

This is an evidence-based audit of the existing codebase. Every finding was verified
against the actual source, migrations, and (where noted) live database rows — not
inferred from docs. Severity reflects real exploitability / operational impact, not
theoretical risk.

## Baseline (verified)

| Check | Command | Result |
|-------|---------|--------|
| Typecheck | `npx tsc --noEmit` | ✅ 0 errors |
| Unit tests | `npx vitest run` | ✅ 84 passed / 11 files |
| Lint | `eslint` | not yet run this pass |
| Prod build | `next build` | not run (Windows C:-drive space constraint; run with `TMPDIR=/d/tmp`) |
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

## Remaining production blockers (beyond this pass)

- **Payments:** no live Tanzanian provider adapter (M-Pesa / Mixx by Yas / Airtel /
  HaloPesa) is wired — the abstraction exists but orders are COD/pending only. Needs
  verified credentials + sandbox verification + signed, replay-protected webhooks.
- **Product image uploads:** Supabase Storage buckets/policies not yet audited; verify
  MIME/size validation and owner-scoped Storage policies before enabling.
- **E2E suite:** Playwright specs exist but were not run this pass (need a seeded test
  environment, never production).
- **Lint + prod build:** run both to completion in an environment with adequate temp
  space.

## Recommended Phase 2 order

1. **P0-1 stock restoration** + **P1-4/P2-5 `place_order` hardening** (one migration,
   with DB regression tests). _Core integrity._
2. **P0-2 demo RLS** (`is_demo=false` on public policies) — one small migration.
3. **P1-3 PIN rate-limit/expiry** — one migration + test.
4. Payments adapter interface + Storage policy audit (larger, separate tracks).

Each fix ships as a new timestamped migration (no destructive changes, no data reset),
with the application types/queries updated where the schema changes, and a regression
test added before the change is considered done.
