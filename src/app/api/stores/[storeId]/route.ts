import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET: Fetch a single store
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
    const store = await db.query.stores.findFirst({
      where: and(
        eq(stores.id, storeId),
        eq(stores.userId, session.user.id)
      ),
    });

    if (!store) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(store);
  } catch (error) {
    console.error("Error fetching store:", error);
    return NextResponse.json({ error: "Failed to fetch store" }, { status: 500 });
  }
}

// PUT: Update store
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, logoUrl, headerImageUrl, themeConfig, isPublished } = body;

    const [updated] = await db
      .update(stores)
      .set({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(headerImageUrl !== undefined && { headerImageUrl }),
        ...(themeConfig !== undefined && { themeConfig: typeof themeConfig === "string" ? themeConfig : JSON.stringify(themeConfig) }),
        ...(isPublished !== undefined && { isPublished }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(stores.id, storeId),
          eq(stores.userId, session.user.id)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating store:", error);
    return NextResponse.json({ error: "Failed to update store" }, { status: 500 });
  }
}

// DELETE: Remove store
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [deleted] = await db
      .delete(stores)
      .where(
        and(
          eq(stores.id, storeId),
          eq(stores.userId, session.user.id)
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting store:", error);
    return NextResponse.json({ error: "Failed to delete store" }, { status: 500 });
  }
}
