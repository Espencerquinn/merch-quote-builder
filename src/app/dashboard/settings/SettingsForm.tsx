"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsForm({
  initialName,
  email,
}: {
  initialName: string;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Profile updated successfully." });
        router.refresh();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to update profile." });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords don't match." });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/account/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Password changed successfully." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to change password." });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-500/10 border border-green-500/30 text-green-400"
              : "bg-red-500/10 border border-red-500/30 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Profile */}
      <form onSubmit={handleProfileUpdate} className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-gray-500 text-sm cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={saving || name === initialName}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      {/* Password */}
      <form onSubmit={handlePasswordChange} className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Change Password</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !currentPassword || !newPassword}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {saving ? "Changing..." : "Change Password"}
          </button>
        </div>
      </form>
    </div>
  );
}
