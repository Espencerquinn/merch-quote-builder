"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PublishToggle({
  storeId,
  isPublished,
}: {
  storeId: string;
  isPublished: boolean;
}) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);

  const toggle = async () => {
    setPublishing(true);
    try {
      await fetch(`/api/stores/${storeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !isPublished }),
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to update:", error);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={publishing}
      className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
        isPublished
          ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
          : "bg-green-600 text-white hover:bg-green-700"
      }`}
    >
      {publishing ? "..." : isPublished ? "Unpublish" : "Publish Store"}
    </button>
  );
}
