import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { stores, storeProducts } from "@/lib/db/schema";
import { eq, desc, count, sql } from "drizzle-orm";
import { Store, Plus } from "lucide-react";

export default async function DashboardStoresPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userStores = await db
    .select({
      id: stores.id,
      name: stores.name,
      slug: stores.slug,
      description: stores.description,
      logoUrl: stores.logoUrl,
      isPublished: stores.isPublished,
      createdAt: stores.createdAt,
      productCount: sql<number>`(SELECT COUNT(*) FROM store_products WHERE store_id = ${stores.id})`,
    })
    .from(stores)
    .where(eq(stores.userId, session.user.id))
    .orderBy(desc(stores.createdAt));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">My Stores</h1>
          <p className="text-gray-400 mt-1">
            {userStores.length} store{userStores.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/dashboard/stores/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Store
        </Link>
      </div>

      {userStores.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No stores yet</h3>
          <p className="text-gray-400 mb-6 max-w-sm mx-auto">
            Create your own merch storefront and start selling your custom products.
          </p>
          <Link
            href="/dashboard/stores/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Store
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-6">
          {userStores.map((store) => (
            <Link
              key={store.id}
              href={`/dashboard/stores/${store.id}`}
              className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 hover:border-blue-500/50 transition-colors group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {store.logoUrl ? (
                    <img
                      src={store.logoUrl}
                      alt={store.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Store className="w-5 h-5 text-blue-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {store.name}
                    </h3>
                    <p className="text-xs text-gray-500">/store/{store.slug}</p>
                  </div>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    store.isPublished
                      ? "bg-green-500/20 text-green-400"
                      : "bg-gray-700 text-gray-400"
                  }`}
                >
                  {store.isPublished ? "Live" : "Draft"}
                </span>
              </div>

              {store.description && (
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">{store.description}</p>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{store.productCount} product{store.productCount !== 1 ? "s" : ""}</span>
                <span>Created {new Date(store.createdAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
