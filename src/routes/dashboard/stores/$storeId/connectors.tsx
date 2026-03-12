import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Plug, Plus, Trash2, RefreshCw, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/lib/supabase/client";

export const Route = createFileRoute("/dashboard/stores/$storeId/connectors")({
  component: StoreConnectorsPage,
});

interface Connector {
  id: string;
  store_id: string;
  platform: string;
  external_store_url: string | null;
  last_synced_at: string | null;
  status: string;
  created_at: string;
}

type Platform = "shopify" | "woocommerce";

const platformInfo: Record<Platform, { label: string; color: string }> = {
  shopify: { label: "Shopify", color: "green" },
  woocommerce: { label: "WooCommerce", color: "purple" },
};

function StoreConnectorsPage() {
  const { storeId } = Route.useParams();
  const { user } = useAuth();
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [platform, setPlatform] = useState<Platform>("shopify");
  const [storeUrl, setStoreUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [adding, setAdding] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadConnectors();
  }, [user, storeId]);

  async function loadConnectors() {
    setLoading(true);
    const { data, error } = await supabase
      .from("store_connectors")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setConnectors(data);
    }
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!storeUrl.trim() || !apiKey.trim()) {
      setError("Store URL and API key are required.");
      return;
    }

    setAdding(true);
    setError(null);

    const { data, error: fnError } = await supabase.functions.invoke("connect-store", {
      body: {
        storeId,
        platform,
        storeUrl: storeUrl.trim(),
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
      },
    });

    if (fnError || data?.error) {
      setError(fnError?.message || data?.error || "Failed to connect. Please check your credentials.");
      setAdding(false);
      return;
    }

    setShowAddForm(false);
    setStoreUrl("");
    setApiKey("");
    setApiSecret("");
    await loadConnectors();
    setAdding(false);
  }

  async function handleSync(connectorId: string) {
    setSyncing(connectorId);
    await supabase.functions.invoke("sync-connector", {
      body: { connectorId },
    });
    await loadConnectors();
    setSyncing(null);
  }

  async function handleRemove(connectorId: string) {
    if (!confirm("Are you sure you want to disconnect this connector?")) return;

    await supabase.functions.invoke("disconnect-store", {
      body: { connectorId },
    });

    setConnectors((prev) => prev.filter((c) => c.id !== connectorId));
  }

  const statusColors: Record<string, string> = {
    connected: "bg-green-500/20 text-green-400",
    disconnected: "bg-gray-700 text-gray-400",
    error: "bg-red-500/20 text-red-400",
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link
        to="/dashboard/stores/$storeId"
        params={{ storeId }}
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Store
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
            <Plug className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Connectors</h1>
            <p className="text-gray-400 text-sm">Connect to Shopify or WooCommerce.</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Connector
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">New Connector</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="shopify">Shopify</option>
                <option value="woocommerce">WooCommerce</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Store URL <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                placeholder={platform === "shopify" ? "https://your-store.myshopify.com" : "https://your-store.com"}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                API Key <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter API key"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                API Secret
              </label>
              <input
                type="password"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="Enter API secret (if required)"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={adding}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <Plug className="w-4 h-4" />
                {adding ? "Connecting..." : "Connect"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setError(null);
                }}
                className="px-4 py-2.5 text-gray-400 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Connector List */}
      {connectors.length === 0 && !showAddForm ? (
        <div className="text-center py-16 bg-gray-800/50 rounded-2xl border border-gray-700">
          <Plug className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No connectors</h3>
          <p className="text-gray-400 mb-6">
            Connect your store to Shopify or WooCommerce to sync products.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Your First Connector
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {connectors.map((connector) => {
            const info = platformInfo[connector.platform as Platform] || {
              label: connector.platform,
              color: "gray",
            };
            return (
              <div
                key={connector.id}
                className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 bg-${info.color}-500/20 rounded-lg flex items-center justify-center`}>
                      <Plug className={`w-5 h-5 text-${info.color}-400`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{info.label}</h3>
                      {connector.external_store_url && (
                        <a
                          href={connector.external_store_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-400 hover:text-blue-400 flex items-center gap-1 transition-colors"
                        >
                          {connector.external_store_url}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      statusColors[connector.status] || "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {connector.status}
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {connector.last_synced_at
                      ? `Last synced: ${new Date(connector.last_synced_at).toLocaleString()}`
                      : "Never synced"}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSync(connector.id)}
                      disabled={syncing === connector.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncing === connector.id ? "animate-spin" : ""}`} />
                      Sync
                    </button>
                    <button
                      onClick={() => handleRemove(connector.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
