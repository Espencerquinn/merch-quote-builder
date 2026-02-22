export interface DesignElement {
  id: string;
  type: 'image' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  // Image specific
  src?: string;
  // Text specific
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fill?: string;
}

export interface DesignState {
  productId: string;
  colorId: string;
  quantity: number;
  elements: DesignElement[];
}

export interface QuoteData {
  id?: string;
  designState: DesignState;
  quote: {
    quantity: number;
    blankCostPerUnit: number;
    blankCostTotal: number;
    printCostPerUnit: number;
    printCostTotal: number;
    setupFee: number;
    totalCost: number;
    costPerUnit: number;
  };
  lead?: LeadData;
  status: 'started' | 'saved' | 'high-intent' | 'contact-requested';
  createdAt: string;
  updatedAt: string;
}

export interface LeadData {
  name: string;
  email: string;
  brandName?: string;
  isSellingThese: boolean;
  category: 'self-serve-small' | 'mid-tier' | 'high-intent';
  // High-intent additional fields
  socialLink?: string;
  timeline?: string;
  revenueGoal?: string;
}

export interface AnalyticsEvent {
  event: 'design_started' | 'quote_emailed' | 'high_intent_triggered' | 'contact_requested';
  quoteId?: string;
  estimatedValue?: number;
  timestamp: string;
}
