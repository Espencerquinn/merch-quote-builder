import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stores, storeConnectors } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// DELETE: Remove a connector
export async function DELETE(
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

    const [deleted] = await db
      .delete(storeConnectors)
      .where(
        and(
          eq(storeConnectors.id, connectorId),
          eq(storeConnectors.storeId, storeId)
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Connector not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting connector:", error);
    return NextResponse.json({ error: "Failed to delete connector" }, { status: 500 });
  }
}
