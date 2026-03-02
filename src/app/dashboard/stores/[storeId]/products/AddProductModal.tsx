"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, ChevronDown, Package } from "lucide-react";

interface AvailableProduct {
  id: string;
  name: string;
  baseProductId: string;
  selectedColourId: string;
  thumbnailUrl: string | null;
}

function ProductThumb({ src, size = "md" }: { src: string | null; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-7 h-7" : "w-8 h-8";
  const iconDim = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  return (
    <div className={`${dim} rounded bg-gray-900 flex-shrink-0 flex items-center justify-center overflow-hidden`}>
      {src ? (
        <img src={src} alt="" className="w-full h-full object-cover" />
      ) : (
        <Package className={`${iconDim} text-gray-700`} />
      )}
    </div>
  );
}

function ProductOption({
  product,
  isSelected,
  onClick,
}: {
  product: AvailableProduct;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-700/50 transition-colors ${
        isSelected ? "bg-gray-700/50" : ""
      }`}
    >
      <ProductThumb src={product.thumbnailUrl} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white truncate">{product.name}</p>
        <p className="text-xs text-gray-500 truncate">
          {product.selectedColourId} &middot; {product.baseProductId}
        </p>
      </div>
    </button>
  );
}

export default function AddProductModal({
  storeId,
  availableProducts,
}: {
  storeId: string;
  availableProducts: AvailableProduct[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [markupValue, setMarkupValue] = useState("50");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => availableProducts.find((p) => p.id === selectedId),
    [availableProducts, selectedId]
  );

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  const handleAdd = async () => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/stores/${storeId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decoratedProductId: selectedId,
          markupType: "percentage",
          markupValue: parseInt(markupValue, 10),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add product");
        return;
      }

      setOpen(false);
      setSelectedId("");
      setMarkupValue("50");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (availableProducts.length === 0 && !open) {
    return (
      <span className="text-sm text-gray-500">
        No products available to add
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Product
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-semibold text-white mb-4">Add Product to Store</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Select Product
                </label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-left flex items-center gap-3 focus:outline-none focus:border-blue-500"
                  >
                    {selected ? (
                      <>
                        <ProductThumb src={selected.thumbnailUrl} size="sm" />
                        <div className="min-w-0 flex-1">
                          <span className="text-white truncate block">{selected.name}</span>
                          <span className="text-xs text-gray-500">{selected.selectedColourId}</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-500">Choose a product...</span>
                    )}
                    <ChevronDown className="w-4 h-4 text-gray-500 ml-auto flex-shrink-0" />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {availableProducts.map((p) => (
                        <ProductOption
                          key={p.id}
                          product={p}
                          isSelected={selectedId === p.id}
                          onClick={() => {
                            setSelectedId(p.id);
                            setDropdownOpen(false);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Markup Percentage
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={markupValue}
                    onChange={(e) => setMarkupValue(e.target.value)}
                    className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-gray-400 text-sm">%</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Your profit margin on each sale
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              <button
                onClick={handleAdd}
                disabled={!selectedId || loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {loading ? "Adding..." : "Add to Store"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
