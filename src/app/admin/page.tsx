import { db } from "@/lib/db";
import { users, decoratedProducts, orders, stores, cachedProducts, quotes } from "@/lib/db/schema";
import { count, sum, sql } from "drizzle-orm";
import { Users, Package, ShoppingBag, Store, Database, FileText, DollarSign } from "lucide-react";
import { formatCentsLocale } from "@/lib/format";
import Link from "next/link";

export default async function AdminOverviewPage() {
  const [[userCount], [productCount], [orderCount], [storeCount], [cachedCount], [quoteCount]] =
    await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(decoratedProducts),
      db.select({ count: count() }).from(orders),
      db.select({ count: count() }).from(stores),
      db.select({ count: count() }).from(cachedProducts),
      db.select({ count: count() }).from(quotes),
    ]);

  const [revenueResult] = await db
    .select({ total: sum(orders.totalAmount) })
    .from(orders);
  const totalRevenueCents = Number(revenueResult?.total || 0);

  const stats = [
    { label: "Users", value: userCount.count, icon: Users, href: "/admin/users", color: "blue" },
    { label: "Decorated Products", value: productCount.count, icon: Package, href: "/admin/products", color: "purple" },
    { label: "Orders", value: orderCount.count, icon: ShoppingBag, href: "/admin/orders", color: "green" },
    { label: "Stores", value: storeCount.count, icon: Store, href: "/admin/orders", color: "orange" },
    { label: "Cached Products", value: cachedCount.count, icon: Database, href: "/admin/providers", color: "teal" },
    { label: "Quotes", value: quoteCount.count, icon: FileText, href: "/admin/quotes", color: "pink" },
  ];

  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: "bg-blue-100", text: "text-blue-600" },
    purple: { bg: "bg-purple-100", text: "text-purple-600" },
    green: { bg: "bg-green-100", text: "text-green-600" },
    orange: { bg: "bg-orange-100", text: "text-orange-600" },
    teal: { bg: "bg-teal-100", text: "text-teal-600" },
    pink: { bg: "bg-pink-100", text: "text-pink-600" },
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-gray-500 mt-1">System-wide stats and management</p>
      </div>

      {/* Revenue Banner */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 mb-8 text-white">
        <div className="flex items-center gap-3 mb-1">
          <DollarSign className="w-5 h-5 opacity-80" />
          <span className="text-sm font-medium opacity-80">Total Revenue</span>
        </div>
        <p className="text-4xl font-bold">
          {formatCentsLocale(totalRevenueCents)}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => {
          const colors = colorMap[stat.color];
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${colors.text}`} />
                </div>
                <span className="text-3xl font-bold text-gray-900">{stat.value}</span>
              </div>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
