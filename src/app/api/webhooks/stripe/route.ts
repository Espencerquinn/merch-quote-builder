import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { orders, orderItems, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { calculateQuote } from "@/lib/pricing";
import Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};
    const totalAmount = session.amount_total || 0;

    try {
      if (metadata.type === "store_purchase") {
        // Store purchase — create order under store owner
        await handleStorePurchase(session, metadata, totalAmount);
      } else {
        // Direct purchase
        await handleDirectPurchase(session, metadata, totalAmount);
      }
    } catch (error) {
      console.error("Failed to process checkout:", error);
      return NextResponse.json({ error: "Failed to process" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

async function handleDirectPurchase(
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>,
  totalAmount: number
) {
  const userId = metadata.userId;
  const decoratedProductId = metadata.decoratedProductId;
  const sizeBreakdown = metadata.sizeBreakdown || "{}";
  const totalQuantity = parseInt(metadata.totalQuantity || "0", 10);
  const unitPriceCents = parseInt(metadata.unitPriceCents || "0", 10);

  if (!userId || !decoratedProductId) {
    console.error("Missing metadata in direct checkout:", session.id);
    return;
  }

  const [order] = await db
    .insert(orders)
    .values({
      userId,
      status: "paid",
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null,
      subtotal: totalAmount,
      totalAmount,
      currency: session.currency || "usd",
    })
    .returning();

  await db.insert(orderItems).values({
    orderId: order.id,
    decoratedProductId,
    quantity: totalQuantity,
    sizeBreakdown,
    unitPrice: unitPriceCents,
    totalPrice: totalAmount,
  });

  console.log(`Direct order ${order.id} created for session ${session.id}`);
}

async function handleStorePurchase(
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>,
  totalAmount: number
) {
  const storeOwnerId = metadata.storeOwnerId;
  const storeId = metadata.storeId;
  const decoratedProductId = metadata.decoratedProductId;
  const sizeBreakdown = metadata.sizeBreakdown || "{}";
  const totalQuantity = parseInt(metadata.totalQuantity || "0", 10);
  const sellingPriceCents = parseInt(metadata.sellingPriceCents || "0", 10);

  if (!storeOwnerId || !decoratedProductId) {
    console.error("Missing metadata in store checkout:", session.id);
    return;
  }

  // Calculate platform fee vs seller payout using real pricing
  const quote = calculateQuote(totalQuantity);
  const platformRevenue = Math.round(quote.totalCost * 100);
  const sellerPayout = Math.max(0, totalAmount - platformRevenue);

  const [order] = await db
    .insert(orders)
    .values({
      userId: storeOwnerId,
      storeId,
      status: "paid",
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null,
      subtotal: totalAmount,
      platformFee: platformRevenue,
      sellerPayout,
      totalAmount,
      currency: session.currency || "usd",
    })
    .returning();

  await db.insert(orderItems).values({
    orderId: order.id,
    decoratedProductId,
    quantity: totalQuantity,
    sizeBreakdown,
    unitPrice: sellingPriceCents,
    totalPrice: totalAmount,
  });

  // If store owner has Stripe Connect, initiate transfer
  const storeOwner = await db.query.users.findFirst({
    where: eq(users.id, storeOwnerId),
  });

  if (storeOwner?.stripeConnectId && sellerPayout > 0) {
    try {
      const { createTransfer } = await import("@/lib/stripe/connect");
      await createTransfer(
        sellerPayout,
        session.currency || "usd",
        storeOwner.stripeConnectId,
        { orderId: order.id, storeId: storeId || "" }
      );
      console.log(`Transfer of ${sellerPayout} cents to ${storeOwner.stripeConnectId}`);
    } catch (err) {
      console.error("Failed to create transfer:", err);
      // Order is still created — transfer can be retried manually
    }
  }

  console.log(`Store order ${order.id} created for session ${session.id} (payout: ${sellerPayout})`);
}
