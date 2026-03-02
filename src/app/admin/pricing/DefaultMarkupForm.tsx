"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";

export default function DefaultMarkupForm({ initialValue }: { initialValue: number }) {
  const router = useRouter();
  const [value, setValue] = useState(String(initialValue));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0 || num > 500) {
      setError("Enter a value between 0 and 500");
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultBlankMarkupPercent: num }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-end gap-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Markup Percentage
        </label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="0"
            max="500"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-gray-500 text-sm font-medium">%</span>
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : saved ? (
          <Check className="w-4 h-4" />
        ) : null}
        {saving ? "Saving..." : saved ? "Saved" : "Update"}
      </button>
    </div>
  );
}
