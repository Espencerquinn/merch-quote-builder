import { fetchProducts, fetchProduct, fetchProductImages } from '@/lib/ascolour';
import type { ASColourProduct, ASColourProductImage } from '@/types/ascolour';
import type { ProductProvider, ProductSummary, ProductDetail, NormalizedColour, NormalizedImage } from '../types';

// Generic view names that aren't actual colours
const GENERIC_VIEWS = new Set(['BACK', 'FRONT', 'MAIN', 'SIDE', 'TURN']);

// In-memory cache
let cachedAllProducts: { data: ProductSummary[]; timestamp: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function makeCompoundId(styleCode: string): string {
  return `ascolour:${styleCode}`;
}

async function enrichWithThumbnail(product: ASColourProduct): Promise<ProductSummary> {
  let thumbnailUrl: string | null = null;
  try {
    const images = await fetchProductImages(product.styleCode);
    const allImages: ASColourProductImage[] = images.data || [];
    const heroImage = allImages.find((img) => img.imageType === '') || allImages[0];
    thumbnailUrl = heroImage?.urlThumbnail || null;
  } catch {
    // silently fall back to no thumbnail
  }

  return {
    id: makeCompoundId(product.styleCode),
    name: product.styleName,
    description: product.shortDescription,
    productType: product.productType,
    thumbnailUrl,
    provider: 'ascolour',
  };
}

/** Parse AS Colour images into normalized colours and images */
function parseProductImages(images: ASColourProductImage[]): {
  colours: NormalizedColour[];
  normalizedImages: NormalizedImage[];
  availableViews: ('front' | 'back' | 'side')[];
} {
  const colourMap = new Map<string, { front?: ASColourProductImage; back?: ASColourProductImage; side?: ASColourProductImage }>();

  for (const img of images) {
    const imageType = img.imageType.trim();
    if (!imageType || GENERIC_VIEWS.has(imageType)) continue;

    const parts = imageType.split(' - ');
    const colour = parts[0].trim();
    const view = parts[1]?.trim().toLowerCase() || 'front';

    if (GENERIC_VIEWS.has(colour)) continue;

    if (!colourMap.has(colour)) {
      colourMap.set(colour, {});
    }
    const entry = colourMap.get(colour)!;

    if (view === 'front' || parts.length === 1) {
      entry.front = img;
    } else if (view === 'back') {
      entry.back = img;
    } else if (view === 'side') {
      entry.side = img;
    }
  }

  const colours: NormalizedColour[] = [];
  const normalizedImages: NormalizedImage[] = [];
  const viewSet = new Set<'front' | 'back' | 'side'>();

  for (const [colourName, views] of colourMap) {
    const colourId = colourName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    colours.push({
      id: colourId,
      name: colourName,
      hex: '#888888', // AS Colour API doesn't give us hex in images
      thumbnailUrl: views.front?.urlTiny || null,
    });

    if (views.front) {
      viewSet.add('front');
      normalizedImages.push({
        url: views.front.urlStandard,
        thumbnailUrl: views.front.urlThumbnail,
        zoomUrl: views.front.urlZoom,
        view: 'front',
        colourId,
      });
    }
    if (views.back) {
      viewSet.add('back');
      normalizedImages.push({
        url: views.back.urlStandard,
        thumbnailUrl: views.back.urlThumbnail,
        zoomUrl: views.back.urlZoom,
        view: 'back',
        colourId,
      });
    }
    if (views.side) {
      viewSet.add('side');
      normalizedImages.push({
        url: views.side.urlStandard,
        thumbnailUrl: views.side.urlThumbnail,
        zoomUrl: views.side.urlZoom,
        view: 'side',
        colourId,
      });
    }
  }

  return {
    colours,
    normalizedImages,
    availableViews: Array.from(viewSet),
  };
}

export const asColourProvider: ProductProvider = {
  id: 'ascolour',

  async listProducts(): Promise<ProductSummary[]> {
    if (cachedAllProducts && Date.now() - cachedAllProducts.timestamp < CACHE_TTL) {
      return cachedAllProducts.data;
    }

    // Fetch all pages from AS Colour
    const allRaw: ASColourProduct[] = [];
    let pageNum = 1;
    const batchSize = 250;

    while (true) {
      const result = await fetchProducts(pageNum, batchSize);
      const products: ASColourProduct[] = result.data || [];
      allRaw.push(...products);
      if (products.length < batchSize) break;
      pageNum++;
    }

    // Enrich with thumbnails in batches of 50
    const summaries: ProductSummary[] = [];
    for (let i = 0; i < allRaw.length; i += 50) {
      const batch = allRaw.slice(i, i + 50);
      const enriched = await Promise.all(batch.map(enrichWithThumbnail));
      summaries.push(...enriched);
    }

    cachedAllProducts = { data: summaries, timestamp: Date.now() };
    return summaries;
  },

  async getProduct(styleCode: string): Promise<ProductDetail> {
    const [productData, imagesData] = await Promise.all([
      fetchProduct(styleCode) as Promise<ASColourProduct>,
      fetchProductImages(styleCode).then(r => (r.data || []) as ASColourProductImage[]),
    ]);

    const { colours, normalizedImages, availableViews } = parseProductImages(imagesData);

    return {
      id: makeCompoundId(styleCode),
      name: productData.styleName,
      description: productData.shortDescription,
      productType: productData.productType,
      thumbnailUrl: colours[0]?.thumbnailUrl || null,
      provider: 'ascolour',
      colours,
      images: normalizedImages,
      availableViews,
      sizes: [], // AS Colour sizes come from variants — not yet integrated
      metadata: {
        styleCode: productData.styleCode,
        fabricWeight: productData.fabricWeight,
        composition: productData.composition,
        fit: productData.fit,
        gender: productData.gender,
        websiteURL: productData.websiteURL,
      },
    };
  },
};
