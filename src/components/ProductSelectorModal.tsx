'use client';

import { useState } from 'react';
import { X, Search, Star, Zap, Sparkles, Truck, Package, TrendingUp, Leaf, Award, ChevronRight } from 'lucide-react';

interface ProductSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (productId: string) => void;
}

type CategoryId = 
  | 'favorites' 
  | 'special-offers' 
  | 'embroidery' 
  | 'all-over-print' 
  | 'fast-delivery' 
  | 'new-products' 
  | 'best-sellers' 
  | 'eco-friendly' 
  | 'high-quality'
  | 'all-products'
  | 'mens-clothing'
  | 'womens-clothing'
  | 'kids-youth'
  | 'hats'
  | 'accessories'
  | 'home-living'
  | 'collections-brands';

interface Category {
  id: CategoryId;
  name: string;
  icon?: React.ComponentType<{ className?: string }>;
  hasSubmenu?: boolean;
}

const FEATURED_CATEGORIES: Category[] = [
  { id: 'favorites', name: 'My favorites', icon: Star },
];

const FILTER_CATEGORIES: Category[] = [
  { id: 'special-offers', name: 'Special offers', icon: Zap },
  { id: 'embroidery', name: 'Embroidery products' },
  { id: 'all-over-print', name: 'All-over print' },
  { id: 'fast-delivery', name: 'Fast delivery', icon: Truck },
  { id: 'new-products', name: 'New products', icon: Package },
  { id: 'best-sellers', name: 'Bestsellers', icon: TrendingUp },
  { id: 'eco-friendly', name: 'Eco-friendly', icon: Leaf },
  { id: 'high-quality', name: 'High quality', icon: Award },
];

const PRODUCT_CATEGORIES: Category[] = [
  { id: 'all-products', name: 'All products' },
  { id: 'mens-clothing', name: "Men's clothing", hasSubmenu: true },
  { id: 'womens-clothing', name: "Women's clothing", hasSubmenu: true },
  { id: 'kids-youth', name: "Kids' & youth clothing", hasSubmenu: true },
  { id: 'hats', name: 'Hats', hasSubmenu: true },
  { id: 'accessories', name: 'Accessories', hasSubmenu: true },
  { id: 'home-living', name: 'Home & living', hasSubmenu: true },
];

const COLLECTIONS_CATEGORIES: Category[] = [
  { id: 'collections-brands', name: 'Collections & brands' },
];

// Sample products for the grid
const SAMPLE_PRODUCTS = [
  { id: 'mens-tshirt', name: "Men's clothing", image: '👕', category: 'mens-clothing' },
  { id: 'womens-hoodie', name: "Women's clothing", image: '👚', category: 'womens-clothing' },
  { id: 'kids-tshirt', name: "Kids' & youth clothing", image: '👶', category: 'kids-youth' },
  { id: 'accessories', name: 'Accessories', image: '🎒', category: 'accessories' },
  { id: 'home-living', name: 'Home & living', image: '🖼️', category: 'home-living' },
  { id: 'hats', name: 'Hats', image: '🧢', category: 'hats' },
  { id: 'collections', name: 'Collections', image: '👔', category: 'collections-brands' },
  { id: 'brands', name: 'Brands', image: '🏷️', category: 'collections-brands' },
  { id: 'all', name: 'All products', image: '📦', category: 'all-products' },
];

// Detailed products for when a category is selected
const DETAILED_PRODUCTS = {
  'mens-clothing': [
    { id: 'classic-tee', name: 'Classic T-Shirt', price: '$8.50', image: '👕' },
    { id: 'premium-tee', name: 'Premium T-Shirt', price: '$12.00', image: '👕' },
    { id: 'hoodie', name: 'Pullover Hoodie', price: '$24.00', image: '🧥' },
    { id: 'polo', name: 'Polo Shirt', price: '$18.00', image: '👔' },
    { id: 'tank', name: 'Tank Top', price: '$7.00', image: '🎽' },
    { id: 'longsleeve', name: 'Long Sleeve Tee', price: '$14.00', image: '👕' },
  ],
  'womens-clothing': [
    { id: 'fitted-tee', name: 'Fitted T-Shirt', price: '$9.00', image: '👚' },
    { id: 'crop-top', name: 'Crop Top', price: '$11.00', image: '👙' },
    { id: 'womens-hoodie', name: 'Relaxed Hoodie', price: '$26.00', image: '🧥' },
    { id: 'tank-top', name: 'Racerback Tank', price: '$8.00', image: '🎽' },
  ],
  'hats': [
    { id: 'snapback', name: 'Snapback Cap', price: '$12.00', image: '🧢' },
    { id: 'dad-hat', name: 'Dad Hat', price: '$10.00', image: '🧢' },
    { id: 'beanie', name: 'Beanie', price: '$14.00', image: '🧶' },
    { id: 'bucket', name: 'Bucket Hat', price: '$16.00', image: '👒' },
  ],
  'accessories': [
    { id: 'tote', name: 'Tote Bag', price: '$8.00', image: '👜' },
    { id: 'backpack', name: 'Backpack', price: '$32.00', image: '🎒' },
    { id: 'phone-case', name: 'Phone Case', price: '$12.00', image: '📱' },
    { id: 'stickers', name: 'Sticker Sheet', price: '$4.00', image: '🏷️' },
  ],
  'home-living': [
    { id: 'mug', name: 'Ceramic Mug', price: '$6.00', image: '☕' },
    { id: 'poster', name: 'Poster Print', price: '$8.00', image: '🖼️' },
    { id: 'pillow', name: 'Throw Pillow', price: '$18.00', image: '🛋️' },
    { id: 'blanket', name: 'Fleece Blanket', price: '$28.00', image: '🛏️' },
  ],
  'kids-youth': [
    { id: 'kids-tee', name: 'Kids T-Shirt', price: '$7.00', image: '👕' },
    { id: 'youth-hoodie', name: 'Youth Hoodie', price: '$22.00', image: '🧥' },
    { id: 'onesie', name: 'Baby Onesie', price: '$10.00', image: '👶' },
  ],
};

export default function ProductSelectorModal({
  isOpen,
  onClose,
  onSelectProduct,
}: ProductSelectorModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all-products');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const getProductsForCategory = () => {
    if (selectedCategory in DETAILED_PRODUCTS) {
      return DETAILED_PRODUCTS[selectedCategory as keyof typeof DETAILED_PRODUCTS];
    }
    // For categories without specific products, show all sample products
    return SAMPLE_PRODUCTS;
  };

  const filteredProducts = getProductsForCategory().filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCategoryItem = (category: Category, isActive: boolean) => (
    <button
      key={category.id}
      onClick={() => setSelectedCategory(category.id)}
      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
        isActive
          ? 'bg-gray-100 text-gray-900 font-medium'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <div className="flex items-center gap-2">
        {category.icon && <category.icon className="w-4 h-4" />}
        <span>{category.name}</span>
      </div>
      {category.hasSubmenu && <ChevronRight className="w-4 h-4 text-gray-400" />}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Change product</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Categories */}
          <div className="w-56 border-r border-gray-200 overflow-y-auto p-3 space-y-1">
            {/* Featured */}
            {FEATURED_CATEGORIES.map((cat) => renderCategoryItem(cat, selectedCategory === cat.id))}
            
            {/* Divider */}
            <div className="border-t border-gray-200 my-3" />
            
            {/* Filter Categories */}
            {FILTER_CATEGORIES.map((cat) => renderCategoryItem(cat, selectedCategory === cat.id))}
            
            {/* Divider */}
            <div className="border-t border-gray-200 my-3" />
            
            {/* Product Categories */}
            {PRODUCT_CATEGORIES.map((cat) => renderCategoryItem(cat, selectedCategory === cat.id))}
            
            {/* Divider */}
            <div className="border-t border-gray-200 my-3" />
            
            {/* Collections & Brands */}
            {COLLECTIONS_CATEGORIES.map((cat) => renderCategoryItem(cat, selectedCategory === cat.id))}
          </div>

          {/* Right Content - Product Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Search */}
            <div className="mb-6">
              <div className="relative max-w-md ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => {
                    onSelectProduct(product.id);
                    onClose();
                  }}
                  className="group flex flex-col items-center p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-4xl mb-3 group-hover:bg-blue-50">
                    {product.image}
                  </div>
                  <p className="text-sm font-medium text-gray-900 text-center">{product.name}</p>
                  {'price' in product && (
                    <p className="text-xs text-gray-500 mt-1">{(product as { price: string }).price}</p>
                  )}
                </button>
              ))}
            </div>

            {filteredProducts.length === 0 && (
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
