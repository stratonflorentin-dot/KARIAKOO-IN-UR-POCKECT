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

- **Ground Parcel Transport Selection (Usafiri wa Mizigo Ardhini)**:
  - Complete ground vehicle dispatch selection for customers and shopkeepers:
    - **Pickup Ndogo** (Small Pickup / Carry, e.g. TZS 21,000) for commercial small goods and cartons.
    - **Bajaji ya Mizigo** (Cargo Tricycle / Guta, e.g. TZS 17,000) for medium parcels and wholesale bags.
    - **Pikipiki ya Mizigo** (Cargo Motorcycle Carrier, e.g. TZS 11,500) for light parcels and envelopes.
    - **Lori Dogo** (Light Truck / Canter, e.g. TZS 31,000) for heavy bulk goods and container bales.
  - Dedicated ground parcel booking screen (`/customer/transport`) with route origin & destination presets (e.g. Newland → Moshi Bus Stand, Kariakoo Lumumba → Mbezi Luis).
  - Integrated into customer checkout (`/customer/checkout`) and seller order management (`/seller/orders`) allowing shopkeepers to pick vehicle size upon dispatch.
- **Kariakoo Market Price Match (Linganisha Bei)**:
  - Multi-shop price comparison per product (`/customer/compare` and on product detail pages).
  - Allows customers to see different shops offering the same item with varying prices, availability, and shop ratings in one place.
- **PWA (Progressive Web App) Ready**: Full Web Manifest (`/manifest.webmanifest`) supporting "Add to Home Screen" on Android & iOS, standalone app display mode, and custom branding theme colors.
- **Wholesale Volume Tier Pricing (Bei ya Jumla na Rejareja)**:
  - Supports dual retail and wholesale volume tiers per product.
  - Automatic pricing tier activation when minimum wholesale quantity (`wholesaleMinQty`) is reached in cart or checkout quote.
  - Dedicated "Bei ya Jumla" badge on storefront product cards and detailed volume savings box on product pages.
- **Upcountry Bus Parcel Delivery (Mizigo ya Mikoani)**:
  - Dual delivery checkout selector: Dar es Salaam Doorstep delivery vs. Upcountry Bus Office parcel dropoff.
  - Integrated with major Tanzanian bus parcel operators (Abood Bus, BM Coach, Shabiby Line, Tahmeed Coach, Al Saedy, Kidia One, Zanzibar Ferry/Azam Marine).
  - Collects destination town, recipient details, and directs riders to deposit at carrier parcel counters and provide waybill numbers.
- **Quick Landmark Address Presets**:
  - One-tap quick presets on checkout for "🏠 Nyumbani" (Home) and "🏢 Kazini / Ofisini" (Office) to format Dar es Salaam landmark directions without tedious retyping.
- **Seller Rush-Hour Busy Mode**:
  - One-tap status toggle in the seller console ("Duka Lipo Wazi" vs. "Nipo Bize Dukani / Sitisha Maagizo") allowing stall owners on congested streets (Congo, Aggrey) to temporarily pause new online orders during heavy physical in-store rushes.
- **Rider COD Cash-in-Hand Safety Tracker**:
  - Active balance monitor on the rider dashboard tracking collected cash on delivery with safety reminders to deposit to mobile money agents.
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
