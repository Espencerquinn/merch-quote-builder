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
