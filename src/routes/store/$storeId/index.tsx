import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Store, ShoppingBag, AlertTriangle, Shirt, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/lib/supabase/client";
import { formatCents } from "@/lib/format";

export const Route = createFileRoute("/store/$storeId/")({
  component: PublicStorePage,
});

interface StoreData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  header_image_url: string | null;
  theme_config: string | null;
  is_published: boolean;
  user_id: string;
}

interface StoreProductRow {
  id: string;
  display_name: string | null;
  description: string | null;
  selling_price: number;
  is_visible: boolean;
  decorated_products: {
    id: string;
    name: string | null;
    thumbnail_url: string | null;
  } | null;
}

function PublicStorePage() {
  const { storeId } = Route.useParams();
  const { user } = useAuth();
  const [store, setStore] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<StoreProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadStore() {
      setLoading(true);

      const { data: storeData, error: storeError } = await supabase
        .from("stores")
        .select("*")
        .eq("id", storeId)
        .single();

      if (storeError || !storeData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const isOwner = user?.id === storeData.user_id;
      if (!storeData.is_published && !isOwner) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setStore(storeData);

      const { data: productsData } = await supabase
        .from("store_products")
        .select("id, display_name, description, selling_price, is_visible, decorated_products(id, name, thumbnail_url)")
        .eq("store_id", storeData.id)
        .eq("is_visible", true);

      setProducts(productsData || []);
      setLoading(false);
    }

    loadStore();
  }, [storeId, user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (notFound || !store) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Store className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Store Not Found</h1>
          <p className="text-gray-500 mb-6">This store doesn&apos;t exist or isn&apos;t published yet.</p>
          <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const theme = store.theme_config ? (() => { try { return JSON.parse(store.theme_config); } catch { return {}; } })() : {};
  const primaryColor = theme.primaryColor || "#3b82f6";
  const backgroundColor = theme.backgroundColor || "#f9fafb";
  const textColor = theme.textColor || "#111827";
  const isOwner = user?.id === store.user_id;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor }}>
      {/* Preview Banner */}
      {!store.is_published && isOwner && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-2 text-sm text-yellow-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>This store is not published. Only you can see this preview.</span>
            <Link
              to="/dashboard/stores/$storeId"
              params={{ storeId: store.id }}
              className="ml-auto font-medium text-yellow-900 hover:underline"
            >
              Manage Store
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        {store.header_image_url && (
          <div className="h-48 md:h-56 bg-gray-100 overflow-hidden">
            <img src={store.header_image_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                className="w-16 h-16 rounded-xl object-cover shadow-sm"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center shadow-sm"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <Store className="w-8 h-8" style={{ color: primaryColor }} />
              </div>
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ color: textColor }}>{store.name}</h1>
              {store.description && (
                <p className="text-gray-500 mt-1 max-w-xl">{store.description}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Products */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full">
        {products.length === 0 ? (
          <div className="text-center py-24">
            <ShoppingBag className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No products yet</h2>
            <p className="text-gray-500">Check back soon for new products!</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-gray-500">
                {products.length} product{products.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((sp) => {
                const dp = sp.decorated_products;
                return (
                  <Link
                    key={sp.id}
                    to="/store/$storeId/products/$productId"
                    params={{ storeId: store.id, productId: sp.id }}
                    className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all"
                  >
                    <div className="aspect-square bg-gray-50 overflow-hidden">
                      {dp?.thumbnail_url ? (
                        <img
                          src={dp.thumbnail_url}
                          alt={sp.display_name || dp?.name || ""}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Shirt className="w-10 h-10 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 md:p-4">
                      <h3 className="font-medium text-sm md:text-base transition-colors line-clamp-2" style={{ color: textColor }}>
                        {sp.display_name || dp?.name}
                      </h3>
                      <p className="text-base md:text-lg font-bold mt-1" style={{ color: textColor }}>
                        {formatCents(sp.selling_price)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Powered by{" "}
            <Link
              to="/"
              className="font-medium hover:text-gray-600 transition-colors"
              style={{ color: primaryColor }}
            >
              Merch Makers
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
