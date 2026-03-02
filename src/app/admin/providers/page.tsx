import { db } from "@/lib/db";
import { syncLog, cachedProducts } from "@/lib/db/schema";
import { desc, eq, count, sql } from "drizzle-orm";
import { Database, RefreshCw } from "lucide-react";
import SyncButton from "./SyncButton";

export default async function AdminProvidersPage() {
  // Get provider stats
  const providerStats = await db
    .select({
      providerId: cachedProducts.providerId,
      count: count(),
    })
    .from(cachedProducts)
    .groupBy(cachedProducts.providerId);

  // Get recent sync logs
  const recentSyncs = await db
    .select()
    .from(syncLog)
    .orderBy(desc(syncLog.startedAt))
    .limit(20);

  const providers = [
    {
      id: "ascolour",
      name: "AS Colour",
      description: "Premium blanks from New Zealand",
      productCount: providerStats.find((p) => p.providerId === "ascolour")?.count || 0,
    },
    {
      id: "static",
      name: "Static (Built-in)",
      description: "Default fallback products",
      productCount: providerStats.find((p) => p.providerId === "static")?.count || 0,
    },
    {
      id: "sanmar",
      name: "SanMar",
      description: "US-based wholesale apparel distributor",
      productCount: providerStats.find((p) => p.providerId === "sanmar")?.count || 0,
      comingSoon: true,
    },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Providers</h1>
          <p className="text-gray-500 mt-1">Product source management and sync controls</p>
        </div>
        <SyncButton />
      </div>

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
        {recentSyncs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No syncs yet. Click &quot;Sync All&quot; to populate the product cache.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Products</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentSyncs.map((sync) => (
                  <tr key={sync.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{sync.providerId}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        sync.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : sync.status === "running"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {sync.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{sync.productsUpdated || 0}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(sync.startedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {sync.completedAt ? new Date(sync.completedAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-red-500 truncate max-w-xs">
                      {sync.errorMessage || "—"}
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
