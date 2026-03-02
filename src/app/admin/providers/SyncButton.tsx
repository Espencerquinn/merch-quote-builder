"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";

export default function SyncButton() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/sync", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setResult(`Synced ${data.results?.length || 0} provider(s) successfully`);
        router.refresh();
      } else {
        setResult(data.error || "Sync failed");
      }
    } catch {
      setResult("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {result && <span className="text-sm text-gray-500">{result}</span>}
      <button
        onClick={handleSync}
        disabled={syncing}
        className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-600/50 text-white font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {syncing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}
        {syncing ? "Syncing..." : "Sync All Providers"}
      </button>
    </div>
  );
}
