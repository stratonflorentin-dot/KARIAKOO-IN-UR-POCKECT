# Production launch checklist

The app already separates live Supabase data from demo fixtures, applies role and row-level access controls, supports shop product photo uploads, and offers cash on delivery. Complete these provider and operational items before opening production to customers.

## Credentials and data access

- Set the Supabase project URL and publishable key in the deployment environment. The publishable key is intended for browser use; database row-level security must remain enabled.
- Keep Supabase secret/service-role keys and payment credentials in server-only environment variables. Never prefix them with `NEXT_PUBLIC_`, commit them, or send them to the browser.
- Confirm production tables and Storage buckets have the intended RLS policies; verify customer, seller, rider, and admin access with separate accounts. Product and banner buckets enforce a 5 MB limit and accept only JPEG, PNG, or WebP uploads.

## Maps

- Choose a tile provider whose terms allow the expected commercial traffic. The keyless CARTO fallback is for development; confirm its current terms before production use.
- For MapTiler, configure a browser key restricted to the production domains and set `NEXT_PUBLIC_MAPTILER_API_KEY` in the deployment environment.
- Verify pickup, delivery, and rider navigation on real mobile devices with location permission granted and denied.

## Payments

- Cash on delivery is available. Online mobile-money methods stay unavailable until a provider is configured; do not show a method as payable until its server-side create-payment and signed webhook flows are working.
- Before enabling a provider, configure its server-only credentials and webhook secret, verify signatures, handle retries idempotently, and reconcile provider events against order payment state.
- Run end-to-end sandbox cases for success, rejection, timeout, duplicate webhook, and refund/cancellation before enabling the method in production.

## Security and operations

- Exercise role changes and authorization boundaries using separate customer, seller, rider, and staff accounts. Confirm unauthorized reads and writes are denied by the database, not only hidden in the UI.
- Test delivery claim races, customer privacy, staff audit events, account logout, password recovery, and Storage upload ownership.
- Review the admin audit log after privileged actions and confirm the operational response process for suspicious activity and reported incidents.
- Run production-like security drills and resolve findings before launch.
