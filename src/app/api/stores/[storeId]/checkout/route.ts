import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stores, storeProducts, decoratedProducts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { stripe } from "@/lib/stripe";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;

  try {
    const { storeProductId, sizeBreakdown } = await request.json();

    if (!storeProductId || !sizeBreakdown) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify store exists and is published
    const store = await db.query.stores.findFirst({
      where: and(eq(stores.id, storeId), eq(stores.isPublished, true)),
    });
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Get store product with decorated product
    const result = await db
      .select({
        storeProduct: storeProducts,
        decoratedProduct: decoratedProducts,
      })
      .from(storeProducts)
      .leftJoin(decoratedProducts, eq(storeProducts.decoratedProductId, decoratedProducts.id))
      .where(
        and(
          eq(storeProducts.id, storeProductId),
          eq(storeProducts.storeId, storeId)
        )
      );

    if (result.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const { storeProduct, decoratedProduct } = result[0];

    const totalQuantity = Object.values(sizeBreakdown as Record<string, number>).reduce(
      (sum: number, qty: number) => sum + qty,
      0
    );

    if (totalQuantity === 0) {
      return NextResponse.json({ error: "Must order at least 1 unit" }, { status: 400 });
    }

    const sizeDescription = Object.entries(sizeBreakdown as Record<string, number>)
      .filter(([, qty]) => qty > 0)
      .map(([size, qty]) => `${size}: ${qty}`)
      .join(", ");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: storeProduct.displayName || decoratedProduct?.name || "Custom Product",
              description: `From ${store.name} (${sizeDescription})`,
            },
            unit_amount: storeProduct.sellingPrice,
          },
          quantity: totalQuantity,
        },
      ],
      metadata: {
        type: "store_purchase",
        storeId: store.id,
        storeOwnerId: store.userId,
        storeProductId: storeProduct.id,
        decoratedProductId: storeProduct.decoratedProductId,
        sizeBreakdown: JSON.stringify(sizeBreakdown),
        totalQuantity: String(totalQuantity),
        sellingPriceCents: String(storeProduct.sellingPrice),
      },
      success_url: `${appUrl}/store/${store.slug}?purchased=true`,
      cancel_url: `${appUrl}/store/${store.slug}/products/${storeProductId}`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Store checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
