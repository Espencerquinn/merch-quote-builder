"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Check } from "lucide-react";

const PLATFORMS = [
  {
    id: "shopify",
    name: "Shopify",
    description: "Sync products to your Shopify store",
    color: "green",
    fields: [
      { key: "storeUrl", label: "Store URL", placeholder: "my-store.myshopify.com", secret: false },
      { key: "accessToken", label: "Admin API Access Token", placeholder: "shpat_...", secret: true },
    ],
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    description: "Sync products to your WordPress site",
    color: "purple",
    fields: [
      { key: "siteUrl", label: "Site URL", placeholder: "https://mysite.com", secret: false },
      { key: "consumerKey", label: "Consumer Key", placeholder: "ck_...", secret: true },
      { key: "consumerSecret", label: "Consumer Secret", placeholder: "cs_...", secret: true },
    ],
  },
];

export default function AddConnectorForm({ storeId }: { storeId: string }) {
  const router = useRouter();
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const platform = PLATFORMS.find((p) => p.id === selectedPlatform);

  const handleConnect = async () => {
    if (!selectedPlatform) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/stores/${storeId}/connectors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: selectedPlatform,
          credentials,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to connect");
        return;
      }

      setSelectedPlatform(null);
      setCredentials({});
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Platform Selection */}
      <div className="grid sm:grid-cols-2 gap-3">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setSelectedPlatform(p.id);
              setCredentials({});
              setError(null);
            }}
            className={`text-left p-4 rounded-xl border transition-colors ${
              selectedPlatform === p.id
                ? "border-blue-500 bg-blue-500/10"
                : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${
                  p.color === "green"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-purple-500/20 text-purple-400"
                }`}
              >
                {p.id === "shopify" ? "S" : "W"}
              </div>
              <h3 className="text-sm font-semibold text-white">{p.name}</h3>
            </div>
            <p className="text-xs text-gray-500">{p.description}</p>
          </button>
        ))}
      </div>

      {/* Credential Fields */}
      {platform && (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">
            Connect to {platform.name}
          </h3>

          {platform.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                {field.label}
              </label>
              <input
                type={field.secret ? "password" : "text"}
                value={credentials[field.key] || ""}
                onChange={(e) =>
                  setCredentials((prev) => ({
                    ...prev,
                    [field.key]: e.target.value,
                  }))
                }
                placeholder={field.placeholder}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          ))}

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            onClick={handleConnect}
            disabled={
              loading ||
              platform.fields.some((f) => !credentials[f.key])
            }
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {loading ? "Testing connection..." : "Connect & Save"}
          </button>

          <p className="text-xs text-gray-600">
            We&apos;ll test the connection before saving. Credentials are stored securely.
          </p>
        </div>
      )}
    </div>
  );
}
