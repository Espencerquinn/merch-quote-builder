import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Store, Shirt, Loader2, Minus, Plus, ShoppingBag } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { formatCents } from "@/lib/format";
import { toast } from "@/components/Toast";
import { SIZE_ORDER } from "@/lib/format";

export const Route = createFileRoute("/store/$storeId/products/$productId/")({
  component: StoreProductPage,
});

function StoreProductPage() {
  const { storeId, productId } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<any>(null);
  const [storeProduct, setStoreProduct] = useState<any>(null);
  const [decoratedProduct, setDecoratedProduct] = useState<any>(null);
  const [sizes, setSizes] = useState<{ id: string; name: string }[]>([]);
  const [sizeBreakdown, setSizeBreakdown] = useState<Record<string, number>>({});
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: storeData } = await supabase
        .from("stores")
        .select("*")
        .eq("id", storeId)
        .single();

      if (!storeData) {
        setLoading(false);
        return;
      }
      setStore(storeData);

      const { data: spData } = await supabase
        .from("store_products")
        .select("*, decorated_products(*)")
        .eq("id", productId)
        .eq("store_id", storeId)
        .eq("is_visible", true)
        .single();

      if (!spData) {
        setLoading(false);
        return;
      }

      setStoreProduct(spData);
      setDecoratedProduct(spData.decorated_products);

      // Get sizes from product detail
      const defaultSizes = [
        { id: "S", name: "S" }, { id: "M", name: "M" },
        { id: "L", name: "L" }, { id: "XL", name: "XL" }, { id: "2XL", name: "2XL" },
      ];

      if (spData.decorated_products?.base_product_id) {
        try {
          const { data: productRow } = await supabase
            .from("products")
            .select("sizes_json")
            .eq("compound_id", spData.decorated_products.base_product_id)
            .single();
          if (productRow?.sizes_json) {
            const parsedSizes = JSON.parse(productRow.sizes_json) as string[];
            if (parsedSizes.length > 0) {
              const mapped = parsedSizes.map((s: string) => ({ id: s.toLowerCase(), name: s }));
              setSizes(mapped);
              const initial: Record<string, number> = {};
              mapped.forEach((s) => { initial[s.id] = 0; });
              setSizeBreakdown(initial);
              setLoading(false);
              return;
            }
          }
        } catch {}
      }

      setSizes(defaultSizes);
      const initial: Record<string, number> = {};
      defaultSizes.forEach((s) => { initial[s.id] = 0; });
      setSizeBreakdown(initial);
      setLoading(false);
    }
    load();
  }, [storeId, productId]);

  const totalQty = Object.values(sizeBreakdown).reduce((a, b) => a + b, 0);
  const totalPrice = totalQty * (storeProduct?.selling_price || 0);

  const theme = store?.theme_config ? JSON.parse(store.theme_config) : {};
  const primaryColor = theme.primaryColor || "#3b82f6";

  const handleCheckout = async () => {
    if (totalQty === 0) return;
    setCheckingOut(true);

    try {
      const { data, error } = await supabase.functions.invoke("store-checkout", {
        body: { storeProductId: productId, storeId, sizeBreakdown },
      });

      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!store || !storeProduct) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Product not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to="/store/$storeId"
            params={{ storeId }}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.name} className="w-9 h-9 rounded-lg object-cover" />
            ) : (
              <Store className="w-6 h-6" style={{ color: primaryColor }} />
            )}
            <span className="font-semibold text-gray-900">{store.name}</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full">
        <Link
          to="/store/$storeId"
          params={{ storeId }}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to store
        </Link>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <div className="aspect-square bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {decoratedProduct?.thumbnail_url ? (
              <img
                src={decoratedProduct.thumbnail_url}
                alt={storeProduct.display_name || ""}
                className="w-full h-full object-contain p-4"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Shirt className="w-20 h-20 text-gray-200" />
              </div>
            )}
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {storeProduct.display_name || decoratedProduct?.name}
            </h1>
            <p className="text-2xl font-bold mb-6" style={{ color: primaryColor }}>
              {formatCents(storeProduct.selling_price)}
            </p>

            {storeProduct.description && (
              <p className="text-gray-600 mb-8 leading-relaxed">{storeProduct.description}</p>
            )}

            {/* Size Selector */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Select sizes</h3>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {sizes.map((size) => (
                  <div key={size.id} className="flex flex-col items-center">
                    <span className="text-xs font-medium text-gray-500 mb-1">{size.name}</span>
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setSizeBreakdown((p) => ({ ...p, [size.id]: Math.max(0, (p[size.id] || 0) - 1) }))}
                        className="px-2 py-1.5 text-gray-500 hover:bg-gray-100"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-sm font-medium min-w-[2rem] text-center">
                        {sizeBreakdown[size.id] || 0}
                      </span>
                      <button
                        onClick={() => setSizeBreakdown((p) => ({ ...p, [size.id]: (p[size.id] || 0) + 1 }))}
                        className="px-2 py-1.5 text-gray-500 hover:bg-gray-100"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {totalQty > 0 && (
              <div className="flex items-center justify-between mb-4 text-sm">
                <span className="text-gray-500">{totalQty} item{totalQty !== 1 ? "s" : ""}</span>
                <span className="font-semibold text-gray-900">{formatCents(totalPrice)}</span>
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={totalQty === 0 || checkingOut}
              className="w-full flex items-center justify-center gap-2 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {checkingOut ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5" />
                  {totalQty === 0 ? "Select sizes to buy" : `Buy Now - ${formatCents(totalPrice)}`}
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-sm text-gray-400">
            Powered by{" "}
            <Link to="/" className="font-medium hover:text-gray-600 transition-colors" style={{ color: primaryColor }}>
              Merch Makers
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
