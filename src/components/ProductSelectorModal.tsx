'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Search, ChevronRight, Loader2, Package } from 'lucide-react';
import type { ProductSummary } from '@/lib/providers/types';

interface ProductSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (compoundId: string) => void;
}

// Product types we care about, in display order
const PRODUCT_TYPE_ORDER = [
  'T-Shirts',
  'Longsleeve T-Shirts',
  'Singlets / Tanks',
  'Hooded Sweatshirts',
  'Crew Sweatshirts',
  'Zip Sweatshirts',
  'Shorts',
  'Trackpants',
  'Dresses',
  'Shirts',
  'Headwear',
  'Bags',
  'Aprons',
  'Socks',
  'Underwear',
  'Gadgets',
  'Stickers',
  'Belts',
  'Flags',
  'Tea Towels',
];

export default function ProductSelectorModal({
  isOpen,
  onClose,
  onSelectProduct,
}: ProductSelectorModalProps) {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const fetchAllProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setProducts(data.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && products.length === 0) {
      fetchAllProducts();
    }
  }, [isOpen, products.length, fetchAllProducts]);

  if (!isOpen) return null;

  // Group products by type
  const productsByType: Record<string, ProductSummary[]> = {};
  products.forEach(p => {
    const type = p.productType || 'Other';
    if (!productsByType[type]) productsByType[type] = [];
    productsByType[type].push(p);
  });

  // Get sorted types
  const availableTypes = Object.keys(productsByType).sort((a, b) => {
    const idxA = PRODUCT_TYPE_ORDER.indexOf(a);
    const idxB = PRODUCT_TYPE_ORDER.indexOf(b);
    if (idxA === -1 && idxB === -1) return a.localeCompare(b);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  // Filter products
  const displayProducts = selectedType === 'all'
    ? products
    : productsByType[selectedType] || [];

  const filteredProducts = searchQuery
    ? displayProducts.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : displayProducts;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Change product</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {products.length} products available
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Product Types */}
          <div className="w-56 border-r border-gray-200 overflow-y-auto p-3 space-y-0.5 flex-shrink-0">
            <button
              onClick={() => setSelectedType('all')}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                selectedType === 'all'
                  ? 'bg-gray-900 text-white font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span>All products</span>
              </div>
              <span className={`text-xs ${selectedType === 'all' ? 'text-gray-300' : 'text-gray-400'}`}>
                {products.length}
              </span>
            </button>

            <div className="border-t border-gray-200 my-2" />

            {availableTypes.map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                  selectedType === type
                    ? 'bg-gray-900 text-white font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="truncate">{type}</span>
                <div className="flex items-center gap-1">
                  <span className={`text-xs ${selectedType === type ? 'text-gray-300' : 'text-gray-400'}`}>
                    {productsByType[type]?.length || 0}
                  </span>
                  <ChevronRight className={`w-3 h-3 ${selectedType === type ? 'text-gray-300' : 'text-gray-400'}`} />
                </div>
              </button>
            ))}

            {/* Loading indicator */}
            {loading && (
              <>
                <div className="border-t border-gray-200 my-2" />
                <p className="px-3 py-2 text-sm text-gray-400">Loading all products...</p>
              </>
            )}
          </div>

          {/* Right Content - Product Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Search */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or style code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Loading state */}
            {loading && products.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                <p className="text-sm">Loading products...</p>
              </div>
            )}

            {/* Product Grid */}
            {filteredProducts.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => {
                      onSelectProduct(product.id);
                      onClose();
                    }}
                    className="group flex flex-col items-start p-3 border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all text-left"
                  >
                    <div className="w-full aspect-[3/4] bg-gray-50 rounded-lg overflow-hidden mb-3">
                      {product.thumbnailUrl ? (
                        <img
                          src={product.thumbnailUrl}
                          alt={product.name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Package className="w-10 h-10" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 leading-tight line-clamp-2">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{product.productType}</p>
                    {product.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{product.description}</p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && filteredProducts.length === 0 && products.length > 0 && (
              <div className="text-center py-12 text-gray-500">
                No products found matching &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
