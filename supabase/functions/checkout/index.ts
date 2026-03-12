import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SizeBreakdown {
  [size: string]: number;
}

function calculatePricing(sizeBreakdown: SizeBreakdown) {
  const totalUnits = Object.values(sizeBreakdown).reduce((sum, qty) => sum + qty, 0);

  let blankPerUnit: number;
  let setupFee = 0;

  if (totalUnits >= 100) {
    blankPerUnit = 600; // $6.00
  } else if (totalUnits >= 25) {
    blankPerUnit = 750; // $7.50
  } else {
    blankPerUnit = 900; // $9.00
    setupFee = 3500; // $35.00
  }

  const printPerUnit = 400; // $4.00
  const unitPrice = blankPerUnit + printPerUnit;
  const subtotal = unitPrice * totalUnits + setupFee;

  return { totalUnits, blankPerUnit, printPerUnit, unitPrice, setupFee, subtotal };
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

    // Verify auth
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { decoratedProductId, sizeBreakdown } = await req.json();

    if (!decoratedProductId || !sizeBreakdown || Object.keys(sizeBreakdown).length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing decoratedProductId or sizeBreakdown" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify product ownership
    const { data: product, error: productError } = await supabaseClient
      .from("decorated_products")
      .select("*")
      .eq("id", decoratedProductId)
      .eq("user_id", user.id)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: "Product not found or not owned by user" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pricing = calculatePricing(sizeBreakdown);

    // Create Stripe checkout session
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const appUrl = Deno.env.get("APP_URL") || "http://localhost:3000";

    const lineItems: string[][] = [];

    // Main product line item
    lineItems.push(
      ["line_items[0][price_data][currency]", "usd"],
      ["line_items[0][price_data][unit_amount]", String(pricing.unitPrice)],
      ["line_items[0][price_data][product_data][name]", product.name],
      [
        "line_items[0][price_data][product_data][description]",
        `${pricing.totalUnits} units - ${Object.entries(sizeBreakdown).map(([s, q]) => `${s}: ${q}`).join(", ")}`,
      ],
      ["line_items[0][quantity]", String(pricing.totalUnits)],
    );

    // Setup fee line item (if applicable)
    if (pricing.setupFee > 0) {
      lineItems.push(
        ["line_items[1][price_data][currency]", "usd"],
        ["line_items[1][price_data][unit_amount]", String(pricing.setupFee)],
        ["line_items[1][price_data][product_data][name]", "Setup Fee"],
        ["line_items[1][quantity]", "1"],
      );
    }

    const params = new URLSearchParams([
      ["mode", "payment"],
      ["success_url", `${appUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`],
      ["cancel_url", `${appUrl}/dashboard?checkout=cancelled`],
      ["metadata[decorated_product_id]", decoratedProductId],
      ["metadata[user_id]", user.id],
      ["metadata[size_breakdown]", JSON.stringify(sizeBreakdown)],
      ["metadata[type]", "direct_purchase"],
      ...lineItems,
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
    console.error("checkout error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
