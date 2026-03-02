import { db } from "@/lib/db";
import { cachedProducts, decoratedProducts, users } from "@/lib/db/schema";
import { desc, count, eq } from "drizzle-orm";
import { Package, Database } from "lucide-react";

export default async function AdminProductsPage() {
  // Run all queries in parallel
  const [cached, [cachedTotal], decorated, [decoratedTotal]] = await Promise.all([
    db
      .select({
        compoundId: cachedProducts.compoundId,
        name: cachedProducts.name,
        providerId: cachedProducts.providerId,
        productType: cachedProducts.productType,
        lastSyncedAt: cachedProducts.lastSyncedAt,
      })
      .from(cachedProducts)
      .orderBy(desc(cachedProducts.lastSyncedAt))
      .limit(100),
    db.select({ count: count() }).from(cachedProducts),
    db
      .select({
        product: {
          id: decoratedProducts.id,
          name: decoratedProducts.name,
          baseProductId: decoratedProducts.baseProductId,
          status: decoratedProducts.status,
          createdAt: decoratedProducts.createdAt,
        },
        userName: users.name,
        userEmail: users.email,
      })
      .from(decoratedProducts)
      .leftJoin(users, eq(decoratedProducts.userId, users.id))
      .orderBy(desc(decoratedProducts.createdAt))
      .limit(100),
    db.select({ count: count() }).from(decoratedProducts),
  ]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Products</h1>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-4 h-4 text-teal-500" />
            <span className="text-sm text-gray-500">Cached Products</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{cachedTotal.count}</p>
          <p className="text-xs text-gray-400 mt-1">From product providers</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-gray-500">Decorated Products</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{decoratedTotal.count}</p>
          <p className="text-xs text-gray-400 mt-1">User-created designs</p>
        </div>
      </div>

      {/* Decorated Products Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Decorated Products</h2>
        </div>
        {decorated.length === 0 ? (
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
                {decorated.map(({ product, userName, userEmail }) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{userName || "—"}</p>
                      <p className="text-xs text-gray-500">{userEmail}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{product.baseProductId}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.status === "published"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(product.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cached Products Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Cached Products (Latest 100)</h2>
        </div>
        {cached.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No cached products. Run a sync from the Providers page.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Synced</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cached.map((p) => (
                  <tr key={p.compoundId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{p.compoundId}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 truncate max-w-xs">{p.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{p.providerId}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{p.productType || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {(() => {
                        if (!p.lastSyncedAt) return "—";
                        const d = new Date(p.lastSyncedAt);
                        return d.getTime() === 0 ? "—" : d.toLocaleString();
                      })()}
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
