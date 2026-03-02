import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Verify the current user is an admin. Returns the session if authorized,
 * or a 401 NextResponse if not.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}
