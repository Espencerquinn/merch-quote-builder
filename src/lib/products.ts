// Product configuration - generic model for future expansion
export interface ProductColor {
  id: string;
  name: string;
  hex: string;
  mockupImage: string;
}

export interface ProductSize {
  id: string;
  name: string;
  available: boolean;
}

export type PrintAreaView = 'front' | 'back' | 'outside-label' | 'inside-label' | 'left-sleeve' | 'right-sleeve';

export interface PrintArea {
  id: PrintAreaView;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  mockupVariant?: string; // Different mockup image suffix for this view
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  colors: ProductColor[];
  sizes: ProductSize[];
  printAreas: PrintArea[];
  basePrice: number;
}

// MVP: Single T-shirt product
export const products: Product[] = [
  {
    id: 'snow-washed-oversized-tee',
    name: 'Snow Washed Oversized Cotton T-Shirt',
    description: 'Premium oversized fit with vintage snow wash finish',
    category: 't-shirt',
    colors: [
      {
        id: 'vintage-black',
        name: 'Vintage Black',
        hex: '#1a1a1a',
        mockupImage: '/mockups/tshirt-black.png',
      },
      {
        id: 'stone-gray',
        name: 'Stone Gray',
        hex: '#8b8b8b',
        mockupImage: '/mockups/tshirt-gray.png',
      },
      {
        id: 'desert-sand',
        name: 'Desert Sand',
        hex: '#d4c4a8',
        mockupImage: '/mockups/tshirt-sand.png',
      },
      {
        id: 'washed-white',
        name: 'Washed White',
        hex: '#f5f5f0',
        mockupImage: '/mockups/tshirt-white.png',
      },
    ],
    sizes: [
      { id: 's', name: 'S', available: true },
      { id: 'm', name: 'M', available: true },
      { id: 'l', name: 'L', available: true },
      { id: 'xl', name: 'XL', available: true },
      { id: 'xxl', name: 'XXL', available: true },
    ],
    printAreas: [
      {
        id: 'front',
        name: 'Front',
        x: 150,
        y: 120,
        width: 200,
        height: 250,
      },
      {
        id: 'back',
        name: 'Back',
        x: 150,
        y: 120,
        width: 200,
        height: 250,
        mockupVariant: 'back',
      },
      {
        id: 'outside-label',
        name: 'Outside label',
        x: 200,
        y: 60,
        width: 100,
        height: 40,
        mockupVariant: 'label-outside',
      },
      {
        id: 'inside-label',
        name: 'Inside label',
        x: 200,
        y: 80,
        width: 100,
        height: 40,
        mockupVariant: 'label-inside',
      },
      {
        id: 'left-sleeve',
        name: 'Left sleeve',
        x: 50,
        y: 140,
        width: 80,
        height: 100,
        mockupVariant: 'sleeve-left',
      },
      {
        id: 'right-sleeve',
        name: 'Right sleeve',
        x: 370,
        y: 140,
        width: 80,
        height: 100,
        mockupVariant: 'sleeve-right',
      },
    ],
    basePrice: 9,
  },
];

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getDefaultProduct(): Product {
  return products[0];
}
