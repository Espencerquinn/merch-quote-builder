import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Store,
  Package,
  Paintbrush,
  Plug,
  Globe,
  GlobeLock,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/lib/supabase/client";

export const Route = createFileRoute("/dashboard/stores/$storeId/")({
  component: StoreManagementPage,
});

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  header_image_url: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

function StoreManagementPage() {
  const { storeId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [store, setStore] = useState<StoreRow | null>(null);
  const [productCount, setProductCount] = useState(0);
  const [connectorCount, setConnectorCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadStore();
  }, [user, storeId]);

  async function loadStore() {
    setLoading(true);
    const [storeRes, productsRes, connectorsRes] = await Promise.all([
      supabase
        .from("stores")
        .select("*")
        .eq("id", storeId)
        .eq("user_id", user!.id)
        .single(),
      supabase
        .from("store_products")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId),
      supabase
        .from("store_connectors")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId),
    ]);

    if (storeRes.error || !storeRes.data) {
      navigate({ to: "/dashboard/stores" });
      return;
    }

    setStore(storeRes.data);
    setProductCount(productsRes.count ?? 0);
    setConnectorCount(connectorsRes.count ?? 0);
    setLoading(false);
  }

  async function togglePublish() {
    if (!store) return;
    setToggling(true);
    const { error } = await supabase
      .from("stores")
      .update({ is_published: !store.is_published })
      .eq("id", store.id);

    if (!error) {
      setStore({ ...store, is_published: !store.is_published });
    }
    setToggling(false);
  }

  async function handleDelete() {
    if (!store || !confirm("Are you sure you want to delete this store? This action cannot be undone.")) return;
    setDeleting(true);
    const { error } = await supabase
      .from("stores")
      .delete()
      .eq("id", store.id)
      .eq("user_id", user!.id);
    if (!error) {
      navigate({ to: "/dashboard/stores" });
    }
    setDeleting(false);
  }

  if (loading || !store) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
      </div>
    );
  }

  const sections = [
    {
      href: `/dashboard/stores/${storeId}/products` as const,
      icon: Package,
      color: "purple",
      title: "Products",
      description: `${productCount} product${productCount !== 1 ? "s" : ""} in store`,
    },
    {
      href: `/dashboard/stores/${storeId}/editor` as const,
      icon: Paintbrush,
      color: "blue",
      title: "Customize",
      description: "Logo, theme, and branding",
    },
    {
      href: `/dashboard/stores/${storeId}/connectors` as const,
      icon: Plug,
      color: "green",
      title: "Connectors",
      description: `${connectorCount} connector${connectorCount !== 1 ? "s" : ""} configured`,
    },
  ];

  return (
    <div className="p-8">
      <Link
        to="/dashboard/stores"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Stores
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.name} className="w-10 h-10 rounded object-cover" />
            ) : (
              <Store className="w-7 h-7 text-blue-400" />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">{store.name}</h1>
            <p className="text-sm text-gray-500">{store.slug}.merchmakers.com</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {store.is_published && (
            <a
              href={`https://${store.slug}.merchmakers.com`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Visit
            </a>
          )}
          <button
            onClick={togglePublish}
            disabled={toggling}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
              store.is_published
                ? "bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {store.is_published ? (
              <>
                <GlobeLock className="w-4 h-4" />
                {toggling ? "..." : "Unpublish"}
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                {toggling ? "..." : "Publish"}
              </>
            )}
          </button>
        </div>
      </div>

      {store.description && (
        <p className="text-gray-400 mb-8 max-w-xl">{store.description}</p>
      )}

      <div className="grid sm:grid-cols-3 gap-6 mb-8">
        {sections.map((section) => (
          <Link
            key={section.href}
            to={section.href}
            className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6 hover:border-blue-500/50 transition-colors group"
          >
            <div className={`w-10 h-10 bg-${section.color}-500/20 rounded-lg flex items-center justify-center mb-4`}>
              <section.icon className={`w-5 h-5 text-${section.color}-400`} />
            </div>
            <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors mb-1">
              {section.title}
            </h3>
            <p className="text-sm text-gray-400">{section.description}</p>
          </Link>
        ))}
      </div>

      <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
          Store Details
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Status</span>
            <span className={store.is_published ? "text-green-400" : "text-gray-500"}>
              {store.is_published ? "Published" : "Draft"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Created</span>
            <span className="text-white">
              {new Date(store.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Products</span>
            <span className="text-white">{productCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Connectors</span>
            <span className="text-white">{connectorCount}</span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-700">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? "Deleting..." : "Delete Store"}
          </button>
        </div>
      </div>
    </div>
  );
}
