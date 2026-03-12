-- =============================================================================
-- Cleanup: Remove Auth.js leftovers and add performance indexes
-- =============================================================================

-- Drop Auth.js tables (project uses Supabase Auth, these were never used)
DROP TABLE IF EXISTS verification_tokens;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS accounts;

-- Remove dead columns from users table
-- password_hash: Supabase Auth manages passwords in auth.users
-- email_verified: Supabase Auth has native email verification
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;

-- =============================================================================
-- Performance indexes for frequently queried columns
-- =============================================================================

-- products: queried by provider_id, is_active, enriched_at (sync + catalog)
CREATE INDEX IF NOT EXISTS idx_products_provider_active ON products(provider_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_active_enriched ON products(is_active, enriched_at);
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);

-- decorated_products: queried by user_id, status
CREATE INDEX IF NOT EXISTS idx_decorated_products_user_id ON decorated_products(user_id);
CREATE INDEX IF NOT EXISTS idx_decorated_products_status ON decorated_products(status);

-- stores: queried by user_id (slug already has UNIQUE index)
CREATE INDEX IF NOT EXISTS idx_stores_user_id ON stores(user_id);

-- store_products: queried by store_id + is_visible together (storefront hot path)
CREATE INDEX IF NOT EXISTS idx_store_products_store_visible ON store_products(store_id, is_visible);

-- orders: queried by user_id, status
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- order_items: queried by order_id
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- sync: queried by sync_log_id, provider_id
CREATE INDEX IF NOT EXISTS idx_sync_log_provider_id ON sync_log(provider_id);
CREATE INDEX IF NOT EXISTS idx_sync_changes_sync_log_id ON sync_changes(sync_log_id);

-- anonymous_claim_tokens: decorated_product_id FK (token is PK, already indexed)
CREATE INDEX IF NOT EXISTS idx_claim_tokens_product ON anonymous_claim_tokens(decorated_product_id);
