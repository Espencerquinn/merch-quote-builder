import { db } from "@/lib/db";
import { cachedProducts } from "@/lib/db/schema";
import { resolveProductId, getProvider, getAllProviders } from "@/lib/providers/registry";
import "@/lib/providers/init";
import { eq } from "drizzle-orm";
import type { ProductDetail, ProductSummary } from "@/lib/providers/types";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function isFresh(lastSyncedAt: Date): boolean {
  return Date.now() - lastSyncedAt.getTime() < CACHE_TTL_MS;
}

async function upsertCachedProduct(
  compoundId: string,
  providerId: string,
  detail: ProductDetail
): Promise<void> {
  await db
    .insert(cachedProducts)
    .values({
      compoundId,
      providerId,
      rawProductId: compoundId.split(":")[1],
      name: detail.name,
      description: detail.description,
      productType: detail.productType,
      thumbnailUrl: detail.thumbnailUrl,
      detailJson: JSON.stringify(detail),
      lastSyncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: cachedProducts.compoundId,
      set: {
        name: detail.name,
        description: detail.description,
        productType: detail.productType,
        thumbnailUrl: detail.thumbnailUrl,
        detailJson: JSON.stringify(detail),
        lastSyncedAt: new Date(),
      },
    });
}

function hasUsableDetail(detailJson: string): boolean {
  return detailJson.length > 2; // anything beyond "{}"
}

export async function getCachedProductDetail(compoundId: string): Promise<ProductDetail> {
  const cached = await db.query.cachedProducts.findFirst({
    where: eq(cachedProducts.compoundId, compoundId),
  });

  // Fresh cache hit with real detail data — return immediately
  if (cached && isFresh(cached.lastSyncedAt) && hasUsableDetail(cached.detailJson)) {
    return JSON.parse(cached.detailJson) as ProductDetail;
  }

  // Stale, empty detail, or missing — try live API
  try {
    const { providerId, productId } = resolveProductId(compoundId);
    const provider = getProvider(providerId);
    const detail = await provider.getProduct(productId);

    await upsertCachedProduct(compoundId, providerId, detail);

    return detail;
  } catch (err) {
    // API failed — return stale cache if it has real data
    if (cached && hasUsableDetail(cached.detailJson)) {
      console.warn(`[product-cache] API failed for ${compoundId}, returning stale cache:`, err);
      return JSON.parse(cached.detailJson) as ProductDetail;
    }

    // No usable cache — rethrow
    throw err;
  }
}

export async function getCachedProductList(): Promise<ProductSummary[]> {
  const rows = await db.select().from(cachedProducts);

  if (rows.length > 0) {
    return rows.map((row) => ({
      id: row.compoundId,
      name: row.name,
      description: row.description || "",
      productType: row.productType || "",
      thumbnailUrl: row.thumbnailUrl,
      provider: row.providerId,
    }));
  }

  // Empty cache — fall back to live providers and populate cache
  const providers = getAllProviders();
  const results = await Promise.all(
    providers.map((p) =>
      p.listProducts().catch((err) => {
        console.error(`[product-cache] Provider ${p.id} failed to list products:`, err);
        return [];
      })
    )
  );
  const allProducts = results.flat();

  // Background-populate cache with summaries (no detail yet)
  for (const product of allProducts) {
    const { providerId } = resolveProductId(product.id);
    await db
      .insert(cachedProducts)
      .values({
        compoundId: product.id,
        providerId,
        rawProductId: product.id.split(":")[1],
        name: product.name,
        description: product.description,
        productType: product.productType,
        thumbnailUrl: product.thumbnailUrl,
        detailJson: "{}",
        lastSyncedAt: new Date(0), // Mark as stale so detail is fetched on first access
      })
      .onConflictDoNothing();
  }

  return allProducts;
}
