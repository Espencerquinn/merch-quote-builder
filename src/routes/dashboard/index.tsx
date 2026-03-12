import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, Package, Store, ShoppingBag, Check, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/lib/supabase/client";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ products: 0, orders: 0, stores: 0 });

  useEffect(() => {
    async function loadCounts() {
      const [products, orders, stores] = await Promise.all([
        supabase.from("decorated_products").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("stores").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      ]);
      setCounts({
        products: products.count ?? 0,
        orders: orders.count ?? 0,
        stores: stores.count ?? 0,
      });
    }
    if (user) loadCounts();
  }, [user]);

  const isNewUser = counts.products === 0 && counts.orders === 0 && counts.stores === 0;

  const gettingStartedSteps = [
    {
      number: 1,
      title: "Browse & Design",
      description: "Browse the product catalog and create your first decorated product.",
      href: "/products",
      buttonLabel: "Browse Products",
      done: counts.products > 0,
    },
    {
      number: 2,
      title: "Create Your Store",
      description: "Set up your storefront with your brand colors and logo.",
      href: "/dashboard/stores/new",
      buttonLabel: "Create Store",
      done: counts.stores > 0,
    },
    {
      number: 3,
      title: "Start Selling",
      description: "Add products to your store, publish it, and share with customers.",
      href: "/dashboard/stores",
      buttonLabel: "Manage Stores",
      done: counts.orders > 0,
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {user?.user_metadata?.name || "there"}
        </h1>
        <p className="text-gray-400 mt-2">Manage your decorated products, stores, and orders.</p>
      </div>

      {isNewUser && (
        <div className="mb-8 bg-gray-800/50 rounded-2xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-1">Getting Started</h2>
          <p className="text-sm text-gray-400 mb-6">Follow these steps to launch your first merch store.</p>
          <div className="flex flex-col gap-4">
            {gettingStartedSteps.map((step) => (
              <div
                key={step.number}
                className="flex items-start gap-4 rounded-xl bg-gray-900/50 border border-gray-700 p-4"
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step.done
                      ? "bg-green-500/20 text-green-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  {step.done ? <Check className="w-4 h-4" /> : step.number}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-semibold ${step.done ? "text-gray-500 line-through" : "text-white"}`}>
                    {step.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">{step.description}</p>
                </div>
                {!step.done && (
                  <Link
                    to={step.href}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                  >
                    {step.buttonLabel}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {[
          { href: "/dashboard/products", icon: Package, color: "purple", count: counts.products, label: "Decorated Products" },
          { href: "/dashboard/orders", icon: ShoppingBag, color: "green", count: counts.orders, label: "Orders" },
          { href: "/dashboard/stores", icon: Store, color: "blue", count: counts.stores, label: "Stores" },
        ].map((stat) => (
          <Link
            key={stat.href}
            to={stat.href}
            className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 hover:border-blue-500/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 bg-${stat.color}-500/20 rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
              </div>
              <span className="text-3xl font-bold text-white">{stat.count}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-400">{stat.label}</h3>
          </Link>
        ))}
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Link
            to="/products"
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
            to="/dashboard/stores/new"
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
