import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Package, Eye, EyeOff, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/lib/supabase/client";
import { formatCents } from "@/lib/format";

export const Route = createFileRoute("/dashboard/stores/$storeId/products")({
  component: StoreProductsPage,
});

interface StoreProduct {
  id: string;
  store_id: string;
  decorated_product_id: string;
  display_name: string | null;
  markup_type: string;
  markup_value: number;
  selling_price: number;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  decorated_products: {
    id: string;
    name: string;
    thumbnail_url: string | null;
    base_product_id: string;
  } | null;
}

interface UserDecoratedProduct {
  id: string;
  name: string;
  thumbnail_url: string | null;
}

function StoreProductsPage() {
  const { storeId } = Route.useParams();
  const { user } = useAuth();
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [userProducts, setUserProducts] = useState<UserDecoratedProduct[]>([]);
  const [loadingUserProducts, setLoadingUserProducts] = useState(false);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadStoreProducts();
  }, [user, storeId]);

  async function loadStoreProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from("store_products")
      .select("*, decorated_products(id, name, thumbnail_url, base_product_id)")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true });

    if (!error && data) {
      setStoreProducts(data);
    }
    setLoading(false);
  }

  async function loadUserProducts() {
    setLoadingUserProducts(true);
    const existingIds = storeProducts.map((sp) => sp.decorated_product_id);
    const { data } = await supabase
      .from("decorated_products")
      .select("id, name, thumbnail_url")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (data) {
      setUserProducts(data.filter((p) => !existingIds.includes(p.id)));
    }
    setLoadingUserProducts(false);
  }

  async function handleAdd(decoratedProductId: string) {
    setAddingProductId(decoratedProductId);
    const { error } = await supabase.from("store_products").insert({
      store_id: storeId,
      decorated_product_id: decoratedProductId,
      selling_price: 0,
      markup_value: 30,
      markup_type: "percentage",
      sort_order: storeProducts.length,
    });

    if (!error) {
      setShowAddModal(false);
      await loadStoreProducts();
    }
    setAddingProductId(null);
  }

  async function toggleVisibility(productId: string, currentlyVisible: boolean) {
    const { error } = await supabase
      .from("store_products")
      .update({ is_visible: !currentlyVisible })
      .eq("id", productId);

    if (!error) {
      setStoreProducts((prev) =>
        prev.map((sp) =>
          sp.id === productId ? { ...sp, is_visible: !currentlyVisible } : sp
        )
      );
    }
  }

  async function handleRemove(productId: string) {
    if (!confirm("Remove this product from your store?")) return;
    const { error } = await supabase
      .from("store_products")
      .delete()
      .eq("id", productId);

    if (!error) {
      setStoreProducts((prev) => prev.filter((sp) => sp.id !== productId));
    }
  }

  async function updateSellingPrice(productId: string, priceCents: number) {
    await supabase
      .from("store_products")
      .update({ selling_price: priceCents })
      .eq("id", productId);

    setStoreProducts((prev) =>
      prev.map((sp) =>
        sp.id === productId ? { ...sp, selling_price: priceCents } : sp
      )
    );
  }

  function openAddModal() {
    setShowAddModal(true);
    loadUserProducts();
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
      <Link
        to="/dashboard/stores/$storeId"
        params={{ storeId }}
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Store
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Store Products</h1>
          <p className="text-gray-400 mt-1">
            {storeProducts.length} product{storeProducts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {storeProducts.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/50 rounded-2xl border border-gray-700">
          <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No products in store</h3>
          <p className="text-gray-400 mb-6">
            Add products from your decorated products collection.
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Your First Product
          </button>
        </div>
      ) : (
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-700/50">
            {storeProducts.map((sp) => {
              const dp = sp.decorated_products;
              return (
                <div key={sp.id} className="flex items-center gap-4 p-4 hover:bg-gray-700/20 transition-colors">
                  <div className="w-14 h-14 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                    {dp?.thumbnail_url ? (
                      <img src={dp.thumbnail_url} alt={dp.name} loading="lazy" className="w-full h-full object-contain rounded-lg" />
                    ) : (
                      <Package className="w-6 h-6 text-gray-700" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {sp.display_name || dp?.name || "Unnamed Product"}
                    </h3>
                    <p className="text-xs text-gray-500">{dp?.base_product_id}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right mr-4">
                      <label className="text-xs text-gray-500 block">Price (cents)</label>
                      <input
                        type="number"
                        min={0}
                        value={sp.selling_price}
                        onChange={(e) => updateSellingPrice(sp.id, parseInt(e.target.value) || 0)}
                        className="w-24 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-sm text-right focus:outline-none focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-0.5">{formatCents(sp.selling_price)}</p>
                    </div>

                    <button
                      onClick={() => toggleVisibility(sp.id, sp.is_visible)}
                      className={`p-2 rounded-lg transition-colors ${
                        sp.is_visible
                          ? "text-green-400 hover:bg-green-500/10"
                          : "text-gray-500 hover:bg-gray-700"
                      }`}
                      title={sp.is_visible ? "Hide product" : "Show product"}
                    >
                      {sp.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => handleRemove(sp.id)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove from store"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">Add Product to Store</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingUserProducts ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                </div>
              ) : userProducts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-2">No available products to add.</p>
                  <Link
                    to="/products"
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Create a new product first
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {userProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleAdd(product.id)}
                      disabled={addingProductId === product.id}
                      className="flex items-center gap-3 w-full p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 text-left"
                    >
                      <div className="w-10 h-10 bg-gray-900 rounded flex items-center justify-center flex-shrink-0">
                        {product.thumbnail_url ? (
                          <img src={product.thumbnail_url} alt={product.name} loading="lazy" className="w-full h-full object-contain rounded" />
                        ) : (
                          <Package className="w-5 h-5 text-gray-700" />
                        )}
                      </div>
                      <span className="text-sm text-white truncate">{product.name}</span>
                      {addingProductId === product.id && (
                        <div className="ml-auto w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
