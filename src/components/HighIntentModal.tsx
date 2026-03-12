import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';

interface HighIntentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: HighIntentData) => void;
  isLoading?: boolean;
}

export interface HighIntentData {
  socialLink: string;
  timeline: string;
  revenueGoal: string;
}

const TIMELINE_OPTIONS = [
  'ASAP (within 2 weeks)',
  '1 month',
  '2-3 months',
  'Just exploring',
];

const REVENUE_GOALS = [
  'Under $5,000',
  '$5,000 - $10,000',
  '$10,000 - $25,000',
  '$25,000+',
  'Not sure yet',
];

export default function HighIntentModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: HighIntentModalProps) {
  const [formData, setFormData] = useState<HighIntentData>({
    socialLink: '',
    timeline: '',
    revenueGoal: '',
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
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <h2 className="text-xl font-semibold text-gray-900">
              Want help optimizing this for profit?
            </h2>
          </div>
          <p className="text-sm text-gray-500">
            Our team can help you maximize margins and create a winning merch strategy.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Social Link */}
          <div>
            <label htmlFor="socialLink" className="block text-sm font-medium text-gray-700 mb-1">
              Instagram or Website
            </label>
            <input
              type="text"
              id="socialLink"
              value={formData.socialLink}
              onChange={(e) => setFormData({ ...formData, socialLink: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="@yourbrand or website URL"
            />
          </div>

          {/* Timeline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              When do you need these?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TIMELINE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFormData({ ...formData, timeline: option })}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    formData.timeline === option
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Revenue Goal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Revenue goal for this merch?
            </label>
            <div className="space-y-2">
              {REVENUE_GOALS.map((goal) => (
                <button
                  key={goal}
                  type="button"
                  onClick={() => setFormData({ ...formData, revenueGoal: goal })}
                  className={`w-full px-3 py-2 text-sm text-left rounded-lg border transition-colors ${
                    formData.revenueGoal === goal
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {goal}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition-all"
          >
            {isLoading ? 'Connecting...' : 'Connect with Our Team'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full text-sm text-gray-500 hover:text-gray-700"
          >
            No thanks, just send my quote
          </button>
        </form>
      </div>
    </div>
  );
}
