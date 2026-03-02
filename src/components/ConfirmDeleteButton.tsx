"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function ConfirmDeleteButton({
  endpoint,
  label = "Delete",
  className,
}: {
  endpoint: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className={
        className ??
        `flex items-center gap-1.5 text-sm transition-colors ${
          confirming
            ? "text-red-400 hover:text-red-300 font-medium"
            : "text-gray-500 hover:text-red-400"
        }`
      }
    >
      <Trash2 className="w-3.5 h-3.5" />
      {deleting ? "..." : confirming ? "Confirm?" : label}
    </button>
  );
}
