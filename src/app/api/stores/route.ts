import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// POST: Create a new store
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, slug, description } = await request.json();

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    if (!slugRegex.test(slug) || slug.length < 3 || slug.length > 40) {
      return NextResponse.json(
        { error: "Slug must be 3-40 characters, lowercase letters, numbers, and hyphens only" },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existing = await db.query.stores.findFirst({
      where: eq(stores.slug, slug),
    });
    if (existing) {
      return NextResponse.json({ error: "This URL is already taken" }, { status: 409 });
    }

    const [store] = await db
      .insert(stores)
      .values({
        userId: session.user.id,
        name,
        slug,
        description: description || null,
      })
      .returning();

    return NextResponse.json(store, { status: 201 });
  } catch (error) {
    console.error("Error creating store:", error);
    return NextResponse.json({ error: "Failed to create store" }, { status: 500 });
  }
}

// GET: List current user's stores
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userStores = await db
      .select()
      .from(stores)
      .where(eq(stores.userId, session.user.id))
      .orderBy(desc(stores.createdAt));

    return NextResponse.json({ data: userStores });
  } catch (error) {
    console.error("Error fetching stores:", error);
    return NextResponse.json({ error: "Failed to fetch stores" }, { status: 500 });
  }
}
