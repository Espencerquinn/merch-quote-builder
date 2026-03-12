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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Require auth
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

    // Verify user exists in users table
    const { data: dbUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!dbUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find valid, unclaimed, non-expired token
    const { data: claimToken, error: tokenError } = await supabaseAdmin
      .from("anonymous_claim_tokens")
      .select("*")
      .eq("token", token)
      .is("claimed_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (tokenError || !claimToken) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired claim token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Associate the decorated product with the user
    await supabaseAdmin
      .from("decorated_products")
      .update({ user_id: dbUser.id, updated_at: new Date().toISOString() })
      .eq("id", claimToken.decorated_product_id);

    // Mark token as claimed
    await supabaseAdmin
      .from("anonymous_claim_tokens")
      .update({ claimed_at: new Date().toISOString() })
      .eq("token", token);

    return new Response(
      JSON.stringify({
        success: true,
        decoratedProductId: claimToken.decorated_product_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("claim-design error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
