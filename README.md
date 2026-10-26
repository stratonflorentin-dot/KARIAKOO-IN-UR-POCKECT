# KARIAKOO

A multi-vendor marketplace for Kariakoo and Dar es Salaam. Customers order from local shops, sellers manage their listings and fulfilment, riders handle assigned deliveries, and staff review marketplace activity.

## Run locally

Use Node.js 20 or newer. Configure Supabase before opening the store; the app does not replace missing live data with sample listings.

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local`, then set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Apply the SQL migrations in `supabase/migrations/` to the connected project. The `/dev` role preview and fake accounts have been removed; protected areas require a real Supabase session and role.

## Main areas

| Role | Area | Access |
|---|---|---|
| Customer | `/customer` | Public live catalog; sign-in required to place orders and view account data |
| Seller | `/seller` | Approved seller account and owned shop |
| Rider | `/rider` | Approved rider account; live offers, assignments, presence and delivery steps |
| Admin | `/admin` | Staff account with the admin role |

## Production features & role enhancements

- **PWA (Progressive Web App) Ready**: Full Web Manifest (`/manifest.webmanifest`) supporting "Add to Home Screen" on Android & iOS, standalone app display mode, and custom branding theme colors.
- **Customer Escrow & Landmark Address**:
  - Swahili escrow trust guarantee on checkout (*Malipo yako yanashikiliwa kwa usalama*), reassuring buyers that payment is held safely until they verify delivery with their 4-digit PIN.
  - Detailed Dar es Salaam landmark address input (street name, prominent landmarks, gate color, floor/office) tailored to local dispatch realities.
  - Customer order list with real-time status tabs and fast instant search by order reference or item name.
- **Seller Order Management**:
  - Live order search and status filtering (New, Preparing, Completed) in the seller console.
  - Privacy-scoped order feed showing only order items belonging to the seller's shop.
- **Rider Navigation & Safety**:
  - Pure in-app turn guidance and waypoint routing powered by MapLibre & OpenStreetMap, keeping riders inside the native app without external redirects.
  - One-tap SOS emergency trigger with persistent incident reporting dispatched to administration.
  - 4-digit delivery handoff verification preventing disputed drops.
- **Admin Emergency & Incident Response**:
  - Real-time urgent SOS alert banner on the admin dashboard with immediate dispatch coordinates and quick incident resolution workflows.
- **Social Commerce & Sharing**:
  - Native Web Share API (`navigator.share`) with automatic clipboard copy fallback for product pages, shops, categories, and customer order tracking.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Next.js development server |
| `npm run build` / `npm start` | Build and run the production app |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript checks |
| `npm test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright browser tests |

## Live data behavior

- The customer catalog reads approved, active Supabase records with `is_demo = false`. If Supabase is unavailable, the catalog stays empty and reports that live listings could not be loaded.
- Authentication and role selection use Supabase Auth and the `user_roles` table. The app has no role-preview cookie, hardcoded accounts, or `/dev` route.
- Checkout prices and creates orders through the `place_order` database function. Stock, fees, and commission are decided in the database transaction.
- Seller products, orders, finances, promotions and exports read/write the seller's own Supabase records under RLS.
- Rider availability, offers, assignments and delivery completion use database RPCs. A rider's customer PIN is verified by `rider_complete_delivery`.
- Admin overview, customer records, products, commission rules, orders and seller/rider applications read live database records.
- Old catalogue fixtures remain under `src/data/demo/` for isolated unit-test setup only. App pages do not import those fixtures.

## Supabase migrations

Apply the migrations in timestamp order. Recent migrations add rider dispatch, role applications, order placement, delivery PIN completion, seller promotions, and the privacy-scoped seller order feed. The seller order feed migration is `20261020153110_seller_order_feed.sql`.

`supabase/seed/demo_catalog.sql` contains seed rows marked `is_demo = true`; the live storefront and admin listing counts filter those rows out. Do not run sample records into production if you want an empty real marketplace.

The RLS isolation script is `supabase/tests/rls_isolation.sql`. It uses transaction-scoped role impersonation and rolls its changes back.

## Environment and launch limits

- Never expose Supabase secret keys or payment credentials through `NEXT_PUBLIC_` variables.
- Cash on delivery is available. Mobile-money adapters and signed payment webhooks still need provider integration before enabling M-Pesa, Mixx, Airtel Money or HaloPesa credentials.
- Seller product photos upload to the shop's Supabase Storage folder under owner-scoped policies with a 5 MB JPEG/PNG/WebP limit; products without a photo use a category placeholder.
- Rider SOS includes emergency call links and persisted incident reports; rider settlements are reconciled through admin operations.
- Choose a map-tile provider whose terms cover production use. The CARTO fallback is intended for development; configure a domain-restricted MapTiler key or another licensed provider for production.
- Before launch, complete the security review, backups/restore drill, monitoring, accessibility review and payment-provider verification. See [the production launch checklist](docs/production-launch-checklist.md).
