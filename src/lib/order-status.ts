export const ORDER_STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Light theme styles (admin pages) */
export const orderStatusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-200 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

/** Dark theme styles (dashboard pages) */
export const orderStatusStylesDark: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  paid: "bg-green-500/20 text-green-400",
  processing: "bg-blue-500/20 text-blue-400",
  shipped: "bg-purple-500/20 text-purple-400",
  delivered: "bg-green-600/20 text-green-300",
  cancelled: "bg-red-500/20 text-red-400",
};
