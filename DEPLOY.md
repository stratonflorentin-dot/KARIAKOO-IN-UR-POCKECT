# Deploying KARIAKOO

The web app is a Next.js 16 project deployed on Vercel, linked to this GitHub
repo. Every push to `main` triggers a production deploy automatically.

## Vercel project
- Project: `kariakoo-in-ur-pockect`
- Framework preset: Next.js (auto-detected)
- Production branch: `main`

## Required environment variables
Set these in Vercel → Project → Settings → Environment Variables for
Production, Preview and Development. Both are the **client-safe** values from
`.env.local` (they ship in the browser bundle by design):

| Key | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://galecacpodrgshzsyitm.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the Supabase **publishable** key |

**Never** add the Supabase service-role / secret key to the client project.
It is only needed server-side for future payment webhooks, and must live in a
server-only variable (no `NEXT_PUBLIC_` prefix) when that lands.

## What the live site shows (vs local dev)
- The dev-only role preview (`/dev`) and demo identities are **disabled** in
  production builds.
- The live site uses real Supabase Auth (email confirmation is **on**), the
  live catalog, the apply→approve flow and the tested backend RPCs.
- Role dashboards still read demo-seeded data where live wiring is pending;
  web checkout and payments are not wired to a provider yet.

## Notes
- Vercel Authentication (deployment protection) may be enabled on new projects;
  turn it off in Settings → Deployment Protection if testers should reach the
  `*.vercel.app` URL without logging in to Vercel.
