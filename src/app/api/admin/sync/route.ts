import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { syncProvider, syncAllProviders } from "@/lib/sync/product-sync";

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json().catch(() => ({}));
    const providerId = body.providerId;

    if (providerId) {
      const result = await syncProvider(providerId);
      return NextResponse.json(result);
    }

    const results = await syncAllProviders();
    return NextResponse.json(results);
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Sync failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
