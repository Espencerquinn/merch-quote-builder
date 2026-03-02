import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decoratedProducts, anonymousClaimTokens } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// POST: Save a new decorated product
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();
    const { baseProductId, name, selectedColourId, canvasStateJson, thumbnailUrl } = body;

    if (!baseProductId || !selectedColourId || !canvasStateJson) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const [product] = await db
      .insert(decoratedProducts)
      .values({
        userId: session?.user?.id || null,
        baseProductId,
        name: name || "Untitled Design",
        selectedColourId,
        canvasStateJson:
          typeof canvasStateJson === "string"
            ? canvasStateJson
            : JSON.stringify(canvasStateJson),
        thumbnailUrl: thumbnailUrl || null,
      })
      .returning();

    // If anonymous, create a claim token
    let claimToken: string | null = null;
    if (!session?.user?.id) {
      const [token] = await db
        .insert(anonymousClaimTokens)
        .values({
          decoratedProductId: product.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        })
        .returning();
      claimToken = token.token;
    }

    return NextResponse.json({
      id: product.id,
      claimToken,
    }, { status: 201 });
  } catch (error) {
    console.error("Error saving decorated product:", error);
    return NextResponse.json(
      { error: "Failed to save decorated product" },
      { status: 500 }
    );
  }
}

// GET: List current user's decorated products
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const products = await db
      .select()
      .from(decoratedProducts)
      .where(eq(decoratedProducts.userId, session.user.id))
      .orderBy(desc(decoratedProducts.updatedAt));

    return NextResponse.json({ data: products });
  } catch (error) {
    console.error("Error fetching decorated products:", error);
    return NextResponse.json(
      { error: "Failed to fetch decorated products" },
      { status: 500 }
    );
  }
}
