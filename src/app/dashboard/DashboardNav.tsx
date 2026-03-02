"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Store, ShoppingBag, Settings, Shield } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/products", label: "My Products", icon: Package },
  { href: "/dashboard/stores", label: "My Stores", icon: Store },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardNav({ role }: { role: string }) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {navItems.map((item) => {
        const active = isActive(item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
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

      {role === "admin" && (
        <>
          <div className="border-t border-gray-800 my-3" />
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-yellow-400/70 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
          >
            <Shield className="w-5 h-5" />
            Admin Panel
          </Link>
        </>
      )}
    </nav>
  );
}
