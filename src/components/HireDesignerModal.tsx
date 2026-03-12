import { useState } from 'react';
import { X, Palette, Clock, MessageSquare, CheckCircle } from 'lucide-react';

interface HireDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SERVICE_OPTIONS = [
  {
    id: 'minor-edit',
    name: 'Minor Edit',
    description: 'Small tweaks to your existing design',
    price: '$25',
    turnaround: '24 hours',
  },
  {
    id: 'design-refresh',
    name: 'Design Refresh',
    description: 'Update colors, fonts, or layout',
    price: '$75',
    turnaround: '2-3 days',
  },
  {
    id: 'custom-design',
    name: 'Custom Design',
    description: 'Brand new design from scratch',
    price: '$150+',
    turnaround: '5-7 days',
  },
];

export default function HireDesignerModal({
  isOpen,
  onClose,
}: HireDesignerModalProps) {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would send to an API
    console.log('Designer request:', { selectedService, description, email });
    setSubmitted(true);
  };

  const handleClose = () => {
    setSelectedService(null);
    setDescription('');
    setEmail('');
    setSubmitted(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Palette className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Hire a Merch Maker Designer</h2>
              <p className="text-sm text-gray-500">Get professional help with your design</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          /* Success State */
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Request Submitted!</h3>
            <p className="text-gray-600 mb-6">
              A Merch Maker designer will reach out to you within 24 hours to discuss your project.
            </p>
            <button
              onClick={handleClose}
              className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 px-6 rounded-lg"
            >
              Close
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Service Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                What do you need help with?
              </label>
              <div className="space-y-3">
                {SERVICE_OPTIONS.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => setSelectedService(service.id)}
                    className={`w-full text-left p-4 border rounded-xl transition-all ${
                      selectedService === service.id
                        ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{service.name}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{service.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-purple-600">{service.price}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {service.turnaround}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Tell us about your project
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                placeholder="Describe what you're looking for, your brand style, any specific requirements..."
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Your email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="you@example.com"
              />
            </div>

            {/* Info Box */}
            <div className="bg-gray-50 rounded-lg p-4 flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-900">How it works</p>
                <p className="mt-1">
                  After submitting, a designer will review your request and reach out to discuss details, 
                  timeline, and pricing. You only pay once you approve the project scope.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!selectedService || !email}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Request a Designer
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
