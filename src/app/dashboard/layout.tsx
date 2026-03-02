import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Shirt, LayoutDashboard, Package, Store, ShoppingBag, Settings, LogOut } from "lucide-react";
import DashboardNav from "./DashboardNav";
import ClaimDesignProvider from "./ClaimDesignProvider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 flex flex-col flex-shrink-0">
        <div className="px-6 py-4 border-b border-gray-800">
          <Link href="/" className="flex items-center gap-2">
            <Shirt className="w-7 h-7 text-blue-400" />
            <span className="text-lg font-bold text-white">Merch Makers</span>
          </Link>
        </div>

        <DashboardNav role={session.user.role} />

        <div className="mt-auto border-t border-gray-800 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {(session.user.name || session.user.email || "U")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {session.user.name || "User"}
              </p>
              <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
            </div>
          </div>
          <form
            action={async () => {
              "use server";
              const { signOut } = await import("@/lib/auth");
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors w-full px-2 py-1.5 rounded hover:bg-gray-800"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <ClaimDesignProvider />
        {children}
      </main>
    </div>
  );
}
