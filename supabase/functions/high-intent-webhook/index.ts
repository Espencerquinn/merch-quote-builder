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
    const { lead, highIntent, designState, quote } = await req.json();

    console.log("[high-intent-webhook] Received high-intent lead:", {
      email: lead?.email,
      name: lead?.name,
      highIntent,
    });

    // Save to quotes table with high-intent status
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const quoteId = crypto.randomUUID();

    await supabaseAdmin.from("quotes").insert({
      id: quoteId,
      design_state_json:
        typeof designState === "string"
          ? designState
          : JSON.stringify(designState || {}),
      quote_json:
        typeof quote === "string" ? quote : JSON.stringify(quote || {}),
      lead_json:
        typeof lead === "string" ? lead : JSON.stringify(lead || {}),
      status: "high-intent",
    });

    // Forward to CRM webhook if configured
    const crmWebhookUrl = Deno.env.get("CRM_WEBHOOK_URL");
    if (crmWebhookUrl) {
      try {
        await fetch(crmWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "merch-makers",
            type: "high-intent-lead",
            lead,
            highIntent,
            designState,
            quote,
            timestamp: new Date().toISOString(),
          }),
        });
        console.log("[high-intent-webhook] Forwarded to CRM");
      } catch (crmErr) {
        console.error("[high-intent-webhook] CRM forward failed:", crmErr);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, id: quoteId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("high-intent-webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
