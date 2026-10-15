# KARIAKOO

A multi-vendor marketplace for Kariakoo and Dar es Salaam. Customers buy from many shops in one order and **pay KARIAKOO**. KARIAKOO confirms the order with each shop, one rider collects and delivers everything, and each shop is paid after delivery, minus commission.

> **Status: Phase 1 complete, Phase 2 in progress.** The **store catalog is read live from Supabase** (schema, Row Level Security with 32 passing isolation checks, and a seeded demo catalog marked `is_demo`). Orders, riders and dashboards still use demo files until sign-in arrives. Real orders and payments are not live. No real money moves.

## Run it locally

You need **Node.js 20 or newer** (developed on Node 26) and npm.

```bash
npm install
npm run dev
```

Open **http://localhost:3000**. It redirects to the customer store at `/customer`.

To preview the other roles, open **http://localhost:3000/dev** and pick Customer, Business owner, Rider or Admin. This page **only exists in development**: a production build (`npm run build && npm start`) returns 404 for it and ignores the preview cookie, so every dashboard stays locked.

| Role | Area | Demo identity |
|---|---|---|
| Customer | `/customer` (public store; orders/profile need the role) | Asha Mohamed |
| Business owner | `/seller` | Msimbazi Mobile Hub |
| Rider | `/rider` (phone-first) | Hamisi Ally |
| Admin / founder | `/admin` | Founder (demo) |

Try this: as the **customer**, open order KK-260102 to see its delivery PIN (`4821`). Then switch to the **rider**, open KK-260102, and enter the PIN. The server checks it.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server with the role preview |
| `npm run build` / `npm start` | Production build / server (role preview disabled) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (strict) |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright browser tests, desktop and mobile (run `npx playwright install chromium` once) |

## Environment variables

Copy `.env.example` to `.env.local`. Nothing is required to run the demo. See `.env.example` for what each variable does. **Never** put the Supabase secret key or payment keys in a `NEXT_PUBLIC_` variable.

## Project structure

```
src/
  app/
    customer/       store: home, search, shops, product, cart, checkout, orders, profile
    seller/         business dashboard: overview, orders, products, finances (+ CSV export)
    rider/          phone-first rider app: requests, active delivery + map, history, profile
    admin/          founder control centre: overview, orders, businesses, riders, customers, products, commission
    dev/            development-only role preview
  components/       design system (ui/), role layouts, product, cart, checkout, orders, rider map
  data/demo/        ALL demo data lives here (marked isDemo), kept apart from real data
  lib/
    money.ts        exact integer money: commission, totals, refunds, settlements
    commission.ts   commission rule resolution (shop > category > default, by effective date)
    pricing.ts      server-only checkout pricing (never trusts browser prices)
    status.ts       payment / fulfilment / delivery state machines with role rules
    data/access.ts  role-scoped data access (the app-side twin of RLS)
    auth/           server-side session and the dev role preview
    delivery-pin.ts server-only PIN verification with attempt limits
    supabase/       Supabase clients and live connection check
e2e/                Playwright tests
supabase/migrations SQL migrations (schema + Row Level Security)
```

## Database (Supabase)

Project: **KARIAKOO-IN-UR-POCKECT**. All database changes are SQL files in `supabase/migrations/`, applied in order:

| File | What it does |
|---|---|
| `20261015120000_core_schema_rls.sql` | 13 tables (profiles, user_roles, categories, shops, products, riders, commission_rules, orders, order_items, fulfillment_groups, deliveries, order_status_history, audit_logs), constraints, RLS on every table, integrity triggers |
| `20261015123000_private_helpers_and_indexes.sql` | Moves permission helpers to a private schema (not exposed by the API), locks trigger functions, adds foreign-key indexes |
| `20261015140000_departments_photos_locations.sql` | Product department (men/women/kids/unisex), product type, photo URL (https only), shop map coordinates |

- **Isolation tests:** `supabase/tests/rls_isolation.sql`. Paste it into the Supabase SQL editor and run it. It impersonates customers, sellers, riders and an admin, checks 32 rules, then rolls everything back. The expected result is an "error" saying `RLS OK: 32 checks passed`.
- **Demo catalog:** `node scripts/generate-demo-seed.mts` regenerates `supabase/seed/demo_catalog.sql` from `src/data/demo/`. It's safe to re-run, and every row has `is_demo = true`.
- **How the app reads it:** `src/lib/catalog-source.ts` (server-only) loads categories, approved shops and active products with the publishable key, so RLS decides what is visible. Results are cached and refreshed about every minute. If Supabase is missing or unreachable, the store falls back to the demo files. The store footer and the admin Systems card always show which source is live.
- **Roles** live in `user_roles`, which **no client can write**. New sign-ups automatically get the `customer` role. Seller, rider and admin roles are granted only by trusted server code after verification. There is no public admin sign-up.

## Key engineering decisions

- **Money is exact.** All amounts are integer Tanzanian shillings and rates are integer basis points (1000 = 10%). There is no floating-point maths on money. Commission is rounded half-up per line.
- **Commission** defaults to **10%** of the merchandise subtotal (delivery excluded). Each order item stores the rate in force when it was ordered, so rate changes only affect future orders. Example in the demo: order KK-251208 keeps its 2025 rate of 12%.
- **The browser is never trusted.** The cart stores only product ids and quantities. Checkout re-prices everything on the server (`server-only` modules make the build fail if pricing code is imported into browser code).
- **Authorization runs on the server, at every layer.** Hidden links are not security. Each protected page calls `requireRole()` itself, because in Next.js a layout and its page render in parallel, so a layout check alone does not stop page code. Data functions check the role again. Other people's records return 404, so ids can't be probed.
- **Statuses are separate.** Payment, fulfilment (per shop) and delivery each have their own state machine. Sellers can never mark goods delivered; riders complete delivery only with the customer's PIN, verified on the server.
- **Every kind of shop.** 16 shop types (fashion, electronics, pharmacy, food, furniture, auto parts and more), each with its own label, icon and colour. Pharmacies list over-the-counter products only; prescription medicines are not sold online, and pharmacy licences must be verified at onboarding.
- **Departments.** Men, Women and Kids pages (`/customer/department/men` etc.) with type chips: shirts, T-shirts, blouses, trousers, jeans, dresses, skirts, jackets, traditional wear, sneakers, formal shoes, sandals, school shoes, bags, watches and more. Unisex items appear under both Men and Women. Search also filters by "For" and "Type".
- **Adding products with a photo.** The seller's "Add a product" form validates the photo (JPG/PNG/WebP, 5 MB max, must decode as an image), the description (20 to 1,000 characters), price and stock, and shows a live customer preview (card and product page). In demo mode the photo stays on the seller's device; real uploads go to Supabase Storage once sellers sign in (Phase 3). Product cards and pages show the photo whenever a product has one (https URLs only).
- **Maps (satellite by default)** for every role: riders (pickups, drop-off, route guide, opt-in location), customers (map of all shops, each shop's location with directions, their order's delivery route) and shop owners ("Your shop on the map"). Every map has a Satellite / Map toggle.
- **Rider map.** MapLibre GL, with the setup adapted from the `my-view` project. It shows numbered pickups, the drop-off, a guide line and "Navigate" handoff to Google Maps. Location sharing is opt-in, stays on the phone, and stops when the rider leaves the screen. There is no fake live tracking for customers; they see an honest status timeline.

## What works now (tested)

- Customer store: home, search with filters (category, price, availability, shop location), sorting and pagination, shop directory by type, shop pages with their own search, product pages, recently viewed, delivery area selector.
- Cart: add, change quantity, remove, grouped per shop, delivery fee by area plus an extra pickup fee per shop, estimated total.
- Checkout: Zod validation (Tanzanian phone numbers), only configured payment methods selectable, server-verified total. **Placing orders is disabled** until Phase 4.
- Dashboards for all four roles on demo data, with role-scoped access, the rider PIN check, seller CSV export, and the live Supabase status check.
- Tests: 88 unit tests (money, commission, statuses, search, cart, validation, pricing, isolation, PIN, metrics) and 35 Playwright browser tests (desktop and mobile).

## Still demo data or preview-only

All products, shops, people, orders, commissions, deliveries and settlements are demo data. Dashboard buttons marked "demo preview: not saved" (seller order actions, product edits, admin moderation, rider steps other than the PIN check) change only the current browser tab.

## Known limitations

- Pages that stream (for example a hidden product) can return HTTP 200 with a "Page not found" body and a `noindex` tag. That's because Next.js sends the page shell before the not-found decision.
- The PIN attempt limit is kept in server memory (resets on restart) until it moves to the database in Phase 4.
- Product photos are illustrated placeholders until seller image upload (Phase 3).
- `npm audit` reports 5 "high" issues in `braces`, which is used only by ESLint during development. It does not reach the website. The suggested fix downgrades ESLint, so it is not applied.

## Roadmap checklist

### Phase 2: database and authentication
- [x] Supabase project connected (`.env.local`), live connection check
- [x] Migrations: schema, constraints, indexes
- [x] Row Level Security policies + isolation tests in the database (32/32 passing)
- [x] Demo catalog seeded (16 categories, 14 shops, 42 products, `is_demo`)
- [ ] Supabase Auth (phone OTP / email), protected routes, roles from `user_roles` (admin-only writes)
- [ ] Admin accounts created only by a protected provisioning script (no public admin sign-up), MFA
- [x] Store catalog read from Supabase (with demo-file fallback)
- [ ] Orders, riders and dashboards read from Supabase (needs sign-in)

### Phase 3: seller operations
- [ ] Onboarding and verification documents (private storage bucket), pharmacy licence checks
- [ ] Product CRUD via server actions with Zod; image upload (type and size checks)
- [ ] Inventory movements; stock reservation to prevent overselling

### Phase 4: orders and payments
- [ ] Create orders in a database transaction with idempotency keys; immutable price/commission snapshots
- [ ] Choose a Tanzanian payment provider after checking fees, settlement, split-payment support and licensing
- [ ] Provider adapter; sandbox first; signed webhooks with duplicate-event protection
- [ ] Payment status changes only from verified provider confirmations

### Phase 5: admin control centre
- [ ] Audited approvals, suspensions, commission rule creation, refunds, disputes
- [ ] Settlements ledger (append-only), reconciliation, CSV reports

### Phase 6: rider operations
- [ ] Registration and documents, dispatch and assignment, pickup codes, delivery proofs
- [ ] Opt-in location sharing to dispatch with privacy controls, payouts

### Phase 7: production
- [ ] Security review, backups and restore drill, error monitoring, performance and accessibility audit
- [ ] Commercial map tiles and satellite imagery: the keyless Esri imagery and CARTO streets are for development only. Add a licensed plan (e.g. MapTiler, set `NEXT_PUBLIC_MAPTILER_API_KEY`) before launch (ask first, may cost money)
- [ ] Deployment (ask first, may cost money)
