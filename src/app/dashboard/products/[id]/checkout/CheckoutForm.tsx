"use client";

import { useState, useMemo } from "react";
import { ShoppingBag, Minus, Plus, Loader2 } from "lucide-react";
import { calculateQuote } from "@/lib/pricing";

interface CheckoutFormProps {
  decoratedProductId: string;
  productName: string;
  sizes: { id: string; name: string }[];
  baseRetailPrice: number;
}

export default function CheckoutForm({
  decoratedProductId,
  productName,
  sizes,
  baseRetailPrice,
}: CheckoutFormProps) {
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>(
    () => Object.fromEntries(sizes.map((s) => [s.id, 0]))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalQuantity = useMemo(
    () => Object.values(sizeQuantities).reduce((sum, qty) => sum + qty, 0),
    [sizeQuantities]
  );

  const quote = useMemo(
    () => (totalQuantity > 0 ? calculateQuote(totalQuantity) : null),
    [totalQuantity]
  );

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
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decoratedProductId,
          sizeBreakdown: sizeQuantities,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create checkout session");
        return;
      }

      // Redirect to Stripe Checkout
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
      {/* Size Selection */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Select Sizes & Quantities</h2>
        <div className="space-y-3">
          {sizes.map((size) => (
            <div
              key={size.id}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-800/50"
            >
              <span className="text-sm font-medium text-gray-300 w-16">{size.name}</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateSize(size.id, -1)}
                  disabled={!sizeQuantities[size.id]}
                  className="w-8 h-8 rounded-lg border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-white font-medium w-8 text-center tabular-nums">
                  {sizeQuantities[size.id] || 0}
                </span>
                <button
                  onClick={() => updateSize(size.id, 1)}
                  className="w-8 h-8 rounded-lg border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Price Summary */}
      {quote && (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Total quantity</span>
              <span className="text-white">{totalQuantity} units</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Blank cost</span>
              <span className="text-white">
                ${quote.blankCostPerUnit.toFixed(2)}/unit
              </span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Print cost</span>
              <span className="text-white">
                ${quote.printCostPerUnit.toFixed(2)}/unit
              </span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Unit price</span>
              <span className="text-white font-medium">
                ${quote.costPerUnit.toFixed(2)}/unit
              </span>
            </div>
            {quote.setupFee > 0 && (
              <div className="flex justify-between text-gray-400">
                <span>Setup fee (small order)</span>
                <span className="text-white">${quote.setupFee.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between">
              <span className="font-semibold text-white">Total</span>
              <span className="font-bold text-white text-lg">
                ${quote.totalCost.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Checkout Button */}
      <button
        onClick={handleCheckout}
        disabled={totalQuantity === 0 || loading}
        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
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
          : `Checkout — $${quote?.totalCost.toFixed(2)}`}
      </button>
    </div>
  );
}
