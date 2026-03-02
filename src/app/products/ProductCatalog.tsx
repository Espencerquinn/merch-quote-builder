"use client";

import { useState, useMemo } from "react";
import { Search, Package, ChevronRight } from "lucide-react";
import type { ProductSummary } from "@/lib/providers/types";
import ProductCard from "@/components/ProductCard";

const PRODUCT_TYPE_ORDER = [
  "T-Shirts",
  "Longsleeve T-Shirts",
  "Singlets / Tanks",
  "Hooded Sweatshirts",
  "Crew Sweatshirts",
  "Zip Sweatshirts",
  "Shorts",
  "Trackpants",
  "Dresses",
  "Shirts",
  "Headwear",
  "Bags",
  "Aprons",
  "Socks",
  "Underwear",
  "Gadgets",
  "Stickers",
  "Belts",
  "Flags",
  "Tea Towels",
];

export default function ProductCatalog({ products }: { products: ProductSummary[] }) {
  const [selectedType, setSelectedType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const productsByType = useMemo(() => {
    const grouped: Record<string, ProductSummary[]> = {};
    products.forEach((p) => {
      const type = p.productType || "Other";
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(p);
    });
    return grouped;
  }, [products]);

  const availableTypes = useMemo(() => {
    return Object.keys(productsByType).sort((a, b) => {
      const idxA = PRODUCT_TYPE_ORDER.indexOf(a);
      const idxB = PRODUCT_TYPE_ORDER.indexOf(b);
      if (idxA === -1 && idxB === -1) return a.localeCompare(b);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [productsByType]);

  const filteredProducts = useMemo(() => {
    let list = selectedType === "all" ? products : productsByType[selectedType] || [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, productsByType, selectedType, searchQuery]);

  return (
    <div className="flex gap-8">
      {/* Sidebar - Category Filter */}
      <div className="w-56 flex-shrink-0 hidden md:block">
        <div className="sticky top-6 space-y-1">
          <button
            onClick={() => setSelectedType("all")}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
              selectedType === "all"
                ? "bg-blue-600 text-white font-medium"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span>All products</span>
            </div>
            <span className="text-xs opacity-70">{products.length}</span>
          </button>

          <div className="border-t border-gray-700 my-2" />

          {availableTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                selectedType === type
                  ? "bg-blue-600 text-white font-medium"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span className="truncate">{type}</span>
              <div className="flex items-center gap-1">
                <span className="text-xs opacity-70">
                  {productsByType[type]?.length || 0}
                </span>
                <ChevronRight className="w-3 h-3 opacity-50" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name or style code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-gray-500 mt-2">
              {filteredProducts.length} result{filteredProducts.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Product Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                productType={product.productType}
                description={product.description}
                thumbnailUrl={product.thumbnailUrl}
                href={`/builder?product=${encodeURIComponent(product.id)}`}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">
            {searchQuery
              ? `No products found matching "${searchQuery}"`
              : "No products available"}
          </div>
        )}
      </div>
    </div>
  );
}
