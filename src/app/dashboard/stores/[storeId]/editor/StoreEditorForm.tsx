"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Store, Loader2, Upload, X, Image as ImageIcon } from "lucide-react";

const PRESET_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#6366f1", "#1e293b", "#000000",
];

function ImageUploadField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Upload failed");
        return;
      }

      const { url } = await res.json();
      onChange(url);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
      <p className="text-xs text-gray-600 mb-3">{hint}</p>

      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt={label}
            className="max-h-32 rounded-lg border border-gray-700 object-contain"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white hover:bg-red-700 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-3 w-full border-2 border-dashed border-gray-700 rounded-xl p-4 text-gray-500 hover:border-gray-500 hover:text-gray-400 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Upload className="w-5 h-5" />
          )}
          <span className="text-sm">{uploading ? "Uploading..." : "Click to upload"}</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
      />

      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}

export default function StoreEditorForm({
  storeId,
  initialName,
  initialDescription,
  initialPrimaryColor,
  initialLogoUrl,
  initialHeaderImageUrl,
}: {
  storeId: string;
  initialName: string;
  initialDescription: string;
  initialPrimaryColor: string;
  initialLogoUrl: string;
  initialHeaderImageUrl: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [primaryColor, setPrimaryColor] = useState(initialPrimaryColor);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [headerImageUrl, setHeaderImageUrl] = useState(initialHeaderImageUrl);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/stores/${storeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          logoUrl: logoUrl || null,
          headerImageUrl: headerImageUrl || null,
          themeConfig: JSON.stringify({ primaryColor }),
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Store updated successfully." });
        router.refresh();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save." });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-500/10 border border-green-500/30 text-green-400"
              : "bg-red-500/10 border border-red-500/30 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Branding */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Branding</h2>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Store Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>
      </div>

      {/* Images */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-gray-400" />
          Images
        </h2>

        <ImageUploadField
          label="Store Logo"
          hint="Recommended: square image, at least 200x200px. JPEG, PNG, or WebP (max 5MB)."
          value={logoUrl}
          onChange={setLogoUrl}
        />

        <ImageUploadField
          label="Header Image"
          hint="Displayed at the top of your storefront. Recommended: 1200x400px. JPEG, PNG, or WebP (max 5MB)."
          value={headerImageUrl}
          onChange={setHeaderImageUrl}
        />
      </div>

      {/* Theme */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Theme</h2>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Primary Color</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setPrimaryColor(color)}
                className={`w-8 h-8 rounded-lg transition-all ${
                  primaryColor === color ? "ring-2 ring-white ring-offset-2 ring-offset-gray-900" : ""
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-28 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-xl p-6">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Store Preview</p>
        {headerImageUrl && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <img
              src={headerImageUrl}
              alt="Header"
              className="w-full h-32 object-cover"
            />
          </div>
        )}
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              className="w-12 h-12 rounded-xl object-cover"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <Store className="w-6 h-6" style={{ color: primaryColor }} />
            </div>
          )}
          <div>
            <p className="font-bold text-gray-900">{name}</p>
            {description && <p className="text-sm text-gray-500">{description}</p>}
          </div>
        </div>
        <button
          type="button"
          className="mt-4 text-white text-sm font-medium px-4 py-2 rounded-lg"
          style={{ backgroundColor: primaryColor }}
        >
          Shop Now
        </button>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
