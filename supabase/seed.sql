-- Create the store-assets bucket (public) for store logos, headers, etc.
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Products are seeded from seed_products.sql (loaded via config.toml sql_paths).
-- That file contains pre-enriched AS Colour product data (images, colors, sizes, pricing).
-- To regenerate after a fresh sync:
--   pg_dump "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     --data-only --table=products --no-owner --no-privileges \
--     > supabase/seed_products.sql
