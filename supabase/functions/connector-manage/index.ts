import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function testShopifyConnection(credentials: {
  shopDomain: string;
  accessToken: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(
      `https://${credentials.shopDomain}/admin/api/2024-01/shop.json`,
      {
        headers: {
          "X-Shopify-Access-Token": credentials.accessToken,
          "Content-Type": "application/json",
        },
      }
    );
    if (!res.ok) {
      return { ok: false, error: `Shopify API returned ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}

async function testWooCommerceConnection(credentials: {
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = btoa(`${credentials.consumerKey}:${credentials.consumerSecret}`);
    const res = await fetch(
      `${credentials.siteUrl}/wp-json/wc/v3/system_status`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!res.ok) {
      return { ok: false, error: `WooCommerce API returned ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
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

    if (req.method === "POST") {
      const { storeId, platform, credentials, externalStoreUrl } = await req.json();

      if (!storeId || !platform || !credentials) {
        return new Response(
          JSON.stringify({ error: "Missing storeId, platform, or credentials" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!["shopify", "woocommerce"].includes(platform)) {
        return new Response(
          JSON.stringify({ error: "Invalid platform. Must be 'shopify' or 'woocommerce'" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify store ownership
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id, user_id")
        .eq("id", storeId)
        .eq("user_id", user.id)
        .single();

      if (!store) {
        return new Response(
          JSON.stringify({ error: "Store not found or not owned by user" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Test connection before saving
      let testResult: { ok: boolean; error?: string };

      if (platform === "shopify") {
        testResult = await testShopifyConnection(credentials);
      } else {
        testResult = await testWooCommerceConnection(credentials);
      }

      if (!testResult.ok) {
        return new Response(
          JSON.stringify({ error: `Connection test failed: ${testResult.error}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Save connector
      const connectorId = crypto.randomUUID();
      const { error: insertError } = await supabaseAdmin
        .from("store_connectors")
        .insert({
          id: connectorId,
          store_id: storeId,
          platform,
          credentials: JSON.stringify(credentials),
          external_store_url: externalStoreUrl || null,
          status: "connected",
        });

      if (insertError) {
        console.error("Connector insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to save connector" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ id: connectorId, status: "connected" }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "DELETE") {
      const { connectorId } = await req.json();

      if (!connectorId) {
        return new Response(
          JSON.stringify({ error: "Missing connectorId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify ownership through store
      const { data: connector } = await supabaseAdmin
        .from("store_connectors")
        .select("id, store_id, stores(user_id)")
        .eq("id", connectorId)
        .single();

      if (
        !connector ||
        !(connector.stores as { user_id: string })?.user_id ||
        (connector.stores as { user_id: string }).user_id !== user.id
      ) {
        return new Response(
          JSON.stringify({ error: "Connector not found or not authorized" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabaseAdmin
        .from("store_connectors")
        .delete()
        .eq("id", connectorId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("connector-manage error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
