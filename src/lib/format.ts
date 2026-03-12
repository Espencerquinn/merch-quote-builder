/**
 * Format cents to a dollar string like "$12.50"
 */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Format cents to a localized dollar string like "$1,234.50"
 */
export function formatCentsLocale(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

/**
 * Safely parse a JSON string with a fallback value.
 */
export function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try { return JSON.parse(json); } catch { return fallback; }
}

/** Standard garment size ordering */
export const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'] as const;

/** Sort size codes in standard garment order (unknown sizes go last) */
export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a as typeof SIZE_ORDER[number]);
    const bi = SIZE_ORDER.indexOf(b as typeof SIZE_ORDER[number]);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

/** Default hex colour when provider doesn't supply one */
export const DEFAULT_COLOUR_HEX = '#888888';
