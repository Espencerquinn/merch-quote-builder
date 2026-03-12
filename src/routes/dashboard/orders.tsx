import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ShoppingBag } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/lib/supabase/client";
import { formatCents } from "@/lib/format";

export const Route = createFileRoute("/dashboard/orders")({
  component: OrdersPage,
});

interface OrderItem {
  id: string;
  decorated_product_id: string;
  quantity: number;
  size_breakdown: string;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  status: string;
  total_amount: number;
  subtotal: number;
  platform_fee: number;
  seller_payout: number;
  currency: string;
  shipping_name: string | null;
  stripe_checkout_session_id: string | null;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  paid: "bg-green-500/20 text-green-400",
  processing: "bg-blue-500/20 text-blue-400",
  shipped: "bg-purple-500/20 text-purple-400",
  delivered: "bg-green-500/20 text-green-400",
  cancelled: "bg-red-500/20 text-red-400",
};

function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadOrders();
  }, [user]);

  async function loadOrders() {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Orders</h1>
        <p className="text-gray-400 mt-1">
          {orders.length} order{orders.length !== 1 ? "s" : ""}
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/50 rounded-2xl border border-gray-700">
          <ShoppingBag className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No orders yet</h3>
          <p className="text-gray-400">
            Your orders will appear here once you make a purchase.
          </p>
        </div>
      ) : (
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Items
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Total
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {orders.map((order) => (
                <>
                  <tr
                    key={order.id}
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    className="hover:bg-gray-700/30 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm text-white font-mono">
                        {order.id.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          statusColors[order.status] || "bg-gray-700 text-gray-400"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {order.order_items?.length || 0} item{(order.order_items?.length || 0) !== 1 ? "s" : ""}
                    </td>
                    <td className="px-6 py-4 text-sm text-white text-right font-medium">
                      {formatCents(order.total_amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 text-right">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                  {expandedOrder === order.id && order.order_items?.length > 0 && (
                    <tr key={`${order.id}-items`}>
                      <td colSpan={5} className="px-6 py-4 bg-gray-900/50">
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-400 uppercase mb-2">Order Items</p>
                          {order.order_items.map((item) => {
                            const sizes = (() => {
                              try {
                                return JSON.parse(item.size_breakdown);
                              } catch {
                                return {};
                              }
                            })();
                            return (
                              <div
                                key={item.id}
                                className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-2"
                              >
                                <div>
                                  <p className="text-sm text-white font-mono">
                                    {item.decorated_product_id.slice(0, 8)}...
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Sizes:{" "}
                                    {Object.entries(sizes)
                                      .filter(([, qty]) => (qty as number) > 0)
                                      .map(([size, qty]) => `${size}: ${qty}`)
                                      .join(", ")}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-white">
                                    {item.quantity} x {formatCents(item.unit_price)}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {formatCents(item.total_price)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
