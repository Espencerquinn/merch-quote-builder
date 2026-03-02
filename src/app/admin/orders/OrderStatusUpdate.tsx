"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ORDER_STATUSES, orderStatusStyles } from "@/lib/order-status";

export default function OrderStatusUpdate({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);

  const handleChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;
    setUpdating(true);

    try {
      const res = await fetch("/api/admin/orders/status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });

      if (res.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <select
      value={currentStatus}
      onChange={(e) => handleChange(e.target.value)}
      disabled={updating}
      className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${
        orderStatusStyles[currentStatus] || "bg-gray-100 text-gray-600"
      }`}
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s.charAt(0).toUpperCase() + s.slice(1)}
        </option>
      ))}
    </select>
  );
}
