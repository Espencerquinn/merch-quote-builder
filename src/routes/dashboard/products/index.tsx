import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Package, Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/lib/supabase/client";

export const Route = createFileRoute("/dashboard/products/")({
  component: ProductsPage,
});

interface DecoratedProduct {
  id: string;
  name: string;
  base_product_id: string;
  selected_colour_id: string;
  thumbnail_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<DecoratedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadProducts();
  }, [user]);

  async function loadProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from("decorated_products")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    setDeleting(id);
    const { error } = await supabase
      .from("decorated_products")
      .delete()
      .eq("id", id)
      .eq("user_id", user!.id);

    if (!error) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
    setDeleting(null);
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">My Products</h1>
          <p className="text-gray-400 mt-1">
            {products.length} decorated product{products.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          to="/products"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create New
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/50 rounded-2xl border border-gray-700">
          <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No products yet</h3>
          <p className="text-gray-400 mb-6">
            Browse our catalog and create your first decorated product.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Browse Catalog
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-gray-800/50 rounded-2xl border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors group"
            >
              <Link
                to="/dashboard/products/$productId"
                params={{ productId: product.id }}
                className="block"
              >
                <div className="aspect-square bg-gray-900 flex items-center justify-center">
                  {product.thumbnail_url ? (
                    <img
                      src={product.thumbnail_url}
                      alt={product.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Package className="w-16 h-16 text-gray-700" />
                  )}
                </div>
              </Link>

              <div className="p-4">
                <Link
                  to="/dashboard/products/$productId"
                  params={{ productId: product.id }}
                >
                  <h3 className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                    {product.name}
                  </h3>
                </Link>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(product.created_at).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-1 mt-1">
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

                <div className="flex items-center gap-2 mt-4">
                  <Link
                    to="/builder"
                    search={{
                      product: product.base_product_id,
                      edit: product.id,
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(product.id)}
                    disabled={deleting === product.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" />
                    {deleting === product.id ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
