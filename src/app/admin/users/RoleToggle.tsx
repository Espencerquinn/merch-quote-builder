"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RoleToggle({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: string;
}) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);

  const toggle = async () => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    setUpdating(true);

    try {
      const res = await fetch("/api/admin/users/role", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (res.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to update role:", error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={updating}
      className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400"
    >
      {updating ? "..." : currentRole === "admin" ? "Remove Admin" : "Make Admin"}
    </button>
  );
}
