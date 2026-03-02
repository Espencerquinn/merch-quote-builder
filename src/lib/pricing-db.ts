import { db } from "@/lib/db";
import { platformSettings, userPricingOverrides } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_MARKUP_KEY = "default_blank_markup_percent";
const DEFAULT_MARKUP_FALLBACK = 50;

/**
 * Get the default blank markup percentage from platform settings.
 * Falls back to 50% if not configured.
 */
export async function getDefaultBlankMarkup(): Promise<number> {
  const setting = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.key, DEFAULT_MARKUP_KEY),
  });
  return setting ? parseInt(setting.value, 10) : DEFAULT_MARKUP_FALLBACK;
}

/**
 * Get the blank markup percentage for a specific user.
 * Returns their override if one exists, otherwise the platform default.
 */
export async function getUserBlankMarkup(userId: string): Promise<number> {
  const override = await db.query.userPricingOverrides.findFirst({
    where: eq(userPricingOverrides.userId, userId),
  });

  if (override) return override.blankMarkupPercent;

  return getDefaultBlankMarkup();
}

/**
 * Apply markup to a wholesale blank cost.
 * Returns the retail price in the same unit (dollars or cents).
 */
export function applyMarkup(blankCost: number, markupPercent: number): number {
  return blankCost * (1 + markupPercent / 100);
}
