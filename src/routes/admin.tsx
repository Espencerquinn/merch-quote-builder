import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { Shield, LayoutDashboard, Package, Database, FileText, Users, ShoppingBag } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const adminNavItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/providers", label: "Providers", icon: Database },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/quotes", label: "Quotes", icon: FileText },
];

function AdminLayout() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    } else if (!loading && user && !isAdmin) {
      navigate({ to: "/dashboard" });
    }
  }, [user, loading, isAdmin, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-500 mb-6">You do not have admin privileges.</p>
          <Link to="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="px-5 py-4 border-b border-gray-200">
          <Link to="/admin" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-yellow-500" />
            <span className="text-lg font-bold text-gray-900">Admin</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {adminNavItems.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-yellow-50 text-yellow-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-gray-200 p-4">
          <Link
            to="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            &larr; Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
