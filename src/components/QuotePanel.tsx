import { QuoteBreakdown } from '@/lib/pricing';

interface QuotePanelProps {
  quote: QuoteBreakdown;
  onEmailQuote: () => void;
  productName?: string;
  isRealPricing?: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function QuotePanel({ quote, onEmailQuote, productName, isRealPricing }: QuotePanelProps) {
  return (
    <div className="bg-white border-l border-gray-200 w-80 flex-shrink-0 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Your Quote</h3>
        <p className="text-sm text-gray-500 mt-1">Estimated pricing for {quote.quantity} units</p>
      </div>

      <div className="flex-1 p-6 space-y-4">
        {/* Blank Cost */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-gray-700">Blank Cost</p>
            <p className="text-xs text-gray-500">{formatCurrency(quote.blankCostPerUnit)} × {quote.quantity}</p>
          </div>
          <p className="font-medium text-gray-900">{formatCurrency(quote.blankCostTotal)}</p>
        </div>

        {/* Print Cost */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-gray-700">Print Cost (DTG)</p>
            <p className="text-xs text-gray-500">{formatCurrency(quote.printCostPerUnit)} × {quote.quantity}</p>
          </div>
          <p className="font-medium text-gray-900">{formatCurrency(quote.printCostTotal)}</p>
        </div>

        {/* Setup Fee */}
        {quote.setupFee > 0 && (
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-700">Setup Fee</p>
              <p className="text-xs text-gray-500">Orders under 24 units</p>
            </div>
            <p className="font-medium text-gray-900">{formatCurrency(quote.setupFee)}</p>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 mt-4">
          {/* Total */}
          <div className="flex justify-between items-center mb-2">
            <p className="text-lg font-semibold text-gray-900">Estimated Total</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(quote.totalCost)}</p>
          </div>

          {/* Per Unit */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">Cost per unit</p>
            <p className="text-sm font-medium text-gray-700">{formatCurrency(quote.costPerUnit)}</p>
          </div>
        </div>

        {/* Pricing Info */}
        {isRealPricing ? (
          <div className="bg-green-50 rounded-lg p-4 mt-6">
            <p className="text-xs font-medium text-green-800 mb-1">
              Pricing for {productName}
            </p>
            <p className="text-xs text-green-700">
              Blank cost: {formatCurrency(quote.blankCostPerUnit)}/unit (wholesale + markup)
            </p>
          </div>
        ) : (
          <div className="bg-blue-50 rounded-lg p-4 mt-6">
            <p className="text-xs font-medium text-blue-800 mb-2">Volume Discounts</p>
            <div className="space-y-1 text-xs text-blue-700">
              <p>1-24 units: $9.00/blank</p>
              <p>25-99 units: $7.50/blank</p>
              <p>100+ units: $6.00/blank</p>
            </div>
          </div>
        )}
      </div>

      {/* CTA Button */}
      <div className="p-6 border-t border-gray-200">
        <button
          onClick={onEmailQuote}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          Email Me This Quote
        </button>
        <p className="text-xs text-gray-500 text-center mt-2">
          We&apos;ll send you a detailed breakdown
        </p>
      </div>
    </div>
  );
}
