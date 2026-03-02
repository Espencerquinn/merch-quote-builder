import Link from "next/link";
import { CheckCircle, Package, ArrowRight } from "lucide-react";
import { formatCents } from "@/lib/format";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { session_id } = await searchParams;

  let order = null;
  if (session_id) {
    order = await db.query.orders.findFirst({
      where: eq(orders.stripeCheckoutSessionId, session_id),
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">Order Confirmed!</h1>
        <p className="text-gray-400 mb-8">
          Thank you for your purchase. We&apos;ll start processing your order right away.
        </p>

        {order && (
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 mb-8 text-left">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-blue-400" />
              <h2 className="text-sm font-semibold text-white">Order Details</h2>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-400">Order ID</dt>
                <dd className="text-white font-mono text-xs">{order.id.slice(0, 8)}...</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Status</dt>
                <dd className="text-green-400 capitalize">{order.status}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Total</dt>
                <dd className="text-white font-semibold">
                  {formatCents(order.totalAmount)}
                </dd>
              </div>
            </dl>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard/orders"
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            View Orders
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
