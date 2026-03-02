import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { stores, storeProducts } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { ArrowLeft, Package, Palette, ExternalLink, Globe, Plug } from "lucide-react";
import PublishToggle from "./PublishToggle";

export default async function StoreManagementPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { storeId } = await params;

  const store = await db.query.stores.findFirst({
    where: and(eq(stores.id, storeId), eq(stores.userId, session.user.id)),
  });

  if (!store) notFound();

  const [productCount] = await db
    .select({ count: count() })
    .from(storeProducts)
    .where(eq(storeProducts.storeId, storeId));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const storeUrl = `${appUrl}/store/${store.slug}`;

  return (
    <div className="p-8 max-w-4xl">
      <Link
        href="/dashboard/stores"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Stores
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{store.name}</h1>
          <p className="text-gray-500 text-sm mt-1">/store/{store.slug}</p>
          {store.description && (
            <p className="text-gray-400 mt-2">{store.description}</p>
          )}
        </div>
        <PublishToggle storeId={store.id} isPublished={store.isPublished} />
      </div>

      {/* Store URL */}
      {store.isPublished && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400">Your store is live at</span>
          </div>
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-green-400 hover:text-green-300 font-medium"
          >
            {storeUrl}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        <Link
          href={`/dashboard/stores/${storeId}/products`}
          className="bg-gray-800/50 rounded-xl border border-gray-700 p-5 hover:border-blue-500/50 transition-colors group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Package className="w-4.5 h-4.5 text-purple-400" />
            </div>
            <span className="text-2xl font-bold text-white">{productCount.count}</span>
          </div>
          <p className="text-sm text-gray-400 group-hover:text-gray-300">
            Manage Products
          </p>
        </Link>

        <Link
          href={`/dashboard/stores/${storeId}/editor`}
          className="bg-gray-800/50 rounded-xl border border-gray-700 p-5 hover:border-blue-500/50 transition-colors group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Palette className="w-4.5 h-4.5 text-blue-400" />
            </div>
          </div>
          <p className="text-sm text-gray-400 group-hover:text-gray-300">
            Customize Store
          </p>
        </Link>

        <Link
          href={`/dashboard/stores/${storeId}/connectors`}
          className="bg-gray-800/50 rounded-xl border border-gray-700 p-5 hover:border-blue-500/50 transition-colors group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <Plug className="w-4.5 h-4.5 text-orange-400" />
            </div>
          </div>
          <p className="text-sm text-gray-400 group-hover:text-gray-300">
            Connectors
          </p>
        </Link>

        <a
          href={storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gray-800/50 rounded-xl border border-gray-700 p-5 hover:border-blue-500/50 transition-colors group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-green-500/20 rounded-lg flex items-center justify-center">
              <ExternalLink className="w-4.5 h-4.5 text-green-400" />
            </div>
          </div>
          <p className="text-sm text-gray-400 group-hover:text-gray-300">
            View Storefront
          </p>
        </a>
      </div>

      {/* Store Details */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Store Details</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-400">Status</dt>
            <dd>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  store.isPublished
                    ? "bg-green-500/20 text-green-400"
                    : "bg-gray-700 text-gray-400"
                }`}
              >
                {store.isPublished ? "Published" : "Draft"}
              </span>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-400">Products</dt>
            <dd className="text-white">{productCount.count}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-400">Created</dt>
            <dd className="text-white">
              {new Date(store.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
