import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { orders, orderItems, decoratedProducts } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { ShoppingBag, Package } from "lucide-react";
import Link from "next/link";
import { formatCents } from "@/lib/format";
import { orderStatusStylesDark } from "@/lib/order-status";

export default async function DashboardOrdersPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, session.user.id))
    .orderBy(desc(orders.createdAt));

  // Bulk fetch all items for all orders in one query
  const orderIds = userOrders.map((o) => o.id);
  const allItems = orderIds.length > 0
    ? await db
        .select({
          item: orderItems,
          product: {
            id: decoratedProducts.id,
            name: decoratedProducts.name,
            thumbnailUrl: decoratedProducts.thumbnailUrl,
          },
        })
        .from(orderItems)
        .leftJoin(decoratedProducts, eq(orderItems.decoratedProductId, decoratedProducts.id))
        .where(inArray(orderItems.orderId, orderIds))
    : [];

  // Group items by orderId
  const itemsByOrder = new Map<string, typeof allItems>();
  for (const row of allItems) {
    const list = itemsByOrder.get(row.item.orderId) || [];
    list.push(row);
    itemsByOrder.set(row.item.orderId, list);
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Orders</h1>
        <p className="text-gray-400 mt-1">
          {userOrders.length} order{userOrders.length !== 1 ? "s" : ""}
        </p>
      </div>

      {userOrders.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No orders yet</h3>
          <p className="text-gray-400 mb-6 max-w-sm mx-auto">
            When you purchase products, your orders will appear here.
          </p>
          <Link
            href="/dashboard/products"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            <Package className="w-4 h-4" />
            View My Products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {userOrders.map((order) => {
            const items = itemsByOrder.get(order.id) || [];
            return (
              <div
                key={order.id}
                className="bg-gray-800/50 rounded-xl border border-gray-700 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs text-gray-500 font-mono mb-1">
                      {order.id.slice(0, 8)}...
                    </p>
                    <p className="text-sm text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                        orderStatusStylesDark[order.status] || "bg-gray-700 text-gray-400"
                      }`}
                    >
                      {order.status}
                    </span>
                    <span className="text-lg font-bold text-white">
                      {formatCents(order.totalAmount)}
                    </span>
                  </div>
                </div>

                {items.length > 0 && (
                  <div className="border-t border-gray-700 pt-4 space-y-2">
                    {items.map(({ item, product }) => {
                      const sizes = (() => {
                        try {
                          const parsed = JSON.parse(item.sizeBreakdown);
                          return Object.entries(parsed)
                            .filter(([, qty]) => (qty as number) > 0)
                            .map(([size, qty]) => `${size}: ${qty}`)
                            .join(", ");
                        } catch {
                          return "";
                        }
                      })();

                      return (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <div>
                            <span className="text-gray-300">
                              {product?.name || "Deleted product"}
                            </span>
                            <span className="text-gray-500 ml-2">
                              x{item.quantity}
                            </span>
                            {sizes && (
                              <span className="text-gray-600 ml-2 text-xs">({sizes})</span>
                            )}
                          </div>
                          <span className="text-gray-400">
                            {formatCents(item.totalPrice)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
