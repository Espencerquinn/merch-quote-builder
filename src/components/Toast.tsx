import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error";
}

let nextId = 0;
let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function toast(message: string, type: "success" | "error" = "success") {
  const id = nextId++;
  toasts = [...toasts, { id, message, type }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, 4000);
}

toast.success = (message: string) => toast(message, "success");
toast.error = (message: string) => toast(message, "error");

function useToasts() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => toasts,
  );
}

export function Toaster() {
  const items = useToasts();

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
      {items.map((t) => (
        <ToastCard key={t.id} item={t} />
      ))}
    </div>
  );
}

function ToastCard({ item }: { item: ToastItem }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== item.id);
      notify();
    }, 200);
  }, [item.id]);

  const isError = item.type === "error";
  const Icon = isError ? XCircle : CheckCircle;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border bg-white text-sm max-w-sm transition-all duration-200 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      } ${isError ? "border-red-200" : "border-gray-200"}`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${isError ? "text-red-500" : "text-green-500"}`} />
      <span className="text-gray-900 flex-1">{item.message}</span>
      <button onClick={dismiss} className="text-gray-400 hover:text-gray-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
