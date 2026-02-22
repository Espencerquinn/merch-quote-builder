// Server-side AS Colour API client

import type { ASColourPricelistItem } from '@/types/ascolour';

const API_URL = process.env.ASCOLOUR_API_URL || 'https://api.ascolour.co.nz/v1';
const SUBSCRIPTION_KEY = process.env.ASCOLOUR_SUBSCRIPTION_KEY || '';
const AUTH_EMAIL = process.env.ASCOLOUR_EMAIL || '';
const AUTH_PASSWORD = process.env.ASCOLOUR_PASSWORD || '';

function headers() {
  return {
    'Subscription-Key': SUBSCRIPTION_KEY,
    'Content-Type': 'application/json',
  };
}

// --- Token auth (required for pricing endpoints) ---

let cachedToken: { token: string; expiresAt: number } | null = null;
const TOKEN_TTL = 55 * 60 * 1000; // 55 minutes (conservative)

async function authenticate(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const res = await fetch(`${API_URL}/api/authentication`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email: AUTH_EMAIL, password: AUTH_PASSWORD }),
  });
  if (!res.ok) throw new Error(`AS Colour auth error: ${res.status}`);
  const body = await res.json();
  const token = body.token;
  if (!token) throw new Error('No token in auth response');

  cachedToken = { token, expiresAt: Date.now() + TOKEN_TTL };
  return token;
}

async function fetchWithAuth(url: string): Promise<Response> {
  let token = await authenticate();
  let res = await fetch(url, {
    headers: {
      ...headers(),
      'Authorization': `Bearer ${token}`,
    },
  });

  // Retry once on 401 (token may have expired)
  if (res.status === 401) {
    cachedToken = null;
    token = await authenticate();
    res = await fetch(url, {
      headers: {
        ...headers(),
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  if (!res.ok) throw new Error(`AS Colour API error: ${res.status}`);
  return res;
}

export async function fetchProducts(pageNumber = 1, pageSize = 50) {
  const params = new URLSearchParams({
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  });
  const res = await fetch(`${API_URL}/catalog/products/?${params}`, {
    headers: headers(),
    next: { revalidate: 3600 }, // Cache for 1 hour
  });
  if (!res.ok) throw new Error(`AS Colour API error: ${res.status}`);
  return res.json();
}

export async function fetchProduct(styleCode: string) {
  const res = await fetch(`${API_URL}/catalog/products/${styleCode}`, {
    headers: headers(),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`AS Colour API error: ${res.status}`);
  return res.json();
}

export async function fetchProductImages(styleCode: string) {
  const res = await fetch(`${API_URL}/catalog/products/${styleCode}/images`, {
    headers: headers(),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`AS Colour API error: ${res.status}`);
  return res.json();
}

export async function fetchProductVariants(styleCode: string) {
  const res = await fetch(`${API_URL}/catalog/products/${styleCode}/variants`, {
    headers: headers(),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`AS Colour API error: ${res.status}`);
  return res.json();
}

export async function fetchColours(colourFilter?: string) {
  const params = new URLSearchParams();
  if (colourFilter) params.set('ColourFilter', colourFilter);
  const res = await fetch(`${API_URL}/catalog/colours?${params}`, {
    headers: headers(),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`AS Colour API error: ${res.status}`);
  return res.json();
}

// --- Pricelist (requires Bearer auth) ---

let cachedPricelist: { data: Map<string, ASColourPricelistItem>; timestamp: number } | null = null;
const PRICELIST_CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function fetchAllPricelistItems(): Promise<ASColourPricelistItem[]> {
  const all: ASColourPricelistItem[] = [];
  let page = 1;
  const pageSize = 250;

  while (true) {
    const res = await fetchWithAuth(
      `${API_URL}/catalog/pricelist?pageNumber=${page}&pageSize=${pageSize}`
    );
    const body = await res.json();
    const items: ASColourPricelistItem[] = body.data || [];
    all.push(...items);
    if (items.length < pageSize) break;
    page++;
  }

  return all;
}

/** Returns a Map<sku, pricelistItem> cached for 1 hour */
export async function getPricelistMap(): Promise<Map<string, ASColourPricelistItem>> {
  if (cachedPricelist && Date.now() - cachedPricelist.timestamp < PRICELIST_CACHE_TTL) {
    return cachedPricelist.data;
  }

  const items = await fetchAllPricelistItems();
  const map = new Map<string, ASColourPricelistItem>();
  for (const item of items) {
    map.set(item.sku, item);
  }

  cachedPricelist = { data: map, timestamp: Date.now() };
  return map;
}
