import {
  StoreConnector,
  ConnectorCredentials,
  ExternalProduct,
  ExternalOrder,
} from "../types";

/**
 * WooCommerce REST API connector (v3).
 * Requires consumer key and consumer secret from WooCommerce > Settings > REST API.
 */
export function createWooCommerceConnector(
  credentials: ConnectorCredentials
): StoreConnector {
  const { siteUrl, consumerKey, consumerSecret } = credentials;

  if (!siteUrl || !consumerKey || !consumerSecret) {
    throw new Error(
      "WooCommerce connector requires siteUrl, consumerKey, and consumerSecret"
    );
  }

  const baseUrl = siteUrl.replace(/\/$/, "");
  const apiBase = `${baseUrl}/wp-json/wc/v3`;

  async function wooFetch<T>(
    path: string,
    options?: RequestInit
  ): Promise<T> {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
      "base64"
    );

    const res = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`WooCommerce API error ${res.status}: ${text}`);
    }

    return res.json();
  }

  return {
    platform: "woocommerce",

    async testConnection() {
      try {
        await wooFetch("/system_status");
        return {
          success: true,
          message: "Connected to WooCommerce successfully",
        };
      } catch (err) {
        return {
          success: false,
          message: err instanceof Error ? err.message : "Connection failed",
        };
      }
    },

    async createProduct(product) {
      const attributes = [
        {
          name: "Size",
          position: 0,
          visible: true,
          variation: true,
          options: product.sizes.map((s) => s.name),
        },
      ];

      // Create the parent product
      const parent = await wooFetch<{
        id: number;
        name: string;
        permalink: string;
        status: string;
      }>("/products", {
        method: "POST",
        body: JSON.stringify({
          name: product.title,
          type: "variable",
          description: product.description,
          regular_price: "",
          categories: [],
          tags: product.tags?.map((t) => ({ name: t })) || [],
          attributes,
          ...(product.imageUrl
            ? { images: [{ src: product.imageUrl }] }
            : {}),
        }),
      });

      // Create variations for each size
      for (const size of product.sizes) {
        await wooFetch(`/products/${parent.id}/variations`, {
          method: "POST",
          body: JSON.stringify({
            regular_price: (product.price / 100).toFixed(2),
            sku: size.sku,
            attributes: [{ name: "Size", option: size.name }],
            manage_stock: false,
          }),
        });
      }

      return {
        externalId: String(parent.id),
        title: parent.name,
        url: parent.permalink,
        status: parent.status === "publish" ? ("active" as const) : ("draft" as const),
      };
    },

    async updateProduct(externalId, updates) {
      const body: Record<string, unknown> = {};
      if (updates.title) body.name = updates.title;
      if (updates.description) body.description = updates.description;
      if (updates.imageUrl) body.images = [{ src: updates.imageUrl }];

      const data = await wooFetch<{
        id: number;
        name: string;
        permalink: string;
        status: string;
      }>(`/products/${externalId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });

      // Update variant prices if needed
      if (updates.price !== undefined) {
        const variations = await wooFetch<{ id: number }[]>(
          `/products/${externalId}/variations`
        );
        for (const v of variations) {
          await wooFetch(`/products/${externalId}/variations/${v.id}`, {
            method: "PUT",
            body: JSON.stringify({
              regular_price: (updates.price / 100).toFixed(2),
            }),
          });
        }
      }

      return {
        externalId: String(data.id),
        title: data.name,
        url: data.permalink,
        status: data.status === "publish" ? ("active" as const) : ("draft" as const),
      };
    },

    async deleteProduct(externalId) {
      await wooFetch(`/products/${externalId}?force=true`, {
        method: "DELETE",
      });
    },

    async getProduct(externalId) {
      try {
        const data = await wooFetch<{
          id: number;
          name: string;
          permalink: string;
          status: string;
        }>(`/products/${externalId}`);
        return {
          externalId: String(data.id),
          title: data.name,
          url: data.permalink,
          status: data.status === "publish" ? ("active" as const) : ("draft" as const),
        };
      } catch {
        return null;
      }
    },

    async getOrders(options) {
      const params = new URLSearchParams({
        per_page: String(options?.limit || 50),
        orderby: "date",
        order: "desc",
      });
      if (options?.since) {
        params.set("after", options.since.toISOString());
      }

      const data = await wooFetch<
        {
          id: number;
          number: string;
          status: string;
          total: string;
          currency: string;
          line_items: {
            product_id: number;
            quantity: number;
            price: number;
            meta_data: { key: string; value: string }[];
          }[];
          billing: { first_name: string; last_name: string; email: string };
          date_created: string;
        }[]
      >(`/orders?${params.toString()}`);

      return data.map((order) => ({
        externalId: String(order.id),
        orderNumber: `#${order.number}`,
        status: order.status,
        totalAmount: Math.round(parseFloat(order.total) * 100),
        currency: order.currency.toLowerCase(),
        items: order.line_items.map((item) => {
          const sizeMeta = item.meta_data.find((m) => m.key === "pa_size" || m.key === "Size");
          return {
            externalProductId: String(item.product_id),
            quantity: item.quantity,
            unitPrice: Math.round(item.price * 100),
            size: sizeMeta?.value,
          };
        }),
        customer: {
          name: `${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim(),
          email: order.billing?.email || "",
        },
        createdAt: order.date_created,
      }));
    },
  };
}
