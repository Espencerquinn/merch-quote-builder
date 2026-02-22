// AS Colour API response types

export interface ASColourProduct {
  styleCode: string;
  styleName: string;
  description: string;
  shortDescription: string;
  printingTechniques: string;
  fabricWeight: string;
  composition: string;
  webId: number;
  productType: string;
  productWeight: string;
  coreRange: string;
  fit: string;
  gender: string;
  productSpecURL: string;
  sizeGuideURL: string;
  websiteURL: string;
  updatedAt: string;
}

export interface ASColourVariant {
  sku: string;
  styleCode: string;
  name: string;
  colour: string;
  sizeCode: string;
  cartonQty: number;
  weight: number | null;
  imageUrl: string;
  webId: number;
  GTIN12: string;
  discontinued: boolean;
  updatedAt: string;
}

export interface ASColourProductImage {
  styleCode: string;
  imageType: string;
  urlStandard: string;
  urlThumbnail: string;
  urlTiny: string;
  urlZoom: string;
}

export interface ASColourColour {
  colour: string;
  hex: string;
  hex2: string;
}

// Parsed view from image data
export interface ProductView {
  id: string;
  label: string;
  colour: string;
  imageUrl: string;      // Standard size for canvas
  thumbnailUrl: string;
  zoomUrl: string;
}
