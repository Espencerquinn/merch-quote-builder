import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Database, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export const Route = createFileRoute("/admin/providers/")({
  component: AdminProvidersPage,
});

interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  productCount: number;
  comingSoon?: boolean;
}

interface SyncLogRow {
  id: string;
  provider_id: string;
  status: string;
  products_added: number | null;
  products_updated: number | null;
  products_removed: number | null;
  started_at: string;
  error_message: string | null;
}

function AdminProvidersPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [syncs, setSyncs] = useState<SyncLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [productsRes, syncsRes] = await Promise.all([
      supabase.from("products").select("provider_id"),
      supabase
        .from("sync_log")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20),
    ]);

    const countMap: Record<string, number> = {};
    (productsRes.data || []).forEach((r) => {
      countMap[r.provider_id] = (countMap[r.provider_id] || 0) + 1;
    });

    setProviders([
      {
        id: "ascolour",
        name: "AS Colour",
        description: "Premium blanks from New Zealand",
        productCount: countMap["ascolour"] || 0,
      },
      {
        id: "static",
        name: "Static (Built-in)",
        description: "Default fallback products",
        productCount: countMap["static"] || 0,
      },
      {
        id: "sanmar",
        name: "SanMar",
        description: "US-based wholesale apparel distributor",
        productCount: countMap["sanmar"] || 0,
        comingSoon: true,
      },
    ]);

    setSyncs((syncsRes.data as SyncLogRow[]) || []);
    setLoading(false);
  }

  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus("Syncing catalog...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : undefined;

      // Phase 1: Catalog sync
      const { data: catalogResult, error: catalogError } = await supabase.functions.invoke("sync-products", {
        body: { phase: "catalog" },
        headers: authHeaders,
      });
      if (catalogError) throw catalogError;

      const needsEnrichment = catalogResult?.needsEnrichment || 0;
      if (needsEnrichment === 0) {
        setSyncStatus("Done — all products up to date");
        await loadData();
        setTimeout(() => setSyncStatus(""), 3000);
        setSyncing(false);
        return;
      }

      // Phase 2: Enrich details in batches (with delay between to respect rate limits)
      let remaining = needsEnrichment;
      const total = catalogResult?.totalFetched || remaining;
      let consecutiveFailures = 0;

      while (remaining > 0) {
        setSyncStatus(`Fetching details... ${total - remaining}/${total} products`);

        const { data: enrichResult, error: enrichError } = await supabase.functions.invoke("sync-products", {
          body: { phase: "enrich", batchSize: 10 },
          headers: authHeaders,
        });
        if (enrichError) throw enrichError;

        remaining = enrichResult?.remaining || 0;

        if (enrichResult?.enriched === 0 && remaining > 0) {
          consecutiveFailures++;
          if (consecutiveFailures >= 3) {
            setSyncStatus(`Done with errors — ${remaining} products could not be enriched`);
            break;
          }
          // Wait longer before retrying on all-errors batch
          await new Promise((r) => setTimeout(r, 5000));
        } else {
          consecutiveFailures = 0;
          // Brief pause between batches
          if (remaining > 0) {
            await new Promise((r) => setTimeout(r, 2000));
          }
        }
      }

      if (remaining === 0) {
        setSyncStatus("Done — all products synced with full details");
      }

      await loadData();
      setTimeout(() => setSyncStatus(""), 5000);
    } catch (err) {
      console.error("Sync failed:", err);
      setSyncStatus("Sync failed — check console");
      setTimeout(() => setSyncStatus(""), 5000);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Providers</h1>
          <p className="text-gray-500 mt-1">Product source management and sync controls</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {syncing ? "Syncing..." : "Sync All"}
          </button>
        </div>
      </div>

      {/* Sync Status */}
      {syncStatus && (
        <div className="mb-6 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          {syncStatus}
        </div>
      )}

      {/* Provider Cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className={`bg-white rounded-xl p-5 border border-gray-200 ${provider.comingSoon ? "opacity-60" : ""}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-teal-500" />
              <h3 className="font-semibold text-gray-900">{provider.name}</h3>
              {provider.comingSoon && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Soon</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-3">{provider.description}</p>
            <p className="text-2xl font-bold text-gray-900">
              {provider.productCount}
              <span className="text-sm font-normal text-gray-400 ml-1">products</span>
            </p>
          </div>
        ))}
      </div>

      {/* Sync History */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Sync History</h2>
        </div>
        {syncs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No syncs yet. Click &quot;Sync All&quot; to populate the product catalog.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Added</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Removed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {syncs.map((sync) => (
                  <tr key={sync.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{sync.provider_id}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          sync.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : sync.status === "running"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {sync.status}
                      </span>
                      {sync.error_message && (
                        <p className="text-xs text-red-500 mt-1 truncate max-w-[150px]">
                          {sync.error_message}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600">{sync.products_added || 0}</td>
                    <td className="px-6 py-4 text-sm text-amber-600">{sync.products_updated || 0}</td>
                    <td className="px-6 py-4 text-sm text-red-600">{sync.products_removed || 0}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(sync.started_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
