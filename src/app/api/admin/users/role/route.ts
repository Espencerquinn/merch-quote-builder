import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(request: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const { userId, role } = await request.json();

    if (!userId || !["user", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Prevent removing your own admin role
    if (userId === session.user.id && role !== "admin") {
      return NextResponse.json(
        { error: "Cannot remove your own admin role" },
        { status: 400 }
      );
    }

    await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }
}
