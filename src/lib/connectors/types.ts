/**
 * Store Connector interface — mirrors the ProductProvider pattern.
 * Each connector syncs decorated products to an external e-commerce platform
 * and can pull orders back for fulfillment tracking.
 */

export interface ExternalProduct {
  externalId: string;
  title: string;
  url: string;
  status: "active" | "draft" | "archived";
}

export interface ExternalOrder {
  externalId: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  currency: string;
  items: {
    externalProductId: string;
    quantity: number;
    unitPrice: number;
    size?: string;
  }[];
  customer: {
    name: string;
    email: string;
  };
  createdAt: string;
}

export interface ConnectorCredentials {
  /** Shopify: store domain (e.g. "my-store.myshopify.com") */
  storeUrl?: string;
  /** Shopify: Admin API access token */
  accessToken?: string;
  /** WooCommerce: site URL (e.g. "https://mysite.com") */
  siteUrl?: string;
  /** WooCommerce: consumer key */
  consumerKey?: string;
  /** WooCommerce: consumer secret */
  consumerSecret?: string;
}

export interface SyncResult {
  created: number;
  updated: number;
  failed: number;
  errors: string[];
}

export interface StoreConnector {
  platform: "shopify" | "woocommerce";

  /** Verify that the credentials are valid and the connection works */
  testConnection(): Promise<{ success: boolean; message: string }>;

  /** Push a decorated product to the external store */
  createProduct(product: {
    title: string;
    description: string;
    price: number; // cents
    sizes: { name: string; sku: string }[];
    imageUrl?: string;
    tags?: string[];
  }): Promise<ExternalProduct>;

  /** Update an existing product on the external store */
  updateProduct(
    externalId: string,
    updates: {
      title?: string;
      description?: string;
      price?: number;
      imageUrl?: string;
    }
  ): Promise<ExternalProduct>;

  /** Remove a product from the external store */
  deleteProduct(externalId: string): Promise<void>;

  /** Fetch a product from the external store */
  getProduct(externalId: string): Promise<ExternalProduct | null>;

  /** Fetch recent orders from the external store */
  getOrders(options?: { since?: Date; limit?: number }): Promise<ExternalOrder[]>;
}

/** Factory function signature for creating connectors */
export type ConnectorFactory = (credentials: ConnectorCredentials) => StoreConnector;
