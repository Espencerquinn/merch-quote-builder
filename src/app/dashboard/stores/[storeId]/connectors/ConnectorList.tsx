"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, RefreshCw, Loader2, ExternalLink } from "lucide-react";

interface ConnectorInfo {
  id: string;
  storeId: string;
  platform: string;
  externalStoreUrl: string | null;
  lastSyncedAt: Date | null;
  status: string;
  createdAt: Date;
}

export default function ConnectorList({
  connectors,
  storeId,
}: {
  connectors: ConnectorInfo[];
  storeId: string;
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ id: string; message: string } | null>(null);

  const handleSync = async (connectorId: string) => {
    setSyncing(connectorId);
    setSyncResult(null);

    try {
      const res = await fetch(
        `/api/stores/${storeId}/connectors/${connectorId}/sync`,
        { method: "POST" }
      );
      const data = await res.json();

      if (res.ok) {
        setSyncResult({
          id: connectorId,
          message: `Synced: ${data.created} created, ${data.failed} failed`,
        });
        router.refresh();
      } else {
        setSyncResult({
          id: connectorId,
          message: data.error || "Sync failed",
        });
      }
    } catch {
      setSyncResult({ id: connectorId, message: "Sync failed" });
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (connectorId: string) => {
    if (deleting === connectorId) {
      // Second click — confirm
      try {
        await fetch(`/api/stores/${storeId}/connectors/${connectorId}`, {
          method: "DELETE",
        });
        router.refresh();
      } catch {
        console.error("Delete failed");
      }
      setDeleting(null);
    } else {
      setDeleting(connectorId);
      setTimeout(() => setDeleting(null), 3000);
    }
  };

  if (connectors.length === 0) {
    return (
      <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-6 text-center">
        <p className="text-gray-500 text-sm">No connectors configured yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {connectors.map((connector) => (
        <div
          key={connector.id}
          className="bg-gray-800/50 rounded-xl border border-gray-700 p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                  connector.platform === "shopify"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-purple-500/20 text-purple-400"
                }`}
              >
                {connector.platform === "shopify" ? "S" : "W"}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white capitalize">
                  {connector.platform}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      connector.status === "connected"
                        ? "bg-green-400"
                        : connector.status === "error"
                        ? "bg-red-400"
                        : "bg-gray-500"
                    }`}
                  />
                  <span className="capitalize">{connector.status}</span>
                  {connector.externalStoreUrl && (
                    <>
                      <span>·</span>
                      <a
                        href={
                          connector.externalStoreUrl.startsWith("http")
                            ? connector.externalStoreUrl
                            : `https://${connector.externalStoreUrl}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-0.5"
                      >
                        {connector.externalStoreUrl}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </>
                  )}
                </div>
                {connector.lastSyncedAt && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    Last synced: {new Date(connector.lastSyncedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSync(connector.id)}
                disabled={syncing === connector.id}
                className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 disabled:text-gray-600 transition-colors"
              >
                {syncing === connector.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Sync
              </button>
              <button
                onClick={() => handleDelete(connector.id)}
                className={`text-sm transition-colors ${
                  deleting === connector.id
                    ? "text-red-400 font-medium"
                    : "text-gray-500 hover:text-red-400"
                }`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {syncResult?.id === connector.id && (
            <p className="text-xs text-gray-400 mt-2 bg-gray-900/50 rounded px-3 py-1.5">
              {syncResult.message}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
