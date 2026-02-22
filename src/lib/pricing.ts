// Configurable pricing rules - can be moved to database/API later
export const pricingConfig = {
  blankCostTiers: [
    { minQty: 1, maxQty: 24, pricePerUnit: 9 },
    { minQty: 25, maxQty: 99, pricePerUnit: 7.5 },
    { minQty: 100, maxQty: Infinity, pricePerUnit: 6 },
  ],
  printCostPerUnit: 4,
  setupFee: {
    threshold: 24,
    amount: 35,
  },
  highIntentThresholds: {
    minQuantity: 100,
    minTotal: 1000,
  },
};

export interface QuoteBreakdown {
  quantity: number;
  blankCostPerUnit: number;
  blankCostTotal: number;
  printCostPerUnit: number;
  printCostTotal: number;
  setupFee: number;
  totalCost: number;
  costPerUnit: number;
}

export function calculateQuote(quantity: number): QuoteBreakdown {
  const tier = pricingConfig.blankCostTiers.find(
    (t) => quantity >= t.minQty && quantity <= t.maxQty
  );
  
  const blankCostPerUnit = tier?.pricePerUnit ?? pricingConfig.blankCostTiers[0].pricePerUnit;
  const blankCostTotal = blankCostPerUnit * quantity;
  
  const printCostPerUnit = pricingConfig.printCostPerUnit;
  const printCostTotal = printCostPerUnit * quantity;
  
  const setupFee = quantity < pricingConfig.setupFee.threshold 
    ? pricingConfig.setupFee.amount 
    : 0;
  
  const totalCost = blankCostTotal + printCostTotal + setupFee;
  const costPerUnit = quantity > 0 ? totalCost / quantity : 0;
  
  return {
    quantity,
    blankCostPerUnit,
    blankCostTotal,
    printCostPerUnit,
    printCostTotal,
    setupFee,
    totalCost,
    costPerUnit,
  };
}

export type LeadCategory = 'self-serve-small' | 'mid-tier' | 'high-intent';

export function determineLeadCategory(
  quantity: number,
  totalCost: number,
  isSellingThese: boolean
): LeadCategory {
  if (
    quantity >= pricingConfig.highIntentThresholds.minQuantity ||
    totalCost >= pricingConfig.highIntentThresholds.minTotal ||
    isSellingThese
  ) {
    return 'high-intent';
  }
  
  if (quantity >= 25 || totalCost >= 500) {
    return 'mid-tier';
  }
  
  return 'self-serve-small';
}

export function isHighIntent(
  quantity: number,
  totalCost: number,
  isSellingThese: boolean
): boolean {
  return (
    quantity >= pricingConfig.highIntentThresholds.minQuantity ||
    totalCost >= pricingConfig.highIntentThresholds.minTotal ||
    isSellingThese
  );
}
