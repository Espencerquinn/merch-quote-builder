import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Package, Store, ShoppingBag } from "lucide-react";
import { db } from "@/lib/db";
import { decoratedProducts, orders, stores } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.id;

  const [[productCount], [orderCount], [storeCount]] = await Promise.all([
    db.select({ count: count() }).from(decoratedProducts).where(eq(decoratedProducts.userId, userId)),
    db.select({ count: count() }).from(orders).where(eq(orders.userId, userId)),
    db.select({ count: count() }).from(stores).where(eq(stores.userId, userId)),
  ]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {session.user.name || "there"}
        </h1>
        <p className="text-gray-400 mt-2">
          Manage your decorated products, stores, and orders.
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Link
          href="/dashboard/products"
          className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 hover:border-blue-500/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-3xl font-bold text-white">{productCount.count}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-400">Decorated Products</h3>
        </Link>

        <Link
          href="/dashboard/orders"
          className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 hover:border-blue-500/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-3xl font-bold text-white">{orderCount.count}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-400">Orders</h3>
        </Link>

        <Link
          href="/dashboard/stores"
          className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 hover:border-blue-500/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-3xl font-bold text-white">{storeCount.count}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-400">Stores</h3>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Link
            href="/products"
            className="flex items-center gap-4 bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-blue-500/50 transition-colors group"
          >
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
              <Plus className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Create New Product</h3>
              <p className="text-xs text-gray-400">Browse catalog and design a new product</p>
            </div>
          </Link>

          <Link
            href="/dashboard/stores"
            className="flex items-center gap-4 bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-blue-500/50 transition-colors group"
          >
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
              <Store className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Create a Store</h3>
              <p className="text-xs text-gray-400">Launch your own merch storefront</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
