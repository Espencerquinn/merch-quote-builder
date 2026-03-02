import { db } from "@/lib/db";
import { orders, orderItems, decoratedProducts, users, stores } from "@/lib/db/schema";
import { desc, eq, sum, count, inArray } from "drizzle-orm";
import { DollarSign, ShoppingBag } from "lucide-react";
import OrderStatusUpdate from "./OrderStatusUpdate";
import { formatCents, formatCentsLocale } from "@/lib/format";

export default async function AdminOrdersPage() {
  const allOrders = await db
    .select({
      order: orders,
      userName: users.name,
      userEmail: users.email,
      storeName: stores.name,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .leftJoin(stores, eq(orders.storeId, stores.id))
    .orderBy(desc(orders.createdAt));

  const [totalResult] = await db
    .select({ total: sum(orders.totalAmount), count: count() })
    .from(orders);

  const totalRevenue = Number(totalResult?.total || 0);
  const orderCount = totalResult?.count || 0;

  // Bulk fetch all items for all orders in one query
  const orderIds = allOrders.map((o) => o.order.id);
  const allItems = orderIds.length > 0
    ? await db
        .select({
          item: orderItems,
          productName: decoratedProducts.name,
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Orders</h1>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-500">Total Orders</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{orderCount}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-500">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCentsLocale(totalRevenue)}
          </p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {allOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allOrders.map(({ order, userName, userEmail, storeName }) => {
                  const items = itemsByOrder.get(order.id) || [];
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-xs font-mono text-gray-500">
                        {order.id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{userName || "—"}</p>
                        <p className="text-xs text-gray-500">{userEmail}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {items.map(({ item, productName }) => (
                          <div key={item.id} className="text-xs">
                            {productName || "Deleted"} × {item.quantity}
                          </div>
                        ))}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {storeName || "Direct"}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {formatCents(order.totalAmount)}
                        {order.sellerPayout && order.sellerPayout > 0 && (
                          <div className="text-xs text-gray-400">
                            Payout: {formatCents(order.sellerPayout)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <OrderStatusUpdate orderId={order.id} currentStatus={order.status} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
