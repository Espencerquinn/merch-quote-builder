import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { storeProductId, storeId, sizeBreakdown } = await req.json();

    if (!storeProductId || !storeId || !sizeBreakdown || Object.keys(sizeBreakdown).length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing storeProductId, storeId, or sizeBreakdown" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch store product with store info
    const { data: storeProduct, error: spError } = await supabaseAdmin
      .from("store_products")
      .select("*, stores(*)")
      .eq("id", storeProductId)
      .eq("store_id", storeId)
      .single();

    if (spError || !storeProduct) {
      return new Response(
        JSON.stringify({ error: "Store product not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!storeProduct.is_visible) {
      return new Response(
        JSON.stringify({ error: "Product is not available" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch decorated product for name
    const { data: decoratedProduct } = await supabaseAdmin
      .from("decorated_products")
      .select("name, thumbnail_url")
      .eq("id", storeProduct.decorated_product_id)
      .single();

    const totalUnits = Object.values(sizeBreakdown as Record<string, number>).reduce(
      (sum: number, qty: number) => sum + qty,
      0
    );

    const sellingPriceCents = storeProduct.selling_price; // per unit in cents
    const subtotal = sellingPriceCents * totalUnits;
    const productName = storeProduct.display_name || decoratedProduct?.name || "Custom Product";
    const storeName = storeProduct.stores?.name || "Store";

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const appUrl = Deno.env.get("APP_URL") || "http://localhost:3000";
    const storeSlug = storeProduct.stores?.slug || storeId;

    const params = new URLSearchParams([
      ["mode", "payment"],
      ["success_url", `${appUrl}/store/${storeSlug}?checkout=success&session_id={CHECKOUT_SESSION_ID}`],
      ["cancel_url", `${appUrl}/store/${storeSlug}?checkout=cancelled`],
      ["line_items[0][price_data][currency]", "usd"],
      ["line_items[0][price_data][unit_amount]", String(sellingPriceCents)],
      ["line_items[0][price_data][product_data][name]", productName],
      [
        "line_items[0][price_data][product_data][description]",
        `From ${storeName} - ${Object.entries(sizeBreakdown).map(([s, q]) => `${s}: ${q}`).join(", ")}`,
      ],
      ["line_items[0][quantity]", String(totalUnits)],
      ["metadata[type]", "store_purchase"],
      ["metadata[store_id]", storeId],
      ["metadata[store_product_id]", storeProductId],
      ["metadata[decorated_product_id]", storeProduct.decorated_product_id],
      ["metadata[store_owner_id]", storeProduct.stores?.user_id || ""],
      ["metadata[size_breakdown]", JSON.stringify(sizeBreakdown)],
      ["metadata[selling_price]", String(sellingPriceCents)],
      ["metadata[subtotal]", String(subtotal)],
    ]);

    const stripeResponse = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      }
    );

    const session = await stripeResponse.json();

    if (!stripeResponse.ok) {
      console.error("Stripe error:", session);
      return new Response(
        JSON.stringify({ error: "Failed to create checkout session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("store-checkout error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
