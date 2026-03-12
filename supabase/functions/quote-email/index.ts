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

    const { designState, quote, lead } = await req.json();

    if (!designState || !quote) {
      return new Response(
        JSON.stringify({ error: "Missing designState or quote" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const quoteId = crypto.randomUUID();
    const status = lead ? "contact-requested" : "saved";

    const { error: insertError } = await supabaseAdmin.from("quotes").insert({
      id: quoteId,
      design_state_json: typeof designState === "string" ? designState : JSON.stringify(designState),
      quote_json: typeof quote === "string" ? quote : JSON.stringify(quote),
      lead_json: lead ? (typeof lead === "string" ? lead : JSON.stringify(lead)) : null,
      status,
    });

    if (insertError) {
      console.error("Quote insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save quote" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email via Resend if API key is configured and lead has email
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey && lead?.email) {
      try {
        const quoteData = typeof quote === "string" ? JSON.parse(quote) : quote;

        // Escape HTML to prevent injection
        const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        const safeName = esc(String(lead.name || "there"));
        const safeProduct = esc(String(quoteData.productName || "Custom Product"));
        const safeQuantity = esc(String(quoteData.totalUnits || "N/A"));
        const safeTotal = `$${((quoteData.totalCents || 0) / 100).toFixed(2)}`;

        const emailHtml = `
          <h2>Your Merch Makers Quote</h2>
          <p>Hi ${safeName},</p>
          <p>Thanks for your interest! Here's a summary of your quote:</p>
          <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Product</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${safeProduct}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Quantity</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${safeQuantity}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Estimated Total</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${safeTotal}</td>
            </tr>
          </table>
          <p>We'll be in touch shortly to finalize your order.</p>
          <p>— The Merch Makers Team</p>
        `;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Merch Makers <quotes@merchmakers.com>",
            to: [lead.email],
            subject: "Your Merch Makers Quote",
            html: emailHtml,
          }),
        });

        console.log(`[quote-email] Email sent to ${lead.email}`);
      } catch (emailErr) {
        // Don't fail the request if email fails
        console.error("[quote-email] Email send failed:", emailErr);
      }
    }

    return new Response(
      JSON.stringify({ id: quoteId }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("quote-email error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
