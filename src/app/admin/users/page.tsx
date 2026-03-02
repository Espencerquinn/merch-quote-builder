import { db } from "@/lib/db";
import { users, decoratedProducts, stores, orders } from "@/lib/db/schema";
import { desc, eq, count, sql } from "drizzle-orm";
import RoleToggle from "./RoleToggle";

export default async function AdminUsersPage() {
  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
      productCount: sql<number>`(SELECT COUNT(*) FROM decorated_products WHERE user_id = ${users.id})`,
      storeCount: sql<number>`(SELECT COUNT(*) FROM stores WHERE user_id = ${users.id})`,
      orderCount: sql<number>`(SELECT COUNT(*) FROM orders WHERE user_id = ${users.id})`,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">{allUsers.length} registered user{allUsers.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {allUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No users yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Products</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stores</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-medium">
                          {(user.name || user.email || "U")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name || "—"}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === "admin"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{user.productCount}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{user.storeCount}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{user.orderCount}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <RoleToggle userId={user.id} currentRole={user.role} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
