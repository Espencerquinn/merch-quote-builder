import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stores, storeProducts, decoratedProducts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { calculateQuote } from "@/lib/pricing";

// POST: Add a decorated product to a store
export async function POST(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify store ownership
    const store = await db.query.stores.findFirst({
      where: and(eq(stores.id, storeId), eq(stores.userId, session.user.id)),
    });
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const { decoratedProductId, displayName, markupType, markupValue } = await request.json();

    if (!decoratedProductId) {
      return NextResponse.json({ error: "decoratedProductId is required" }, { status: 400 });
    }

    // Verify product ownership
    const product = await db.query.decoratedProducts.findFirst({
      where: and(
        eq(decoratedProducts.id, decoratedProductId),
        eq(decoratedProducts.userId, session.user.id)
      ),
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Calculate base cost (single unit price) and selling price
    const baseCost = calculateQuote(1);
    const baseUnitCents = Math.round(baseCost.costPerUnit * 100);
    const type = markupType || "percentage";
    const value = markupValue ?? 50; // default 50% markup

    let sellingPrice: number;
    if (type === "percentage") {
      sellingPrice = Math.round(baseUnitCents * (1 + value / 100));
    } else {
      sellingPrice = baseUnitCents + value;
    }

    const [storeProduct] = await db
      .insert(storeProducts)
      .values({
        storeId,
        decoratedProductId,
        displayName: displayName || product.name,
        markupType: type,
        markupValue: value,
        sellingPrice,
      })
      .returning();

    return NextResponse.json(storeProduct, { status: 201 });
  } catch (error) {
    console.error("Error adding store product:", error);
    return NextResponse.json({ error: "Failed to add product" }, { status: 500 });
  }
}

// GET: List products in a store
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify store ownership
    const store = await db.query.stores.findFirst({
      where: and(eq(stores.id, storeId), eq(stores.userId, session.user.id)),
    });
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const products = await db
      .select({
        storeProduct: storeProducts,
        decoratedProduct: decoratedProducts,
      })
      .from(storeProducts)
      .leftJoin(decoratedProducts, eq(storeProducts.decoratedProductId, decoratedProducts.id))
      .where(eq(storeProducts.storeId, storeId));

    return NextResponse.json({ data: products });
  } catch (error) {
    console.error("Error fetching store products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
