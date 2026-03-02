import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stores, storeProducts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// DELETE: Remove a product from a store
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ storeId: string; productId: string }> }
) {
  const { storeId, productId } = await params;
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

    const [deleted] = await db
      .delete(storeProducts)
      .where(
        and(
          eq(storeProducts.id, productId),
          eq(storeProducts.storeId, storeId)
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing store product:", error);
    return NextResponse.json({ error: "Failed to remove product" }, { status: 500 });
  }
}
