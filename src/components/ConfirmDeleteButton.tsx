import { useState, useRef, useEffect } from "react";
import { Trash2 } from "lucide-react";

export default function ConfirmDeleteButton({
  onDelete,
  label = "Delete",
  className,
}: {
  onDelete: () => Promise<void>;
  label?: string;
  className?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setConfirming(false), 3000);
      return;
    }

    setDeleting(true);
    try {
      await onDelete();
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
