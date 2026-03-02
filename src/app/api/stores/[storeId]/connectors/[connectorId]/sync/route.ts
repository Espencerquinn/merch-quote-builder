import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stores, storeConnectors, storeProducts, decoratedProducts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createConnector } from "@/lib/connectors/registry";

// POST: Sync products to external store
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ storeId: string; connectorId: string }> }
) {
  const { storeId, connectorId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const store = await db.query.stores.findFirst({
      where: and(eq(stores.id, storeId), eq(stores.userId, session.user.id)),
    });
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const connectorRecord = await db.query.storeConnectors.findFirst({
      where: and(
        eq(storeConnectors.id, connectorId),
        eq(storeConnectors.storeId, storeId)
      ),
    });
    if (!connectorRecord) {
      return NextResponse.json({ error: "Connector not found" }, { status: 404 });
    }

    const credentials = JSON.parse(connectorRecord.credentials);
    const connector = createConnector(connectorRecord.platform, credentials);

    // Get store products
    const products = await db
      .select({
        storeProduct: storeProducts,
        decoratedProduct: decoratedProducts,
      })
      .from(storeProducts)
      .leftJoin(decoratedProducts, eq(storeProducts.decoratedProductId, decoratedProducts.id))
      .where(
        and(
          eq(storeProducts.storeId, storeId),
          eq(storeProducts.isVisible, true)
        )
      );

    let created = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const { storeProduct, decoratedProduct } of products) {
      try {
        await connector.createProduct({
          title: storeProduct.displayName || decoratedProduct?.name || "Custom Product",
          description: storeProduct.description || "",
          price: storeProduct.sellingPrice,
          sizes: [
            { name: "S", sku: `${storeProduct.id}-S` },
            { name: "M", sku: `${storeProduct.id}-M` },
            { name: "L", sku: `${storeProduct.id}-L` },
            { name: "XL", sku: `${storeProduct.id}-XL` },
          ],
          imageUrl: decoratedProduct?.thumbnailUrl || undefined,
        });
        created++;
      } catch (err) {
        failed++;
        errors.push(
          `${storeProduct.displayName || "Unknown"}: ${err instanceof Error ? err.message : "Failed"}`
        );
      }
    }

    // Update last synced timestamp
    await db
      .update(storeConnectors)
      .set({ lastSyncedAt: new Date() })
      .where(eq(storeConnectors.id, connectorId));

    return NextResponse.json({
      created,
      updated: 0,
      failed,
      errors,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
