import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield, LayoutDashboard, Package, Users, ShoppingBag, Database, FileText } from "lucide-react";
import AdminNav from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="px-5 py-4 border-b border-gray-200">
          <Link href="/admin" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-yellow-500" />
            <span className="text-lg font-bold text-gray-900">Admin</span>
          </Link>
        </div>

        <AdminNav />

        <div className="mt-auto border-t border-gray-200 p-4">
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
