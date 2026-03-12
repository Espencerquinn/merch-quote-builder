import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Store } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/lib/supabase/client";

export const Route = createFileRoute("/dashboard/stores/new")({
  component: NewStorePage,
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function NewStorePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugEdited(true);
    setSlug(slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setError("Name and slug are required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("stores")
      .insert({
        id: crypto.randomUUID(),
        user_id: user!.id,
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.message.includes("duplicate") || insertError.message.includes("unique")) {
        setError("This slug is already taken. Please choose a different one.");
      } else {
        setError(insertError.message);
      }
      setSubmitting(false);
      return;
    }

    navigate({ to: "/dashboard/stores/$storeId", params: { storeId: data.id } });
  }

  return (
    <div className="p-8 max-w-xl">
      <Link
        to="/dashboard/stores"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Stores
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
          <Store className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Create Store</h1>
          <p className="text-gray-400 text-sm">Set up your new merch storefront.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Store Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My Awesome Store"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Slug <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center">
              <input
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="my-awesome-store"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Your store will be at{" "}
              <span className="text-gray-400">{slug || "your-slug"}.merchmakers.com</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell customers what your store is about..."
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600 resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !name.trim() || !slug.trim()}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Store className="w-5 h-5" />
          {submitting ? "Creating..." : "Create Store"}
        </button>
      </form>
    </div>
  );
}
