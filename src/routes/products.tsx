import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Shirt, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/lib/supabase/client";
import type { ProductSummary } from "@/lib/providers/types";
import ProductCatalog from "@/components/ProductCatalog";

export const Route = createFileRoute("/products")({
  component: ProductsPage,
});

function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("compound_id, name, description, product_type, thumbnail_url, provider_id")
        .eq("is_active", true);

      if (error) {
        console.error("Error loading products:", error);
        setLoading(false);
        return;
      }

      const mapped: ProductSummary[] = (data || []).map((p) => ({
        id: p.compound_id,
        name: p.name,
        description: p.description || "",
        productType: p.product_type || "",
        thumbnailUrl: p.thumbnail_url,
        provider: p.provider_id,
      }));

      setProducts(mapped);
      setLoading(false);
    }

    loadProducts();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="px-6 py-4 border-b border-gray-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shirt className="w-8 h-8 text-blue-400" />
            <span className="text-xl font-bold text-white">Merch Makers</span>
          </Link>
          <nav className="flex items-center gap-4">
            {user ? (
              <Link
                to="/dashboard"
                className="text-gray-300 hover:text-white transition-colors text-sm"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="text-gray-300 hover:text-white transition-colors text-sm"
              >
                Sign In
              </Link>
            )}
            <Link
              to="/builder"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Designer
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Product Catalog</h1>
          <p className="text-gray-400 mt-2">
            {loading ? "Loading products..." : `Browse ${products.length} products. Select one to start designing.`}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <ProductCatalog products={products} />
        )}
      </main>
    </div>
  );
}
