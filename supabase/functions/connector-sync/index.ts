import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ShopifyCredentials {
  shopDomain: string;
  accessToken: string;
}

interface WooCommerceCredentials {
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

interface StoreProductRow {
  id: string;
  display_name: string | null;
  description: string | null;
  selling_price: number;
  decorated_products: {
    name: string;
    thumbnail_url: string | null;
    base_product_id: string;
  };
}

async function syncToShopify(
  credentials: ShopifyCredentials,
  products: StoreProductRow[]
): Promise<{ synced: number; errors: string[] }> {
  let synced = 0;
  const errors: string[] = [];
  const baseUrl = `https://${credentials.shopDomain}/admin/api/2024-01`;

  for (const product of products) {
    try {
      const productName =
        product.display_name || product.decorated_products?.name || "Custom Product";
      const priceDollars = (product.selling_price / 100).toFixed(2);

      const shopifyProduct = {
        product: {
          title: productName,
          body_html: product.description || "",
          vendor: "Merch Makers",
          product_type: "Custom Apparel",
          variants: [
            {
              price: priceDollars,
              inventory_management: null,
            },
          ],
          images: product.decorated_products?.thumbnail_url
            ? [{ src: product.decorated_products.thumbnail_url }]
            : [],
        },
      };

      const res = await fetch(`${baseUrl}/products.json`, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": credentials.accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(shopifyProduct),
      });

      if (!res.ok) {
        const errBody = await res.text();
        errors.push(`Shopify error for ${productName}: ${res.status} - ${errBody}`);
      } else {
        synced++;
      }
    } catch (err) {
      errors.push(
        `Failed to sync ${product.id}: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  return { synced, errors };
}

async function syncToWooCommerce(
  credentials: WooCommerceCredentials,
  products: StoreProductRow[]
): Promise<{ synced: number; errors: string[] }> {
  let synced = 0;
  const errors: string[] = [];
  const auth = btoa(`${credentials.consumerKey}:${credentials.consumerSecret}`);

  for (const product of products) {
    try {
      const productName =
        product.display_name || product.decorated_products?.name || "Custom Product";
      const priceDollars = (product.selling_price / 100).toFixed(2);

      const wooProduct = {
        name: productName,
        type: "simple",
        regular_price: priceDollars,
        description: product.description || "",
        short_description: product.description || "",
        images: product.decorated_products?.thumbnail_url
          ? [{ src: product.decorated_products.thumbnail_url }]
          : [],
      };

      const res = await fetch(`${credentials.siteUrl}/wp-json/wc/v3/products`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(wooProduct),
      });

      if (!res.ok) {
        const errBody = await res.text();
        errors.push(`WooCommerce error for ${productName}: ${res.status} - ${errBody}`);
      } else {
        synced++;
      }
    } catch (err) {
      errors.push(
        `Failed to sync ${product.id}: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  return { synced, errors };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { connectorId } = await req.json();

    if (!connectorId) {
      return new Response(
        JSON.stringify({ error: "Missing connectorId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch connector with store ownership check
    const { data: connector, error: connectorError } = await supabaseAdmin
      .from("store_connectors")
      .select("*, stores(user_id)")
      .eq("id", connectorId)
      .single();

    if (
      connectorError ||
      !connector ||
      (connector.stores as { user_id: string })?.user_id !== user.id
    ) {
      return new Response(
        JSON.stringify({ error: "Connector not found or not authorized" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (connector.status !== "connected") {
      return new Response(
        JSON.stringify({ error: "Connector is not in connected state" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all visible store products
    const { data: storeProducts, error: productsError } = await supabaseAdmin
      .from("store_products")
      .select("id, display_name, description, selling_price, decorated_products(name, thumbnail_url, base_product_id)")
      .eq("store_id", connector.store_id)
      .eq("is_visible", true);

    if (productsError) {
      console.error("Store products fetch error:", productsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch store products" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!storeProducts || storeProducts.length === 0) {
      return new Response(
        JSON.stringify({ synced: 0, errors: [], message: "No visible products to sync" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const credentials = JSON.parse(connector.credentials);
    let result: { synced: number; errors: string[] };

    if (connector.platform === "shopify") {
      result = await syncToShopify(credentials as ShopifyCredentials, storeProducts as StoreProductRow[]);
    } else if (connector.platform === "woocommerce") {
      result = await syncToWooCommerce(credentials as WooCommerceCredentials, storeProducts as StoreProductRow[]);
    } else {
      return new Response(
        JSON.stringify({ error: `Unsupported platform: ${connector.platform}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update last synced timestamp
    await supabaseAdmin
      .from("store_connectors")
      .update({
        last_synced_at: new Date().toISOString(),
        status: result.errors.length > 0 ? "error" : "connected",
      })
      .eq("id", connectorId);

    return new Response(
      JSON.stringify({
        synced: result.synced,
        total: storeProducts.length,
        errors: result.errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("connector-sync error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
