"use client";

import { useState, useMemo } from "react";
import { ShoppingBag, Minus, Plus, Loader2 } from "lucide-react";
import { formatCents } from "@/lib/format";

interface StoreProductCheckoutProps {
  storeProductId: string;
  storeId: string;
  unitPrice: number; // cents
  sizes: { id: string; name: string }[];
  primaryColor?: string;
}

export default function StoreProductCheckout({
  storeProductId,
  storeId,
  unitPrice,
  sizes,
  primaryColor = "#111827",
}: StoreProductCheckoutProps) {
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>(
    () => Object.fromEntries(sizes.map((s) => [s.id, 0]))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalQuantity = useMemo(
    () => Object.values(sizeQuantities).reduce((sum, qty) => sum + qty, 0),
    [sizeQuantities]
  );

  const totalPrice = totalQuantity * unitPrice;

  const updateSize = (sizeId: string, delta: number) => {
    setSizeQuantities((prev) => ({
      ...prev,
      [sizeId]: Math.max(0, (prev[sizeId] || 0) + delta),
    }));
  };

  const handleCheckout = async () => {
    if (totalQuantity === 0) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/stores/${storeId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeProductId,
          sizeBreakdown: sizeQuantities,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create checkout");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Size Selector */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Size & Quantity</h3>
        <div className="space-y-1">
          {sizes.map((size) => (
            <div
              key={size.id}
              className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700 w-16">{size.name}</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateSize(size.id, -1)}
                  disabled={!sizeQuantities[size.id]}
                  className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-gray-900 font-medium w-8 text-center tabular-nums">
                  {sizeQuantities[size.id] || 0}
                </span>
                <button
                  onClick={() => updateSize(size.id, 1)}
                  className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      {totalQuantity > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>{totalQuantity} item{totalQuantity !== 1 ? "s" : ""}</span>
            <span>{formatCents(unitPrice)} each</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-gray-900">
            <span>Total</span>
            <span>{formatCents(totalPrice)}</span>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <button
        onClick={handleCheckout}
        disabled={totalQuantity === 0 || loading}
        className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
        style={{ backgroundColor: totalQuantity === 0 ? "#d1d5db" : primaryColor }}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <ShoppingBag className="w-5 h-5" />
        )}
        {loading
          ? "Creating checkout..."
          : totalQuantity === 0
          ? "Select sizes to continue"
          : `Buy — ${formatCents(totalPrice)}`}
      </button>
    </div>
  );
}
