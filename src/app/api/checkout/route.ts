import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decoratedProducts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { stripe } from "@/lib/stripe";
import { calculateQuote } from "@/lib/pricing";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { decoratedProductId, sizeBreakdown } = await request.json();

    if (!decoratedProductId || !sizeBreakdown) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify product belongs to user
    const product = await db.query.decoratedProducts.findFirst({
      where: and(
        eq(decoratedProducts.id, decoratedProductId),
        eq(decoratedProducts.userId, session.user.id)
      ),
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Calculate total quantity and pricing
    const totalQuantity = Object.values(sizeBreakdown as Record<string, number>).reduce(
      (sum: number, qty: number) => sum + qty,
      0
    );

    if (totalQuantity === 0) {
      return NextResponse.json({ error: "Must order at least 1 unit" }, { status: 400 });
    }

    const quote = calculateQuote(totalQuantity);
    const unitPriceCents = Math.round(quote.costPerUnit * 100);
    const totalCents = Math.round(quote.totalCost * 100);

    // Build line items for Stripe
    const lineItems: { price_data: { currency: string; product_data: { name: string; description?: string }; unit_amount: number }; quantity: number }[] = [];

    // Main product line item
    const sizeDescription = Object.entries(sizeBreakdown as Record<string, number>)
      .filter(([, qty]) => qty > 0)
      .map(([size, qty]) => `${size}: ${qty}`)
      .join(", ");

    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: product.name,
          description: `Custom decorated product (${sizeDescription})`,
        },
        unit_amount: unitPriceCents,
      },
      quantity: totalQuantity,
    });

    // Setup fee as separate line item if applicable
    if (quote.setupFee > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Small Order Setup Fee",
            description: "One-time fee for orders under 24 units",
          },
          unit_amount: Math.round(quote.setupFee * 100),
        },
        quantity: 1,
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: session.user.email || undefined,
      line_items: lineItems,
      metadata: {
        userId: session.user.id,
        decoratedProductId: product.id,
        sizeBreakdown: JSON.stringify(sizeBreakdown),
        totalQuantity: String(totalQuantity),
        unitPriceCents: String(unitPriceCents),
      },
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/products/${product.id}/checkout`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
