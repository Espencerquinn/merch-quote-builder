"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store, Loader2 } from "lucide-react";

export default function CreateStoreForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate slug from name if slug hasn't been manually edited
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, description }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create store");
        return;
      }

      router.push(`/dashboard/stores/${data.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Store Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="My Awesome Merch"
            required
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Store URL
          </label>
          <div className="flex items-center">
            <span className="text-gray-500 text-sm mr-1">merchmakers.com/store/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(generateSlug(e.target.value))}
              placeholder="my-store"
              required
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">
            3-40 characters. Lowercase letters, numbers, and hyphens only.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Description <span className="text-gray-600">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell customers about your store..."
            rows={3}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>
      </div>

      {/* Preview */}
      {name && (
        <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Preview</p>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-white font-semibold">{name}</p>
              <p className="text-xs text-gray-500">merchmakers.com/store/{slug || "..."}</p>
            </div>
          </div>
          {description && <p className="text-sm text-gray-400 mt-2">{description}</p>}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !name || !slug}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Store className="w-5 h-5" />
        )}
        {loading ? "Creating..." : "Create Store"}
      </button>
    </form>
  );
}
