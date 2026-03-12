import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Pencil, ShoppingCart, Store, Package, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/lib/supabase/client";

export const Route = createFileRoute("/dashboard/products/$productId/")({
  component: ProductDetailPage,
});

interface DecoratedProduct {
  id: string;
  name: string;
  base_product_id: string;
  selected_colour_id: string;
  thumbnail_url: string | null;
  canvas_state_json: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface UserStore {
  id: string;
  name: string;
}

function ProductDetailPage() {
  const { productId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState<DecoratedProduct | null>(null);
  const [stores, setStores] = useState<UserStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStoreSelect, setShowStoreSelect] = useState(false);
  const [addingToStore, setAddingToStore] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadProduct();
    loadStores();
  }, [user, productId]);

  async function loadProduct() {
    setLoading(true);
    const { data, error } = await supabase
      .from("decorated_products")
      .select("*")
      .eq("id", productId)
      .eq("user_id", user!.id)
      .single();

    if (error || !data) {
      navigate({ to: "/dashboard/products" });
      return;
    }
    setProduct(data);
    setLoading(false);
  }

  async function loadStores() {
    const { data } = await supabase
      .from("stores")
      .select("id, name")
      .eq("user_id", user!.id);
    if (data) setStores(data);
  }

  async function handleAddToStore(storeId: string) {
    if (!product) return;
    setAddingToStore(true);
    await supabase.from("store_products").insert({
      store_id: storeId,
      decorated_product_id: product.id,
      selling_price: 0,
      markup_value: 30,
      markup_type: "percentage",
    });
    setAddingToStore(false);
    setShowStoreSelect(false);
    navigate({ to: "/dashboard/stores/$storeId/products", params: { storeId } });
  }

  async function handleDelete() {
    if (!product || !confirm("Are you sure you want to delete this product?")) return;
    setDeleting(true);
    const { error } = await supabase
      .from("decorated_products")
      .delete()
      .eq("id", product.id)
      .eq("user_id", user!.id);
    if (!error) {
      navigate({ to: "/dashboard/products" });
    }
    setDeleting(false);
  }

  if (loading || !product) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <Link
        to="/dashboard/products"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Products
      </Link>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="aspect-square bg-gray-900 flex items-center justify-center">
            {product.thumbnail_url ? (
              <img
                src={product.thumbnail_url}
                alt={product.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <Package className="w-24 h-24 text-gray-700" />
            )}
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{product.name}</h1>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Status:</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  product.status === "published"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-gray-700 text-gray-400"
                }`}
              >
                {product.status}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-400">Base Product:</span>
              <span className="text-sm text-white ml-2">{product.base_product_id}</span>
            </div>
            <div>
              <span className="text-sm text-gray-400">Colour:</span>
              <span className="text-sm text-white ml-2">{product.selected_colour_id}</span>
            </div>
            <div>
              <span className="text-sm text-gray-400">Created:</span>
              <span className="text-sm text-white ml-2">
                {new Date(product.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-400">Updated:</span>
              <span className="text-sm text-white ml-2">
                {new Date(product.updated_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              to="/builder"
              search={{ product: product.base_product_id, edit: product.id }}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Edit Design
            </Link>

            <Link
              to="/dashboard/products/$productId/checkout"
              params={{ productId: product.id }}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              Buy This Product
            </Link>

            <button
              onClick={() => setShowStoreSelect(!showStoreSelect)}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Store className="w-4 h-4" />
              Add to Store
            </button>

            {showStoreSelect && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                {stores.length === 0 ? (
                  <div className="text-center py-2">
                    <p className="text-sm text-gray-400 mb-3">You don't have any stores yet.</p>
                    <Link
                      to="/dashboard/stores/new"
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Create a Store
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 mb-2">Select a store:</p>
                    {stores.map((store) => (
                      <button
                        key={store.id}
                        onClick={() => handleAddToStore(store.id)}
                        disabled={addingToStore}
                        className="w-full text-left px-3 py-2 text-sm text-white bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {store.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? "Deleting..." : "Delete Product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
