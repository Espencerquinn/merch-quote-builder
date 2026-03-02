import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decoratedProducts, anonymousClaimTokens } from "@/lib/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";

// POST: Claim an anonymous decorated product after login
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { claimToken } = await request.json();
    if (!claimToken) {
      return NextResponse.json({ error: "Missing claim token" }, { status: 400 });
    }

    // Find valid, unclaimed token
    const token = await db.query.anonymousClaimTokens.findFirst({
      where: and(
        eq(anonymousClaimTokens.token, claimToken),
        isNull(anonymousClaimTokens.claimedAt),
        gt(anonymousClaimTokens.expiresAt, new Date())
      ),
    });

    if (!token) {
      return NextResponse.json(
        { error: "Invalid or expired claim token" },
        { status: 400 }
      );
    }

    // Associate the decorated product with the user
    await db
      .update(decoratedProducts)
      .set({ userId: session.user.id, updatedAt: new Date() })
      .where(eq(decoratedProducts.id, token.decoratedProductId));

    // Mark token as claimed
    await db
      .update(anonymousClaimTokens)
      .set({ claimedAt: new Date() })
      .where(eq(anonymousClaimTokens.token, claimToken));

    return NextResponse.json({
      success: true,
      decoratedProductId: token.decoratedProductId,
    });
  } catch (error) {
    console.error("Error claiming decorated product:", error);
    return NextResponse.json(
      { error: "Failed to claim product" },
      { status: 500 }
    );
  }
}
