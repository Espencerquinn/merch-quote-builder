"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Users, ShoppingBag, Database, FileText, DollarSign } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/pricing", label: "Pricing", icon: DollarSign },
  { href: "/admin/providers", label: "Providers", icon: Database },
  { href: "/admin/quotes", label: "Quotes", icon: FileText },
];

export default function AdminNav() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      {navItems.map((item) => {
        const active = isActive(item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active
                ? "bg-yellow-50 text-yellow-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <item.icon className="w-4.5 h-4.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
