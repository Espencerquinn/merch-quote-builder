// Provider-agnostic product types — the client works exclusively with these

export interface NormalizedColour {
  id: string;
  name: string;
  hex: string;
  thumbnailUrl: string | null;
}

export interface NormalizedImage {
  url: string;
  thumbnailUrl: string;
  zoomUrl: string;
  view: 'front' | 'back' | 'side';
  colourId: string;
}

export interface ProductSummary {
  id: string; // compound: "ascolour:5026", "static:snow-washed-oversized-tee"
  name: string;
  description: string;
  productType: string;
  thumbnailUrl: string | null;
  provider: string;
}

export interface ProductDetail extends ProductSummary {
  colours: NormalizedColour[];
  images: NormalizedImage[];
  availableViews: ('front' | 'back' | 'side')[];
  sizes: { id: string; name: string }[];
  metadata: Record<string, unknown>;
}

export interface ProductProvider {
  id: string; // e.g. "ascolour", "static"
  listProducts(): Promise<ProductSummary[]>;
  getProduct(productId: string): Promise<ProductDetail>;
}
