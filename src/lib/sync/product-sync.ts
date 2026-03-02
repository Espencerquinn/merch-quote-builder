import { db } from "@/lib/db";
import { cachedProducts, syncLog } from "@/lib/db/schema";
import { getAllProviders } from "@/lib/providers/registry";
import "@/lib/providers/init";
import { eq } from "drizzle-orm";
import type { ProductDetail } from "@/lib/providers/types";

export async function syncProvider(providerId: string) {
  const providers = getAllProviders();
  const provider = providers.find((p) => p.id === providerId);
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);

  const [logEntry] = await db
    .insert(syncLog)
    .values({
      providerId,
      status: "running",
      startedAt: new Date(),
    })
    .returning();

  let productsUpdated = 0;

  try {
    const products = await provider.listProducts();
    console.log(`[sync] ${providerId}: Found ${products.length} products`);

    for (const summary of products) {
      try {
        const detail: ProductDetail = await provider.getProduct(
          summary.id.split(":")[1] // extract raw product ID from compound
        );

        await db
          .insert(cachedProducts)
          .values({
            compoundId: summary.id,
            providerId,
            rawProductId: summary.id.split(":")[1],
            name: summary.name,
            description: summary.description,
            productType: summary.productType,
            thumbnailUrl: summary.thumbnailUrl,
            detailJson: JSON.stringify(detail),
            lastSyncedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: cachedProducts.compoundId,
            set: {
              name: summary.name,
              description: summary.description,
              productType: summary.productType,
              thumbnailUrl: summary.thumbnailUrl,
              detailJson: JSON.stringify(detail),
              lastSyncedAt: new Date(),
            },
          });

        productsUpdated++;
      } catch (err) {
        console.error(`[sync] ${providerId}: Failed to sync product ${summary.id}:`, err);
      }
    }

    await db
      .update(syncLog)
      .set({
        status: "completed",
        productsUpdated,
        completedAt: new Date(),
      })
      .where(eq(syncLog.id, logEntry.id));

    console.log(`[sync] ${providerId}: Completed. ${productsUpdated} products synced.`);
    return { status: "completed", productsUpdated };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await db
      .update(syncLog)
      .set({
        status: "failed",
        productsUpdated,
        errorMessage,
        completedAt: new Date(),
      })
      .where(eq(syncLog.id, logEntry.id));

    console.error(`[sync] ${providerId}: Failed.`, error);
    return { status: "failed", productsUpdated, error: errorMessage };
  }
}

export async function syncAllProviders() {
  const providers = getAllProviders();
  const results: Record<string, { status: string; productsUpdated: number }> = {};

  for (const provider of providers) {
    results[provider.id] = await syncProvider(provider.id);
  }

  return results;
}
