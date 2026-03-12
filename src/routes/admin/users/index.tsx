import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export const Route = createFileRoute("/admin/users/")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const [users, setUsers] = useState<{ id: string; email: string; name: string; role: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("users")
      .select("id, email, name, role, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setUsers(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <Users className="w-6 h-6 text-yellow-500" />
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : users.length === 0 ? (
        <p className="text-gray-500">No users found.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 text-gray-900">{u.name || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.role === "admin" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
