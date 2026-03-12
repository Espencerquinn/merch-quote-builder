import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { Shirt } from "lucide-react";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <header className="px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <Link to="/" className="flex items-center gap-2 w-fit">
            <Shirt className="w-8 h-8 text-blue-400" />
            <span className="text-xl font-bold text-white">Merch Makers</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <Outlet />
      </main>
    </div>
  );
}
