import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Store, Plus, Globe, GlobeLock } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/lib/supabase/client";

export const Route = createFileRoute("/dashboard/stores/")({
  component: StoresPage,
});

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  is_published: boolean;
  created_at: string;
}

function StoresPage() {
  const { user } = useAuth();
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadStores();
  }, [user]);

  async function loadStores() {
    setLoading(true);
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setStores(data);
    }
    setLoading(false);
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
          <h1 className="text-3xl font-bold text-white">My Stores</h1>
          <p className="text-gray-400 mt-1">
            {stores.length} store{stores.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          to="/dashboard/stores/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Store
        </Link>
      </div>

      {stores.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/50 rounded-2xl border border-gray-700">
          <Store className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No stores yet</h3>
          <p className="text-gray-400 mb-6">
            Create your first store and start selling your decorated products.
          </p>
          <Link
            to="/dashboard/stores/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Your First Store
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store) => (
            <Link
              key={store.id}
              to="/dashboard/stores/$storeId"
              params={{ storeId: store.id }}
              className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6 hover:border-blue-500/50 transition-colors group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt={store.name} className="w-8 h-8 rounded object-cover" />
                  ) : (
                    <Store className="w-6 h-6 text-blue-400" />
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {store.is_published ? (
                    <>
                      <Globe className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-xs text-green-400">Published</span>
                    </>
                  ) : (
                    <>
                      <GlobeLock className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-xs text-gray-500">Draft</span>
                    </>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors mb-1">
                {store.name}
              </h3>
              <p className="text-sm text-gray-500 mb-2">{store.slug}.merchmakers.com</p>
              {store.description && (
                <p className="text-sm text-gray-400 line-clamp-2">{store.description}</p>
              )}

              <p className="text-xs text-gray-600 mt-4">
                Created {new Date(store.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
