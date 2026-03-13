-- ============================================
-- INITIAL SCHEMA
-- ============================================

-- USERS
CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text UNIQUE NOT NULL,
  "name" text,
  "image" text,
  "role" text DEFAULT 'user' NOT NULL,
  "stripe_customer_id" text,
  "stripe_connect_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- PRODUCTS (synced from providers)
CREATE TABLE IF NOT EXISTS "products" (
  "compound_id" text PRIMARY KEY NOT NULL,
  "provider_id" text NOT NULL,
  "raw_product_id" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "product_type" text,
  "thumbnail_url" text,
  "detail_json" text NOT NULL,
  "base_price_cents" integer,
  "currency" text,
  "colors_json" text,
  "sizes_json" text,
  "metadata_json" text,
  "enriched_at" timestamp,
  "is_active" boolean DEFAULT true NOT NULL,
  "last_synced_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- SYNC LOG
CREATE TABLE IF NOT EXISTS "sync_log" (
  "id" text PRIMARY KEY NOT NULL,
  "provider_id" text NOT NULL,
  "status" text NOT NULL,
  "products_updated" integer DEFAULT 0,
  "products_added" integer DEFAULT 0,
  "products_removed" integer DEFAULT 0,
  "error_message" text,
  "started_at" timestamp NOT NULL,
  "completed_at" timestamp
);

CREATE TABLE IF NOT EXISTS "sync_changes" (
  "id" text PRIMARY KEY NOT NULL,
  "sync_log_id" text NOT NULL REFERENCES "sync_log"("id") ON DELETE cascade,
  "compound_id" text NOT NULL,
  "change_type" text NOT NULL,
  "field_name" text,
  "old_value" text,
  "new_value" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- DECORATED PRODUCTS
CREATE TABLE IF NOT EXISTS "decorated_products" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text REFERENCES "users"("id") ON DELETE set null,
  "base_product_id" text NOT NULL,
  "name" text NOT NULL,
  "selected_colour_id" text NOT NULL,
  "canvas_state_json" text NOT NULL,
  "thumbnail_url" text,
  "status" text DEFAULT 'draft' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "anonymous_claim_tokens" (
  "token" text PRIMARY KEY NOT NULL,
  "decorated_product_id" text NOT NULL REFERENCES "decorated_products"("id") ON DELETE cascade,
  "expires_at" timestamp NOT NULL,
  "claimed_at" timestamp
);

-- ORDERS & CHECKOUT
CREATE TABLE IF NOT EXISTS "orders" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "store_id" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "stripe_payment_intent_id" text,
  "stripe_checkout_session_id" text,
  "subtotal" integer NOT NULL,
  "platform_fee" integer DEFAULT 0,
  "seller_payout" integer DEFAULT 0,
  "total_amount" integer NOT NULL,
  "currency" text DEFAULT 'usd' NOT NULL,
  "shipping_name" text,
  "shipping_address" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "order_items" (
  "id" text PRIMARY KEY NOT NULL,
  "order_id" text NOT NULL REFERENCES "orders"("id") ON DELETE cascade,
  "decorated_product_id" text NOT NULL REFERENCES "decorated_products"("id"),
  "quantity" integer NOT NULL,
  "size_breakdown" text NOT NULL,
  "unit_price" integer NOT NULL,
  "total_price" integer NOT NULL
);

-- QUOTES
CREATE TABLE IF NOT EXISTS "quotes" (
  "id" text PRIMARY KEY NOT NULL,
  "design_state_json" text NOT NULL,
  "quote_json" text NOT NULL,
  "lead_json" text,
  "status" text DEFAULT 'started' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- STORES
CREATE TABLE IF NOT EXISTS "stores" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "slug" text UNIQUE NOT NULL,
  "description" text,
  "logo_url" text,
  "header_image_url" text,
  "theme_config" text,
  "custom_domain" text,
  "is_published" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "store_products" (
  "id" text PRIMARY KEY NOT NULL,
  "store_id" text NOT NULL REFERENCES "stores"("id") ON DELETE cascade,
  "decorated_product_id" text NOT NULL REFERENCES "decorated_products"("id"),
  "display_name" text,
  "description" text,
  "markup_type" text DEFAULT 'percentage' NOT NULL,
  "markup_value" integer NOT NULL,
  "selling_price" integer NOT NULL,
  "sort_order" integer DEFAULT 0,
  "is_visible" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "store_connectors" (
  "id" text PRIMARY KEY NOT NULL,
  "store_id" text NOT NULL REFERENCES "stores"("id") ON DELETE cascade,
  "platform" text NOT NULL,
  "credentials" text NOT NULL,
  "external_store_url" text,
  "last_synced_at" timestamp,
  "status" text DEFAULT 'connected' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- PLATFORM SETTINGS
CREATE TABLE IF NOT EXISTS "platform_settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "user_pricing_overrides" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text UNIQUE NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "blank_markup_percent" integer NOT NULL,
  "note" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add orders.store_id FK (stores must be created first)
DO $$ BEGIN
  ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_stores_id_fk"
    FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Helper function: check if user is admin
-- Uses current_setting to read the JWT claim set by Supabase's request handler.
-- Falls back to checking the users table if called outside a request context.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
EXCEPTION WHEN OTHERS THEN
  -- Fallback: during migrations or when auth.jwt() is unavailable
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- USERS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_read_own" ON users;
CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (auth.uid()::text = id OR is_admin());
DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid()::text = id);
DROP POLICY IF EXISTS "users_insert" ON users;
CREATE POLICY "users_insert" ON users
  FOR INSERT WITH CHECK (true);

-- PRODUCTS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_public_read" ON products;
CREATE POLICY "products_public_read" ON products
  FOR SELECT USING (is_active = true OR is_admin());
DROP POLICY IF EXISTS "products_admin_write" ON products;
CREATE POLICY "products_admin_write" ON products
  FOR ALL USING (is_admin());

-- SYNC LOG
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sync_log_admin_only" ON sync_log;
CREATE POLICY "sync_log_admin_only" ON sync_log
  FOR ALL USING (is_admin());

-- SYNC CHANGES
ALTER TABLE sync_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sync_changes_admin_only" ON sync_changes;
CREATE POLICY "sync_changes_admin_only" ON sync_changes
  FOR ALL USING (is_admin());

-- DECORATED PRODUCTS
ALTER TABLE decorated_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "decorated_products_read_own" ON decorated_products;
CREATE POLICY "decorated_products_read_own" ON decorated_products
  FOR SELECT USING (auth.uid()::text = user_id OR user_id IS NULL OR is_admin());
DROP POLICY IF EXISTS "decorated_products_insert" ON decorated_products;
CREATE POLICY "decorated_products_insert" ON decorated_products
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "decorated_products_update_own" ON decorated_products;
CREATE POLICY "decorated_products_update_own" ON decorated_products
  FOR UPDATE USING (auth.uid()::text = user_id OR is_admin());
DROP POLICY IF EXISTS "decorated_products_delete_own" ON decorated_products;
CREATE POLICY "decorated_products_delete_own" ON decorated_products
  FOR DELETE USING (auth.uid()::text = user_id OR is_admin());

-- ANONYMOUS CLAIM TOKENS
ALTER TABLE anonymous_claim_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "claim_tokens_service_only" ON anonymous_claim_tokens;
CREATE POLICY "claim_tokens_service_only" ON anonymous_claim_tokens
  FOR ALL USING (is_admin());

-- ORDERS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_read_own" ON orders;
CREATE POLICY "orders_read_own" ON orders
  FOR SELECT USING (auth.uid()::text = user_id OR is_admin());
DROP POLICY IF EXISTS "orders_insert" ON orders;
CREATE POLICY "orders_insert" ON orders
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "orders_update_admin" ON orders;
CREATE POLICY "orders_update_admin" ON orders
  FOR UPDATE USING (is_admin());

-- ORDER ITEMS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_items_read_via_order" ON order_items;
CREATE POLICY "order_items_read_via_order" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (orders.user_id = auth.uid()::text OR is_admin())
    )
  );
DROP POLICY IF EXISTS "order_items_insert" ON order_items;
CREATE POLICY "order_items_insert" ON order_items
  FOR INSERT WITH CHECK (true);

-- QUOTES
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quotes_public_insert" ON quotes;
CREATE POLICY "quotes_public_insert" ON quotes
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "quotes_admin_read" ON quotes;
CREATE POLICY "quotes_admin_read" ON quotes
  FOR SELECT USING (is_admin());

-- STORES
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stores_read" ON stores;
CREATE POLICY "stores_read" ON stores
  FOR SELECT USING (is_published = true OR auth.uid()::text = user_id OR is_admin());
DROP POLICY IF EXISTS "stores_insert_own" ON stores;
CREATE POLICY "stores_insert_own" ON stores
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "stores_update_own" ON stores;
CREATE POLICY "stores_update_own" ON stores
  FOR UPDATE USING (auth.uid()::text = user_id OR is_admin());
DROP POLICY IF EXISTS "stores_delete_own" ON stores;
CREATE POLICY "stores_delete_own" ON stores
  FOR DELETE USING (auth.uid()::text = user_id OR is_admin());

-- STORE PRODUCTS
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store_products_read" ON store_products;
CREATE POLICY "store_products_read" ON store_products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = store_products.store_id
      AND (stores.is_published = true OR stores.user_id = auth.uid()::text OR is_admin())
    )
  );
DROP POLICY IF EXISTS "store_products_write_owner" ON store_products;
CREATE POLICY "store_products_write_owner" ON store_products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = store_products.store_id
      AND (stores.user_id = auth.uid()::text OR is_admin())
    )
  );

-- STORE CONNECTORS
ALTER TABLE store_connectors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store_connectors_owner" ON store_connectors;
CREATE POLICY "store_connectors_owner" ON store_connectors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = store_connectors.store_id
      AND (stores.user_id = auth.uid()::text OR is_admin())
    )
  );

-- PLATFORM SETTINGS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "platform_settings_public_read" ON platform_settings;
CREATE POLICY "platform_settings_public_read" ON platform_settings
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "platform_settings_admin_write" ON platform_settings;
CREATE POLICY "platform_settings_admin_write" ON platform_settings
  FOR ALL USING (is_admin());

-- USER PRICING OVERRIDES
ALTER TABLE user_pricing_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_pricing_admin_only" ON user_pricing_overrides;
CREATE POLICY "user_pricing_admin_only" ON user_pricing_overrides
  FOR ALL USING (is_admin());

-- ============================================
-- TRIGGER: Auto-create public.users on signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, created_at, updated_at)
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_app_meta_data ->> 'role', 'user'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
