"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";

interface Override {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  blankMarkupPercent: number;
  note: string | null;
}

interface AvailableUser {
  id: string;
  name: string;
  email: string;
}

export default function UserOverrideManager({
  overrides,
  availableUsers,
  defaultMarkup,
}: {
  overrides: Override[];
  availableUsers: AvailableUser[];
  defaultMarkup: number;
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [markupValue, setMarkupValue] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!selectedUserId || !markupValue) return;
    const num = parseInt(markupValue, 10);
    if (isNaN(num) || num < 0 || num > 500) {
      setError("Markup must be 0-500%");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          blankMarkupPercent: num,
          note: note || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add override");
        return;
      }

      setShowAdd(false);
      setSelectedUserId("");
      setMarkupValue("");
      setNote("");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string) => {
    setDeleting(userId);
    try {
      await fetch(`/api/admin/pricing?userId=${userId}`, { method: "DELETE" });
      router.refresh();
    } catch {
      // silent
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      {/* Existing overrides */}
      {overrides.length > 0 ? (
        <div className="divide-y divide-gray-100 mb-6">
          {overrides.map((o) => {
            const discount = defaultMarkup - o.blankMarkupPercent;
            return (
              <div key={o.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {o.userName}{" "}
                    <span className="text-gray-400 font-normal">{o.userEmail}</span>
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-sm text-gray-600">
                      Markup: <strong>{o.blankMarkupPercent}%</strong>
                    </span>
                    {discount > 0 && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        {discount}% discount vs default
                      </span>
                    )}
                    {o.note && (
                      <span className="text-xs text-gray-400">— {o.note}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(o.userId)}
                  disabled={deleting === o.userId}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                >
                  {deleting === o.userId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-400 mb-6">
          No per-user overrides. All users use the default {defaultMarkup}% markup.
        </p>
      )}

      {/* Add override */}
      {showAdd ? (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">User</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select user...</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Markup % (default: {defaultMarkup}%)
              </label>
              <input
                type="number"
                min="0"
                max="500"
                value={markupValue}
                onChange={(e) => setMarkupValue(e.target.value)}
                placeholder={String(defaultMarkup)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. VIP customer, bulk buyer discount"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              onClick={handleAdd}
              disabled={!selectedUserId || !markupValue || saving}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? "Saving..." : "Add Override"}
            </button>
            <button
              onClick={() => { setShowAdd(false); setError(null); }}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add User Override
        </button>
      )}
    </div>
  );
}
