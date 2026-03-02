import {
  StoreConnector,
  ConnectorCredentials,
  ExternalProduct,
  ExternalOrder,
} from "../types";

/**
 * Shopify Admin REST API connector.
 * Uses the 2024-01 API version.
 * Requires an Admin API access token with products and orders scopes.
 */
export function createShopifyConnector(
  credentials: ConnectorCredentials
): StoreConnector {
  const { storeUrl, accessToken } = credentials;

  if (!storeUrl || !accessToken) {
    throw new Error("Shopify connector requires storeUrl and accessToken");
  }

  // Normalize store URL
  const baseUrl = storeUrl.replace(/\/$/, "");
  const apiBase = `https://${baseUrl.replace(/^https?:\/\//, "")}/admin/api/2024-01`;

  async function shopifyFetch<T>(
    path: string,
    options?: RequestInit
  ): Promise<T> {
    const res = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken!,
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Shopify API error ${res.status}: ${text}`);
    }

    return res.json();
  }

  return {
    platform: "shopify",

    async testConnection() {
      try {
        await shopifyFetch("/shop.json");
        return { success: true, message: "Connected to Shopify successfully" };
      } catch (err) {
        return {
          success: false,
          message: err instanceof Error ? err.message : "Connection failed",
        };
      }
    },

    async createProduct(product) {
      const variants = product.sizes.map((size) => ({
        title: size.name,
        sku: size.sku,
        price: (product.price / 100).toFixed(2),
        option1: size.name,
        inventory_management: null,
      }));

      const body: Record<string, unknown> = {
        product: {
          title: product.title,
          body_html: product.description,
          vendor: "Merch Makers",
          product_type: "Custom Merch",
          tags: product.tags?.join(", ") || "",
          options: [{ name: "Size", values: product.sizes.map((s) => s.name) }],
          variants,
          ...(product.imageUrl
            ? { images: [{ src: product.imageUrl }] }
            : {}),
        },
      };

      const data = await shopifyFetch<{ product: { id: number; title: string; handle: string; status: string } }>(
        "/products.json",
        { method: "POST", body: JSON.stringify(body) }
      );

      return {
        externalId: String(data.product.id),
        title: data.product.title,
        url: `https://${baseUrl.replace(/^https?:\/\//, "")}/products/${data.product.handle}`,
        status: data.product.status === "active" ? "active" as const : "draft" as const,
      };
    },

    async updateProduct(externalId, updates) {
      const body: Record<string, unknown> = {
        product: {
          id: parseInt(externalId, 10),
          ...(updates.title && { title: updates.title }),
          ...(updates.description && { body_html: updates.description }),
          ...(updates.imageUrl && { images: [{ src: updates.imageUrl }] }),
        },
      };

      // If price is updated, update all variants
      if (updates.price !== undefined) {
        const existing = await shopifyFetch<{ product: { variants: { id: number }[] } }>(
          `/products/${externalId}.json`
        );
        (body.product as Record<string, unknown>).variants = existing.product.variants.map((v) => ({
          id: v.id,
          price: (updates.price! / 100).toFixed(2),
        }));
      }

      const data = await shopifyFetch<{ product: { id: number; title: string; handle: string; status: string } }>(
        `/products/${externalId}.json`,
        { method: "PUT", body: JSON.stringify(body) }
      );

      return {
        externalId: String(data.product.id),
        title: data.product.title,
        url: `https://${baseUrl.replace(/^https?:\/\//, "")}/products/${data.product.handle}`,
        status: data.product.status === "active" ? "active" as const : "draft" as const,
      };
    },

    async deleteProduct(externalId) {
      await shopifyFetch(`/products/${externalId}.json`, { method: "DELETE" });
    },

    async getProduct(externalId) {
      try {
        const data = await shopifyFetch<{ product: { id: number; title: string; handle: string; status: string } }>(
          `/products/${externalId}.json`
        );
        return {
          externalId: String(data.product.id),
          title: data.product.title,
          url: `https://${baseUrl.replace(/^https?:\/\//, "")}/products/${data.product.handle}`,
          status: data.product.status === "active" ? "active" as const : "draft" as const,
        };
      } catch {
        return null;
      }
    },

    async getOrders(options) {
      const params = new URLSearchParams({
        status: "any",
        limit: String(options?.limit || 50),
      });
      if (options?.since) {
        params.set("created_at_min", options.since.toISOString());
      }

      const data = await shopifyFetch<{
        orders: {
          id: number;
          name: string;
          financial_status: string;
          total_price: string;
          currency: string;
          line_items: {
            product_id: number;
            quantity: number;
            price: string;
            variant_title: string;
          }[];
          customer: { first_name: string; last_name: string; email: string };
          created_at: string;
        }[];
      }>(`/orders.json?${params.toString()}`);

      return data.orders.map((order) => ({
        externalId: String(order.id),
        orderNumber: order.name,
        status: order.financial_status,
        totalAmount: Math.round(parseFloat(order.total_price) * 100),
        currency: order.currency.toLowerCase(),
        items: order.line_items.map((item) => ({
          externalProductId: String(item.product_id),
          quantity: item.quantity,
          unitPrice: Math.round(parseFloat(item.price) * 100),
          size: item.variant_title || undefined,
        })),
        customer: {
          name: `${order.customer?.first_name || ""} ${order.customer?.last_name || ""}`.trim(),
          email: order.customer?.email || "",
        },
        createdAt: order.created_at,
      }));
    },
  };
}
