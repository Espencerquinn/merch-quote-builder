import { getDefaultProduct, products } from '@/lib/products';
import type { ProductProvider, ProductSummary, ProductDetail } from '../types';

function makeCompoundId(productId: string): string {
  return `static:${productId}`;
}

function toSummary(p: ReturnType<typeof getDefaultProduct>): ProductSummary {
  return {
    id: makeCompoundId(p.id),
    name: p.name,
    description: p.description,
    productType: p.category,
    thumbnailUrl: p.colors[0]?.mockupImage || null,
    provider: 'static',
  };
}

function toDetail(p: ReturnType<typeof getDefaultProduct>): ProductDetail {
  return {
    ...toSummary(p),
    colours: p.colors.map(c => ({
      id: c.id,
      name: c.name,
      hex: c.hex,
      thumbnailUrl: null,
    })),
    images: p.colors.flatMap(c =>
      p.printAreas
        .filter(area => area.id === 'front' || area.id === 'back')
        .map(area => ({
          url: c.mockupImage,
          thumbnailUrl: c.mockupImage,
          zoomUrl: c.mockupImage,
          view: area.id as 'front' | 'back' | 'side',
          colourId: c.id,
        }))
    ),
    availableViews: ['front', 'back'],
    sizes: p.sizes.map(s => ({ id: s.id, name: s.name })),
    metadata: { basePrice: p.basePrice },
  };
}

export const staticProvider: ProductProvider = {
  id: 'static',

  async listProducts(): Promise<ProductSummary[]> {
    return products.map(toSummary);
  },

  async getProduct(productId: string): Promise<ProductDetail> {
    const p = products.find(prod => prod.id === productId);
    if (!p) throw new Error(`Static product not found: ${productId}`);
    return toDetail(p);
  },
};
