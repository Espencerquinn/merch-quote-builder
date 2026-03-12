# Merch Makers - Development Guide

## Stack

- **Frontend**: Vite + React 19 + TanStack Router + Tailwind CSS 4
- **Backend**: Supabase (Auth, Postgres with RLS, Storage, Edge Functions)
- **Payments**: Stripe (via Edge Functions)
- **Design Canvas**: Fabric.js 7
- **Hosting**: CloudFlare Pages (static) + Supabase (backend)

## After Any Code Changes

Always run the end-to-end tests to verify the app still works:

```bash
npx playwright test
```

This runs 92 tests (~29s): 83 core tests + 9 edge-function-dependent tests (skipped unless `EDGE_FUNCTIONS=true`).

To run with edge functions: `EDGE_FUNCTIONS=true npx playwright test`.

The global setup (`e2e/global-setup.ts`) resets the database, reseeds the admin user, and auto-starts `supabase functions serve --no-verify-jwt` (needed because the built-in edge runtime has an ES256 JWT verification bug).

## Prerequisites

- Local Supabase must be running: `supabase start`
- Dev server starts automatically via Playwright config (or reuses existing on port 3000)
- Edge functions are auto-started by the test global setup (no manual step needed)

## Development

```bash
npm run dev              # Start Vite dev server on port 3000
npm run functions:serve  # Start Supabase Edge Functions locally
supabase start           # Start local Supabase (Postgres, Auth, Storage)
```

## Database Commands

```bash
supabase db reset     # Reset DB, run migrations, and reseed (or: npm run db:reset)
npm run db:seed       # Seed admin user (austin@merchmakers.com / testpassword123)
supabase migration new <name>  # Create a new migration file
```

Migrations live in `supabase/migrations/`. Schema changes are written as raw SQL.
Seed data: `supabase/seed.sql` (storage buckets) + `supabase/seed_products.sql` (456 AS Colour products).
Both run automatically on `supabase db reset` via `config.toml` sql_paths.

**Do NOT run AS Colour product sync automatically** — it takes ~8 minutes. The seed file contains pre-synced data.
To regenerate: manually sync via admin UI, then `pg_dump ... --data-only --table=products > supabase/seed_products.sql`.

## Deployment

```bash
npm run deploy:pages      # Build + deploy static assets to CloudFlare Pages
npm run deploy:functions  # Deploy all Edge Functions to Supabase
```

## Key Environment Variables

Frontend (in `.env.local`, VITE_ prefix = exposed to browser):
- `VITE_SUPABASE_URL` — Supabase API URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key
- `VITE_STRIPE_PUBLISHABLE_KEY` — Stripe publishable key
- `VITE_APP_URL` — App URL

Edge Function secrets (set via `supabase secrets set`):
- `STRIPE_SECRET_KEY` — Stripe secret key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `ASCOLOUR_API_URL`, `ASCOLOUR_SUBSCRIPTION_KEY`, `ASCOLOUR_EMAIL`, `ASCOLOUR_PASSWORD`

## Architecture

- **Routes**: `src/routes/` (TanStack Router file-based routing)
- **Components**: `src/components/` (shared React components)
- **Supabase Client**: `src/lib/supabase/client.ts`
- **Auth Context**: `src/lib/auth/context.tsx` (provides `useAuth()`)
- **Edge Functions**: `supabase/functions/` (14 Deno functions)
- **Schema + RLS**: `supabase/migrations/20260301000000_initial_schema.sql`
- **Store URLs**: `/store/{uuid}` (not slugs)
