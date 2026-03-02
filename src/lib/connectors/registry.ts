import type { StoreConnector, ConnectorCredentials } from "./types";
import { createShopifyConnector } from "./shopify/adapter";
import { createWooCommerceConnector } from "./woocommerce/adapter";

const factories: Record<string, (creds: ConnectorCredentials) => StoreConnector> = {
  shopify: createShopifyConnector,
  woocommerce: createWooCommerceConnector,
};

/**
 * Create a connector instance from a platform name and credentials.
 */
export function createConnector(
  platform: string,
  credentials: ConnectorCredentials
): StoreConnector {
  const factory = factories[platform];
  if (!factory) {
    throw new Error(`Unknown connector platform: ${platform}`);
  }
  return factory(credentials);
}

/**
 * Get all supported connector platforms.
 */
export function getSupportedPlatforms() {
  return [
    {
      id: "shopify",
      name: "Shopify",
      description: "Sync products to your Shopify store",
      fields: [
        { key: "storeUrl", label: "Store URL", placeholder: "my-store.myshopify.com" },
        { key: "accessToken", label: "Admin API Access Token", placeholder: "shpat_...", secret: true },
      ],
    },
    {
      id: "woocommerce",
      name: "WooCommerce",
      description: "Sync products to your WordPress/WooCommerce site",
      fields: [
        { key: "siteUrl", label: "Site URL", placeholder: "https://mysite.com" },
        { key: "consumerKey", label: "Consumer Key", placeholder: "ck_...", secret: true },
        { key: "consumerSecret", label: "Consumer Secret", placeholder: "cs_...", secret: true },
      ],
    },
  ];
}
