import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { Shirt, LayoutDashboard, Package, Store, ShoppingBag, Settings, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/products", label: "My Products", icon: Package },
  { href: "/dashboard/stores", label: "My Stores", icon: Store },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function DashboardLayout() {
  const { user, loading, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", search: { callbackUrl: location.pathname } });
    }
  }, [user, loading, navigate, location.pathname]);

  // Claim anonymous designs on login
  useEffect(() => {
    if (!user) return;
    const claimToken = localStorage.getItem("claimToken");
    if (!claimToken) return;

    supabase.functions.invoke("claim-design", {
      body: { token: claimToken },
    }).then(() => {
      localStorage.removeItem("claimToken");
    }).catch(() => {});
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
      </div>
    );
  }

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      <aside className="w-64 border-r border-gray-800 flex flex-col flex-shrink-0">
        <div className="px-6 py-4 border-b border-gray-800">
          <Link to="/" className="flex items-center gap-2">
            <Shirt className="w-7 h-7 text-blue-400" />
            <span className="text-lg font-bold text-white">Merch Makers</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <>
              <div className="border-t border-gray-800 my-3" />
              <Link
                to="/admin"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-yellow-400/70 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
              >
                <Shield className="w-5 h-5" />
                Admin Panel
              </Link>
            </>
          )}
        </nav>

        <div className="mt-auto border-t border-gray-800 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {(user.user_metadata?.name || user.email || "U")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.user_metadata?.name || "User"}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors w-full px-2 py-1.5 rounded hover:bg-gray-800"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
