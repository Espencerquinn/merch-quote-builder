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

    // Try to get authenticated user (optional)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        // Verify user exists in users table
        const { data: dbUser } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("id", user.id)
          .single();
        userId = dbUser?.id || null;
      }
    }

    const { baseProductId, name, selectedColourId, canvasStateJson, thumbnailUrl } =
      await req.json();

    if (!baseProductId || !selectedColourId || !canvasStateJson) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: baseProductId, selectedColourId, canvasStateJson" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const productId = crypto.randomUUID();

    const { error: insertError } = await supabaseAdmin
      .from("decorated_products")
      .insert({
        id: productId,
        user_id: userId,
        base_product_id: baseProductId,
        name: name || "Untitled Design",
        selected_colour_id: selectedColourId,
        canvas_state_json:
          typeof canvasStateJson === "string"
            ? canvasStateJson
            : JSON.stringify(canvasStateJson),
        thumbnail_url: thumbnailUrl || null,
        status: "draft",
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save design" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If anonymous, create a claim token (24 hour expiry)
    let claimToken: string | null = null;
    if (!userId) {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error: tokenError } = await supabaseAdmin
        .from("anonymous_claim_tokens")
        .insert({
          token,
          decorated_product_id: productId,
          expires_at: expiresAt,
        });

      if (!tokenError) {
        claimToken = token;
      }
    }

    return new Response(
      JSON.stringify({ id: productId, claimToken }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("save-design error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
