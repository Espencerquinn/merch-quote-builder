// Server-side AS Colour API client

const API_URL = process.env.ASCOLOUR_API_URL || 'https://api.ascolour.co.nz/v1';
const SUBSCRIPTION_KEY = process.env.ASCOLOUR_SUBSCRIPTION_KEY || '';

function headers() {
  return {
    'Subscription-Key': SUBSCRIPTION_KEY,
    'Content-Type': 'application/json',
  };
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
