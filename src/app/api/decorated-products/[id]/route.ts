import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decoratedProducts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET: Fetch a single decorated product
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const product = await db.query.decoratedProducts.findFirst({
      where: eq(decoratedProducts.id, id),
    });

    if (!product) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching decorated product:", error);
    return NextResponse.json(
      { error: "Failed to fetch decorated product" },
      { status: 500 }
    );
  }
}

// PUT: Update a decorated product
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, selectedColourId, canvasStateJson, thumbnailUrl } = body;

    const [updated] = await db
      .update(decoratedProducts)
      .set({
        ...(name !== undefined && { name }),
        ...(selectedColourId !== undefined && { selectedColourId }),
        ...(canvasStateJson !== undefined && {
          canvasStateJson:
            typeof canvasStateJson === "string"
              ? canvasStateJson
              : JSON.stringify(canvasStateJson),
        }),
        ...(thumbnailUrl !== undefined && { thumbnailUrl }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(decoratedProducts.id, id),
          eq(decoratedProducts.userId, session.user.id)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating decorated product:", error);
    return NextResponse.json(
      { error: "Failed to update decorated product" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a decorated product
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [deleted] = await db
      .delete(decoratedProducts)
      .where(
        and(
          eq(decoratedProducts.id, id),
          eq(decoratedProducts.userId, session.user.id)
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting decorated product:", error);
    return NextResponse.json(
      { error: "Failed to delete decorated product" },
      { status: 500 }
    );
  }
}
