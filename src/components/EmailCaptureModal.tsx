import { useState } from 'react';
import { X } from 'lucide-react';

interface EmailCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EmailCaptureData) => void;
  isLoading?: boolean;
}

export interface EmailCaptureData {
  name: string;
  email: string;
  brandName?: string;
  isSellingThese: boolean;
}

export default function EmailCaptureModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: EmailCaptureModalProps) {
  const [formData, setFormData] = useState<EmailCaptureData>({
    name: '',
    email: '',
    brandName: '',
    isSellingThese: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Email Me This Quote
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            We&apos;ll send you a detailed breakdown with your design mockup
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Your name"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              id="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="you@example.com"
            />
          </div>

          {/* Brand Name */}
          <div>
            <label htmlFor="brandName" className="block text-sm font-medium text-gray-700 mb-1">
              Brand Name <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              id="brandName"
              value={formData.brandName}
              onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Your brand or company"
            />
          </div>

          {/* Selling Toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-700">Selling these?</p>
              <p className="text-xs text-gray-500">Planning to resell this merch?</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isSellingThese: !formData.isSellingThese })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.isSellingThese ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.isSellingThese ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {isLoading ? 'Sending...' : 'Send My Quote'}
          </button>
        </form>
      </div>
    </div>
  );
}
