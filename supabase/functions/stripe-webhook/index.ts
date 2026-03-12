import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Platform fee: 10% of subtotal for store purchases
const PLATFORM_FEE_PERCENT = 10;

// Escape HTML to prevent injection in emails
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function sendOrderConfirmationEmail(
  email: string,
  orderId: string,
  totalAmountCents: number,
  quantity: number
) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey || !email) return;

  try {
    const safeOrderId = esc(orderId.slice(0, 8));
    const formattedTotal = `$${(totalAmountCents / 100).toFixed(2)}`;

    const emailHtml = `
      <h2>Order Confirmed</h2>
      <p>Thanks for your order!</p>
      <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Order</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">#${safeOrderId}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Quantity</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${quantity}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Total</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${formattedTotal}</td>
        </tr>
      </table>
      <p>We'll get started on your merch right away. You'll receive updates as your order progresses.</p>
      <p>— The Merch Makers Team</p>
    `;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Merch Makers <orders@merchmakers.com>",
        to: [email],
        subject: "Order Confirmed — Merch Makers",
        html: emailHtml,
      }),
    });

    if (resp.ok) {
      console.log(`[webhook] Confirmation email sent to ${email} for order ${orderId.slice(0, 8)}`);
    } else {
      console.error(`[webhook] Email send failed: ${resp.status} ${await resp.text()}`);
    }
  } catch (emailErr) {
    console.error("[webhook] Email send error:", emailErr);
  }
}

async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  const parts = sigHeader.split(",");
  const timestampPart = parts.find((p) => p.startsWith("t="));
  const sigPart = parts.find((p) => p.startsWith("v1="));

  if (!timestampPart || !sigPart) return false;

  const timestamp = timestampPart.split("=")[1];
  const signature = sigPart.split("=")[1];

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload)
  );
  const expectedSig = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expectedSig === signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
  const sigHeader = req.headers.get("stripe-signature");

  if (!sigHeader) {
    return new Response(
      JSON.stringify({ error: "Missing stripe-signature header" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const body = await req.text();

  const isValid = await verifyStripeSignature(body, sigHeader, stripeWebhookSecret);
  if (!isValid) {
    return new Response(
      JSON.stringify({ error: "Invalid signature" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const event = JSON.parse(body);

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const metadata = session.metadata || {};
      const type = metadata.type; // "direct_purchase" or "store_purchase"

      const sizeBreakdown = JSON.parse(metadata.size_breakdown || "{}");
      const totalUnits = Object.values(sizeBreakdown as Record<string, number>).reduce(
        (sum: number, qty: number) => sum + qty,
        0
      );
      const totalAmount = session.amount_total; // cents

      if (type === "direct_purchase") {
        // Direct purchase: create order + order items
        const orderId = crypto.randomUUID();

        await supabaseAdmin.from("orders").insert({
          id: orderId,
          user_id: metadata.user_id,
          status: "paid",
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent,
          subtotal: totalAmount,
          platform_fee: 0,
          seller_payout: 0,
          total_amount: totalAmount,
          currency: session.currency || "usd",
        });

        await supabaseAdmin.from("order_items").insert({
          id: crypto.randomUUID(),
          order_id: orderId,
          decorated_product_id: metadata.decorated_product_id,
          quantity: totalUnits,
          size_breakdown: JSON.stringify(sizeBreakdown),
          unit_price: Math.round(totalAmount / totalUnits),
          total_price: totalAmount,
        });

        console.log(`[webhook] Direct purchase order created: ${orderId}`);

        const buyerEmail = session.customer_details?.email || session.customer_email;
        await sendOrderConfirmationEmail(buyerEmail, orderId, totalAmount, totalUnits);
      } else if (type === "store_purchase") {
        // Store purchase: create order + calculate platform fee + seller payout
        const platformFee = Math.round(totalAmount * PLATFORM_FEE_PERCENT / 100);
        const sellerPayout = totalAmount - platformFee;
        const orderId = crypto.randomUUID();

        await supabaseAdmin.from("orders").insert({
          id: orderId,
          user_id: metadata.store_owner_id,
          store_id: metadata.store_id,
          status: "paid",
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent,
          subtotal: totalAmount,
          platform_fee: platformFee,
          seller_payout: sellerPayout,
          total_amount: totalAmount,
          currency: session.currency || "usd",
        });

        const sellingPrice = parseInt(metadata.selling_price || "0");

        await supabaseAdmin.from("order_items").insert({
          id: crypto.randomUUID(),
          order_id: orderId,
          decorated_product_id: metadata.decorated_product_id,
          quantity: totalUnits,
          size_breakdown: JSON.stringify(sizeBreakdown),
          unit_price: sellingPrice,
          total_price: totalAmount,
        });

        console.log(
          `[webhook] Store purchase order created: ${orderId}, ` +
          `platform fee: ${platformFee}, seller payout: ${sellerPayout}`
        );

        const buyerEmail = session.customer_details?.email || session.customer_email;
        await sendOrderConfirmationEmail(buyerEmail, orderId, totalAmount, totalUnits);
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("stripe-webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Webhook processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
