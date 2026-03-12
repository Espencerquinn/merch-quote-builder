import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Database, Package, Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { formatCents } from "@/lib/format";

export const Route = createFileRoute("/admin/products/")({
  component: AdminProductsPage,
});

interface CachedProduct {
  compound_id: string;
  provider_id: string;
  name: string;
  product_type: string | null;
  thumbnail_url: string | null;
  base_price_cents: number | null;
  currency: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  enriched_at: string | null;
}

interface DecoratedProductRow {
  id: string;
  name: string | null;
  base_product_id: string | null;
  status: string | null;
  created_at: string;
  user_id: string | null;
  users: { name: string | null; email: string } | null;
}

const PAGE_SIZE = 50;

function AdminProductsPage() {
  const [cachedProducts, setCachedProducts] = useState<CachedProduct[]>([]);
  const [decoratedProducts, setDecoratedProducts] = useState<DecoratedProductRow[]>([]);
  const [totalCached, setTotalCached] = useState(0);
  const [activeCached, setActiveCached] = useState(0);
  const [inactiveCached, setInactiveCached] = useState(0);
  const [totalDecorated, setTotalDecorated] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [page]);

  async function loadData() {
    setLoading(true);

    const [
      totalRes,
      activeRes,
      inactiveRes,
      decoratedRes,
      decoratedCountRes,
      productsRes,
      catRes,
    ] = await Promise.all([
      supabase.from("products").select("compound_id", { count: "exact", head: true }),
      supabase.from("products").select("compound_id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("products").select("compound_id", { count: "exact", head: true }).eq("is_active", false),
      supabase
        .from("decorated_products")
        .select("id, name, base_product_id, status, created_at, user_id, users(name, email)")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("decorated_products").select("id", { count: "exact", head: true }),
      supabase
        .from("products")
        .select("compound_id, provider_id, name, product_type, thumbnail_url, base_price_cents, currency, is_active, last_synced_at, enriched_at")
        .order("name")
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
      supabase
        .from("products")
        .select("product_type")
        .eq("is_active", true)
        .not("product_type", "is", null)
        .not("product_type", "eq", ""),
    ]);

    setTotalCached(totalRes.count ?? 0);
    setActiveCached(activeRes.count ?? 0);
    setInactiveCached(inactiveRes.count ?? 0);
    setTotalDecorated(decoratedCountRes.count ?? 0);
    setCachedProducts(productsRes.data || []);
    setDecoratedProducts((decoratedRes.data as DecoratedProductRow[]) || []);

    // Extract unique categories
    const uniqueCats = Array.from(new Set((catRes.data || []).map((r) => r.product_type).filter(Boolean))) as string[];
    setCategories(uniqueCats.sort());

    setLoading(false);
  }

  const handleToggleActive = async (compoundId: string, currentActive: boolean) => {
    setTogglingId(compoundId);
    const { error } = await supabase
      .from("products")
      .update({ is_active: !currentActive })
      .eq("compound_id", compoundId);

    if (!error) {
      setCachedProducts((prev) =>
        prev.map((p) => (p.compound_id === compoundId ? { ...p, is_active: !currentActive } : p))
      );
      setActiveCached((prev) => prev + (currentActive ? -1 : 1));
      setInactiveCached((prev) => prev + (currentActive ? 1 : -1));
    }
    setTogglingId(null);
  };

  const filteredProducts = useMemo(() => {
    let filtered = cachedProducts;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.compound_id.toLowerCase().includes(q) ||
          (p.product_type || "").toLowerCase().includes(q)
      );
    }
    if (categoryFilter) {
      filtered = filtered.filter((p) => p.product_type === categoryFilter);
    }
    return filtered;
  }, [cachedProducts, searchQuery, categoryFilter]);

  const totalPages = Math.ceil(totalCached / PAGE_SIZE);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Products</h1>

      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-4 h-4 text-teal-500" />
            <span className="text-sm text-gray-500">Total Cached</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalCached}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-500">Active</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{activeCached}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">Inactive</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{inactiveCached}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-gray-500">Decorated</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalDecorated}</p>
          <p className="text-xs text-gray-400 mt-1">User-created designs</p>
        </div>
      </div>

      {/* Cached Products Table */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cached Products</h2>

        {/* Search & Filter */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map((p) => (
                  <tr key={p.compound_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {p.thumbnail_url ? (
                          <img src={p.thumbnail_url} alt="" loading="lazy" className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-300" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{p.compound_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{p.provider_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{p.product_type || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {p.base_price_cents ? `${formatCents(p.base_price_cents)} ${p.currency || ""}` : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(p.compound_id, p.is_active)}
                        disabled={togglingId === p.compound_id}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          p.is_active ? "bg-green-500" : "bg-gray-300"
                        } disabled:opacity-50`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            p.is_active ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} ({totalCached} total)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Decorated Products Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Decorated Products</h2>
        </div>
        {decoratedProducts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No decorated products yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Base</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {decoratedProducts.map((dp) => (
                  <tr key={dp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{dp.name || "—"}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{dp.users?.name || "—"}</p>
                      <p className="text-xs text-gray-500">{dp.users?.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{dp.base_product_id}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          dp.status === "published"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {dp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(dp.created_at).toLocaleDateString()}
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
