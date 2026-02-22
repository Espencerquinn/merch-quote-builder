import type { ProductProvider } from './types';

const providers = new Map<string, ProductProvider>();

export function registerProvider(provider: ProductProvider) {
  providers.set(provider.id, provider);
}

export function getProvider(providerId: string): ProductProvider {
  const provider = providers.get(providerId);
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);
  return provider;
}

export function getAllProviders(): ProductProvider[] {
  return Array.from(providers.values());
}

/** Parse "ascolour:5026" → { providerId: "ascolour", productId: "5026" } */
export function resolveProductId(compoundId: string): { providerId: string; productId: string } {
  const idx = compoundId.indexOf(':');
  if (idx === -1) throw new Error(`Invalid product ID format: ${compoundId}`);
  return {
    providerId: compoundId.slice(0, idx),
    productId: compoundId.slice(idx + 1),
  };
}
