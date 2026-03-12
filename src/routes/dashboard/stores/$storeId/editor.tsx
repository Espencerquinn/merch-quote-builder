import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Save, Upload, Trash2, Paintbrush } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/lib/supabase/client";

export const Route = createFileRoute("/dashboard/stores/$storeId/editor")({
  component: StoreEditorPage,
});

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  header_image_url: string | null;
  theme_config: string | null;
}

interface ThemeConfig {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
}

const defaultTheme: ThemeConfig = {
  primaryColor: "#3b82f6",
  backgroundColor: "#111827",
  textColor: "#ffffff",
};

function StoreEditorPage() {
  const { storeId } = Route.useParams();
  const { user } = useAuth();
  const [store, setStore] = useState<StoreRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [description, setDescription] = useState("");
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    loadStore();
  }, [user, storeId]);

  async function loadStore() {
    setLoading(true);
    const { data, error } = await supabase
      .from("stores")
      .select("id, name, slug, description, logo_url, header_image_url, theme_config")
      .eq("id", storeId)
      .eq("user_id", user!.id)
      .single();

    if (error || !data) {
      setLoading(false);
      return;
    }

    setStore(data);
    setDescription(data.description || "");
    setLogoUrl(data.logo_url);
    setHeaderImageUrl(data.header_image_url);

    if (data.theme_config) {
      try {
        setTheme({ ...defaultTheme, ...JSON.parse(data.theme_config) });
      } catch {
        setTheme(defaultTheme);
      }
    }
    setLoading(false);
  }

  async function uploadFile(file: File, path: string): Promise<string | null> {
    const ext = file.name.split(".").pop();
    const filePath = `${path}/${storeId}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("store-assets")
      .upload(filePath, file, { upsert: true });

    if (error) {
      setMessage({ type: "error", text: `Upload failed: ${error.message}` });
      return null;
    }

    const { data } = supabase.storage.from("store-assets").getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const url = await uploadFile(file, "logos");
    if (url) setLogoUrl(url);
    setUploadingLogo(false);
  }

  async function handleHeaderUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHeader(true);
    const url = await uploadFile(file, "headers");
    if (url) setHeaderImageUrl(url);
    setUploadingHeader(false);
  }

  async function handleSave() {
    if (!store) return;
    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from("stores")
      .update({
        description: description.trim() || null,
        logo_url: logoUrl,
        header_image_url: headerImageUrl,
        theme_config: JSON.stringify(theme),
      })
      .eq("id", store.id);

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Store updated successfully." });
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400">Store not found.</p>
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

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
          <Paintbrush className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Store Editor</h1>
          <p className="text-gray-400 text-sm">Customize the look and feel of {store.name}.</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Logo */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Logo</h2>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gray-900 rounded-xl flex items-center justify-center border border-gray-700 overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Upload className="w-6 h-6 text-gray-600" />
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                {uploadingLogo ? "Uploading..." : "Upload Logo"}
              </button>
              {logoUrl && (
                <button
                  onClick={() => setLogoUrl(null)}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Header Image */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Header Image</h2>
          <div className="space-y-3">
            {headerImageUrl ? (
              <div className="relative rounded-lg overflow-hidden">
                <img src={headerImageUrl} alt="Header" className="w-full h-32 object-cover" />
                <button
                  onClick={() => setHeaderImageUrl(null)}
                  className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="w-full h-32 bg-gray-900 rounded-lg border border-gray-700 border-dashed flex items-center justify-center">
                <span className="text-sm text-gray-600">No header image</span>
              </div>
            )}
            <input
              ref={headerInputRef}
              type="file"
              accept="image/*"
              onChange={handleHeaderUpload}
              className="hidden"
            />
            <button
              onClick={() => headerInputRef.current?.click()}
              disabled={uploadingHeader}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploadingHeader ? "Uploading..." : "Upload Header Image"}
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Description</h2>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your store..."
            rows={4}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600 resize-none"
          />
        </div>

        {/* Theme Colors */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Theme Colors</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Primary</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={theme.primaryColor}
                  onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
                />
                <input
                  type="text"
                  value={theme.primaryColor}
                  onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                  className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Background</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={theme.backgroundColor}
                  onChange={(e) => setTheme({ ...theme, backgroundColor: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
                />
                <input
                  type="text"
                  value={theme.backgroundColor}
                  onChange={(e) => setTheme({ ...theme, backgroundColor: e.target.value })}
                  className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Text</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={theme.textColor}
                  onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
                />
                <input
                  type="text"
                  value={theme.textColor}
                  onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
                  className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`rounded-lg p-3 text-sm ${
              message.type === "success"
                ? "bg-green-500/10 border border-green-500/30 text-green-400"
                : "bg-red-500/10 border border-red-500/30 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
