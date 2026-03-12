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
    const { compoundId } = await req.json();
    if (!compoundId || typeof compoundId !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing compoundId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [providerId, rawProductId] = compoundId.split(":");
    if (!providerId || !rawProductId) {
      return new Response(
        JSON.stringify({ error: "Invalid compoundId format. Expected 'provider:id'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check products table first
    const { data: cached } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("compound_id", compoundId)
      .single();

    const ONE_HOUR = 60 * 60 * 1000;
    const isRecent =
      cached?.enriched_at &&
      Date.now() - new Date(cached.enriched_at).getTime() < ONE_HOUR;

    if (cached && cached.detail_json && cached.detail_json !== "{}" && isRecent) {
      const detail = JSON.parse(cached.detail_json);
      return new Response(
        JSON.stringify({
          ...detail,
          compoundId,
          name: cached.name,
          description: cached.description,
          productType: cached.product_type,
          thumbnailUrl: cached.thumbnail_url,
          colorsJson: cached.colors_json,
          sizesJson: cached.sizes_json,
          basePriceCents: cached.base_price_cents,
          currency: cached.currency,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only AS Colour products can be fetched from API
    if (providerId !== "ascolour") {
      if (cached) {
        return new Response(
          JSON.stringify({ compoundId, name: cached.name, description: cached.description }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Product not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch fresh data from AS Colour API
    const apiUrl = Deno.env.get("ASCOLOUR_API_URL") || "https://api.ascolour.co.nz/v1";
    const subscriptionKey = Deno.env.get("ASCOLOUR_SUBSCRIPTION_KEY")!;
    const apiHeaders = {
      "Subscription-Key": subscriptionKey,
      "Content-Type": "application/json",
    };

    const [productRes, imagesRes, variantsRes] = await Promise.all([
      fetch(`${apiUrl}/catalog/products/${rawProductId}`, { headers: apiHeaders }),
      fetch(`${apiUrl}/catalog/products/${rawProductId}/images`, { headers: apiHeaders }),
      fetch(`${apiUrl}/catalog/products/${rawProductId}/variants`, { headers: apiHeaders }),
    ]);

    if (!productRes.ok) {
      return new Response(
        JSON.stringify({ error: `AS Colour API error: ${productRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const product = await productRes.json();
    const imagesBody = imagesRes.ok ? await imagesRes.json() : { data: [] };
    const variantsBody = variantsRes.ok ? await variantsRes.json() : { data: [] };

    const images = imagesBody.data || [];
    const variants = variantsBody.data || [];

    // Build detail JSON
    const detail = {
      product,
      images,
      variants,
    };

    // Update cache if the product exists in products
    if (cached) {
      await supabaseAdmin
        .from("products")
        .update({
          detail_json: JSON.stringify(detail),
          enriched_at: new Date().toISOString(),
        })
        .eq("compound_id", compoundId);
    }

    return new Response(
      JSON.stringify({
        compoundId,
        name: product.name || cached?.name,
        description: product.description || cached?.description,
        ...detail,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("product-detail error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
