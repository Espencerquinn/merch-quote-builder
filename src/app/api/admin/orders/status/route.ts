import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ORDER_STATUSES } from "@/lib/order-status";

export async function PUT(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { orderId, status } = await request.json();

    if (!orderId || !ORDER_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await db
      .update(orders)
      .set({
        status: status as typeof orders.$inferInsert.status,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
