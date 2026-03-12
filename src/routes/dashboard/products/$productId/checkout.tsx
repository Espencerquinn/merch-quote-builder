import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, ShoppingCart, Package } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/lib/supabase/client";
import { calculateQuote } from "@/lib/pricing";
import { SIZE_ORDER } from "@/lib/format";

export const Route = createFileRoute("/dashboard/products/$productId/checkout")({
  component: CheckoutPage,
});

interface DecoratedProduct {
  id: string;
  name: string;
  base_product_id: string;
  thumbnail_url: string | null;
}

function CheckoutPage() {
  const { productId } = Route.useParams();
  const { user } = useAuth();
  const [product, setProduct] = useState<DecoratedProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sizeBreakdown, setSizeBreakdown] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    loadProduct();
  }, [user, productId]);

  async function loadProduct() {
    setLoading(true);
    const { data, error } = await supabase
      .from("decorated_products")
      .select("id, name, base_product_id, thumbnail_url")
      .eq("id", productId)
      .eq("user_id", user!.id)
      .single();

    if (error || !data) {
      setError("Product not found");
      setLoading(false);
      return;
    }
    setProduct(data);
    // Initialize sizes
    const initial: Record<string, number> = {};
    SIZE_ORDER.forEach((size) => {
      initial[size] = 0;
    });
    setSizeBreakdown(initial);
    setLoading(false);
  }

  function updateSize(size: string, value: number) {
    setSizeBreakdown((prev) => ({
      ...prev,
      [size]: Math.max(0, value),
    }));
  }

  const totalQuantity = Object.values(sizeBreakdown).reduce((sum, qty) => sum + qty, 0);
  const quote = totalQuantity > 0 ? calculateQuote(totalQuantity) : null;

  async function handleCheckout() {
    if (totalQuantity === 0) {
      setError("Please select at least one size.");
      return;
    }

    setSubmitting(true);
    setError(null);

    // Filter out zero-quantity sizes
    const filteredBreakdown: Record<string, number> = {};
    for (const [size, qty] of Object.entries(sizeBreakdown)) {
      if (qty > 0) filteredBreakdown[size] = qty;
    }

    const { data, error: fnError } = await supabase.functions.invoke("checkout", {
      body: {
        decoratedProductId: productId,
        sizeBreakdown: filteredBreakdown,
      },
    });

    if (fnError || !data?.url) {
      setError(fnError?.message || "Failed to create checkout session. Please try again.");
      setSubmitting(false);
      return;
    }

    window.location.href = data.url;
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400">Product not found.</p>
        <Link to="/dashboard/products" className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block">
          Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link
        to="/dashboard/products/$productId"
        params={{ productId }}
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Product
      </Link>

      <h1 className="text-3xl font-bold text-white mb-2">Checkout</h1>
      <p className="text-gray-400 mb-8">Select sizes and quantities for your order.</p>

      <div className="flex items-center gap-4 bg-gray-800/50 rounded-xl border border-gray-700 p-4 mb-8">
        <div className="w-16 h-16 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
          {product.thumbnail_url ? (
            <img src={product.thumbnail_url} alt={product.name} className="w-full h-full object-contain rounded-lg" />
          ) : (
            <Package className="w-8 h-8 text-gray-700" />
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{product.name}</h3>
          <p className="text-xs text-gray-500">{product.base_product_id}</p>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Size Selection</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {SIZE_ORDER.map((size) => (
            <div key={size} className="text-center">
              <label className="text-xs text-gray-400 block mb-1">{size}</label>
              <input
                type="number"
                min={0}
                value={sizeBreakdown[size] || 0}
                onChange={(e) => updateSize(size, parseInt(e.target.value) || 0)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-white text-center text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400">
            Total Quantity: <span className="text-white font-semibold">{totalQuantity}</span>
          </p>
        </div>
      </div>

      {quote && (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Quote Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Blank cost ({totalQuantity} x ${quote.blankCostPerUnit.toFixed(2)})</span>
              <span className="text-white">${quote.blankCostTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Print cost ({totalQuantity} x ${quote.printCostPerUnit.toFixed(2)})</span>
              <span className="text-white">${quote.printCostTotal.toFixed(2)}</span>
            </div>
            {quote.setupFee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Setup fee</span>
                <span className="text-white">${quote.setupFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-700 font-semibold">
              <span className="text-gray-300">Total</span>
              <span className="text-white">${quote.totalCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Cost per unit</span>
              <span className="text-gray-400">${quote.costPerUnit.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <button
        onClick={handleCheckout}
        disabled={submitting || totalQuantity === 0}
        className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ShoppingCart className="w-5 h-5" />
        {submitting ? "Creating checkout..." : "Proceed to Payment"}
      </button>
    </div>
  );
}
