/**
 * Enrich all products with pricing data from the AS Colour pricelist API.
 * Run with: npx tsx --env-file=.env.local scripts/enrich-pricing.ts
 */
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const API_URL = process.env.ASCOLOUR_API_URL || "https://api.ascolour.com/v1";
const SUBSCRIPTION_KEY = process.env.ASCOLOUR_SUBSCRIPTION_KEY || "";
const AUTH_EMAIL = process.env.ASCOLOUR_EMAIL || "";
const AUTH_PASSWORD = process.env.ASCOLOUR_PASSWORD || "";
const MARKUP = 1.3;

interface PricelistItem {
  sku: string;
  price: number;
  currency: string;
}

interface Variant {
  sku: string;
  sizeCode: string;
  colour: string;
  discontinued: boolean;
}

async function authenticate(): Promise<string> {
  const res = await fetch(`${API_URL}/api/authentication`, {
    method: "POST",
    headers: { "Subscription-Key": SUBSCRIPTION_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: AUTH_EMAIL, password: AUTH_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status} ${await res.text()}`);
  const body = await res.json();
  return body.token;
}

async function fetchAllPricelist(token: string): Promise<Map<string, PricelistItem>> {
  const map = new Map<string, PricelistItem>();
  let page = 1;
  while (true) {
    const res = await fetch(`${API_URL}/catalog/pricelist?pageNumber=${page}&pageSize=250`, {
      headers: {
        "Subscription-Key": SUBSCRIPTION_KEY,
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error(`Pricelist fetch failed: ${res.status}`);
    const body = await res.json();
    const items: PricelistItem[] = body.data || [];
    for (const item of items) map.set(item.sku, item);
    if (items.length < 250) break;
    page++;
  }
  return map;
}

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 });

  console.log("[pricing] Authenticating with AS Colour API...");
  const token = await authenticate();

  console.log("[pricing] Fetching pricelist...");
  const pricelistMap = await fetchAllPricelist(token);
  console.log(`[pricing] Got ${pricelistMap.size} pricelist entries`);

  // Get all products that need pricing
  const products = await sql`
    SELECT compound_id, detail_json FROM products WHERE is_active = true
  `;

  console.log(`[pricing] Processing ${products.length} products...`);

  let updated = 0;
  let skipped = 0;

  for (const product of products) {
    try {
      const detail = JSON.parse(product.detail_json);
      const variants: Variant[] = detail.variants || [];
      const activeVariants = variants.filter((v) => !v.discontinued);

      let basePriceCents: number | null = null;
      let currency: string | null = null;

      for (const v of activeVariants) {
        const priceEntry = pricelistMap.get(v.sku);
        if (priceEntry) {
          const retailCents = Math.round(priceEntry.price * MARKUP * 100);
          if (basePriceCents === null || retailCents < basePriceCents) {
            basePriceCents = retailCents;
            currency = priceEntry.currency;
          }
        }
      }

      if (basePriceCents !== null) {
        await sql`
          UPDATE products
          SET base_price_cents = ${basePriceCents}, currency = ${currency}
          WHERE compound_id = ${product.compound_id}
        `;
        updated++;
      } else {
        skipped++;
      }
    } catch {
      skipped++;
    }
  }

  console.log(`[pricing] Done! Updated: ${updated}, Skipped (no pricing): ${skipped}`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
