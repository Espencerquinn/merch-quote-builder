import { sqliteTable, text, integer, uniqueIndex, primaryKey } from "drizzle-orm/sqlite-core";

// ============================================
// USERS & AUTH (Auth.js compatible)
// ============================================

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").unique().notNull(),
  emailVerified: integer("email_verified", { mode: "timestamp" }),
  passwordHash: text("password_hash"),
  name: text("name"),
  image: text("image"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeConnectId: text("stripe_connect_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const accounts = sqliteTable(
  "accounts",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
  ]
);

export const sessions = sqliteTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.identifier, table.token] }),
  ]
);

// ============================================
// PRODUCT CACHE
// ============================================

export const cachedProducts = sqliteTable("cached_products", {
  compoundId: text("compound_id").primaryKey(),
  providerId: text("provider_id").notNull(),
  rawProductId: text("raw_product_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  productType: text("product_type"),
  thumbnailUrl: text("thumbnail_url"),
  detailJson: text("detail_json").notNull(), // Full ProductDetail as JSON
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const syncLog = sqliteTable("sync_log", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  providerId: text("provider_id").notNull(),
  status: text("status", { enum: ["running", "completed", "failed"] }).notNull(),
  productsUpdated: integer("products_updated").default(0),
  errorMessage: text("error_message"),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

// ============================================
// DECORATED PRODUCTS
// ============================================

export const decoratedProducts = sqliteTable("decorated_products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  baseProductId: text("base_product_id").notNull(), // compound ID: "ascolour:5026"
  name: text("name").notNull(),
  selectedColourId: text("selected_colour_id").notNull(),
  canvasStateJson: text("canvas_state_json").notNull(), // per-view Fabric.js state
  thumbnailUrl: text("thumbnail_url"),
  status: text("status", { enum: ["draft", "published"] }).default("draft").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const anonymousClaimTokens = sqliteTable("anonymous_claim_tokens", {
  token: text("token").primaryKey().$defaultFn(() => crypto.randomUUID()),
  decoratedProductId: text("decorated_product_id").notNull().references(() => decoratedProducts.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  claimedAt: integer("claimed_at", { mode: "timestamp" }),
});

// ============================================
// ORDERS & CHECKOUT
// ============================================

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  storeId: text("store_id").references(() => stores.id),
  status: text("status", {
    enum: ["pending", "paid", "processing", "shipped", "delivered", "cancelled"],
  }).default("pending").notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  subtotal: integer("subtotal").notNull(), // cents
  platformFee: integer("platform_fee").default(0), // cents
  sellerPayout: integer("seller_payout").default(0), // cents
  totalAmount: integer("total_amount").notNull(), // cents
  currency: text("currency").default("usd").notNull(),
  shippingName: text("shipping_name"),
  shippingAddress: text("shipping_address"), // JSON
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  decoratedProductId: text("decorated_product_id").notNull().references(() => decoratedProducts.id),
  quantity: integer("quantity").notNull(),
  sizeBreakdown: text("size_breakdown").notNull(), // JSON: {"s": 5, "m": 10}
  unitPrice: integer("unit_price").notNull(), // cents
  totalPrice: integer("total_price").notNull(), // cents
});

// ============================================
// QUOTES (replaces in-memory storage)
// ============================================

export const quotes = sqliteTable("quotes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  designStateJson: text("design_state_json").notNull(),
  quoteJson: text("quote_json").notNull(),
  leadJson: text("lead_json"),
  status: text("status", {
    enum: ["started", "saved", "high-intent", "contact-requested"],
  }).default("started").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// ============================================
// MERCH STORES
// ============================================

export const stores = sqliteTable("stores", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  logoUrl: text("logo_url"),
  headerImageUrl: text("header_image_url"),
  themeConfig: text("theme_config"), // JSON
  customDomain: text("custom_domain"),
  isPublished: integer("is_published", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const storeProducts = sqliteTable("store_products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  decoratedProductId: text("decorated_product_id").notNull().references(() => decoratedProducts.id),
  displayName: text("display_name"),
  description: text("description"),
  markupType: text("markup_type", { enum: ["percentage", "fixed"] }).default("percentage").notNull(),
  markupValue: integer("markup_value").notNull(), // percentage points or cents
  sellingPrice: integer("selling_price").notNull(), // cents
  sortOrder: integer("sort_order").default(0),
  isVisible: integer("is_visible", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// ============================================
// PLATFORM PRICING
// ============================================

export const platformSettings = sqliteTable("platform_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const userPricingOverrides = sqliteTable("user_pricing_overrides", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  blankMarkupPercent: integer("blank_markup_percent").notNull(), // e.g. 30 means 30% markup
  note: text("note"), // admin note for why this override exists
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const storeConnectors = sqliteTable("store_connectors", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  storeId: text("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  platform: text("platform", { enum: ["shopify", "woocommerce"] }).notNull(),
  credentials: text("credentials").notNull(), // encrypted JSON
  externalStoreUrl: text("external_store_url"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  status: text("status", { enum: ["connected", "disconnected", "error"] }).default("connected").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
