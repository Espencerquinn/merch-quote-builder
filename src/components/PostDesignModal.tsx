"use client";

import { ShoppingCart, Store, X } from "lucide-react";

interface PostDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBuyProduct: () => void;
  onAddToStore: () => void;
  productName: string;
}

export default function PostDesignModal({
  isOpen,
  onClose,
  onBuyProduct,
  onAddToStore,
  productName,
}: PostDesignModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Design Saved!</h2>
          <p className="text-gray-500 mt-2 text-sm">
            Your design for <span className="font-medium text-gray-700">{productName}</span> has been saved. What would you like to do next?
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onBuyProduct}
            className="w-full flex items-center gap-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-100 transition-all text-left group"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Buy This Product</p>
              <p className="text-sm text-gray-500">Purchase this design for yourself</p>
            </div>
          </button>

          <button
            onClick={onAddToStore}
            className="w-full flex items-center gap-4 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl hover:border-purple-400 hover:bg-purple-100 transition-all text-left group"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition-colors">
              <Store className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Add to My Store</p>
              <p className="text-sm text-gray-500">Sell this design in your merch store</p>
            </div>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700 py-2"
        >
          Keep editing
        </button>
      </div>
    </div>
  );
}
