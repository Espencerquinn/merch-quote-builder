import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Users, Package, ShoppingBag, Store, Database, FileText, DollarSign, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { formatCentsLocale } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  component: AdminOverviewPage,
});

interface StatItem {
  label: string;
  value: number;
  icon: typeof Users;
  href: string;
  color: string;
}

const colorMap: Record<string, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-100", text: "text-blue-600" },
  purple: { bg: "bg-purple-100", text: "text-purple-600" },
  green: { bg: "bg-green-100", text: "text-green-600" },
  orange: { bg: "bg-orange-100", text: "text-orange-600" },
  teal: { bg: "bg-teal-100", text: "text-teal-600" },
  pink: { bg: "bg-pink-100", text: "text-pink-600" },
};

function AdminOverviewPage() {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [totalRevenueCents, setTotalRevenueCents] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);

      const [usersRes, productsRes, ordersRes, storesRes, cachedRes, quotesRes, revenueRes] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase.from("decorated_products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("stores").select("id", { count: "exact", head: true }),
        supabase.from("products").select("compound_id", { count: "exact", head: true }),
        supabase.from("quotes").select("id", { count: "exact", head: true }),
        supabase.rpc("sum_order_revenue"),
      ]);

      setTotalRevenueCents(revenueRes.data ?? 0);

      setStats([
        { label: "Users", value: usersRes.count ?? 0, icon: Users, href: "/admin/users", color: "blue" },
        { label: "Decorated Products", value: productsRes.count ?? 0, icon: Package, href: "/admin/products", color: "purple" },
        { label: "Orders", value: ordersRes.count ?? 0, icon: ShoppingBag, href: "/admin/orders", color: "green" },
        { label: "Stores", value: storesRes.count ?? 0, icon: Store, href: "/admin/orders", color: "orange" },
        { label: "Cached Products", value: cachedRes.count ?? 0, icon: Database, href: "/admin/providers", color: "teal" },
        { label: "Quotes", value: quotesRes.count ?? 0, icon: FileText, href: "/admin/quotes", color: "pink" },
      ]);

      setLoading(false);
    }

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

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
        <p className="text-4xl font-bold">{formatCentsLocale(totalRevenueCents)}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => {
          const colors = colorMap[stat.color];
          return (
            <Link
              key={stat.label}
              to={stat.href}
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
