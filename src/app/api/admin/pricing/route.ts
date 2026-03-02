import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { platformSettings, userPricingOverrides, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_MARKUP_KEY = "default_blank_markup_percent";
const DEFAULT_MARKUP_VALUE = "50"; // 50%

// GET: Fetch pricing settings + all user overrides
export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const [setting, overrides] = await Promise.all([
    db.query.platformSettings.findFirst({
      where: eq(platformSettings.key, DEFAULT_MARKUP_KEY),
    }),
    db
      .select({
        override: userPricingOverrides,
        userName: users.name,
        userEmail: users.email,
      })
      .from(userPricingOverrides)
      .leftJoin(users, eq(userPricingOverrides.userId, users.id)),
  ]);

  return NextResponse.json({
    defaultBlankMarkupPercent: parseInt(setting?.value ?? DEFAULT_MARKUP_VALUE, 10),
    overrides: overrides.map(({ override, userName, userEmail }) => ({
      id: override.id,
      userId: override.userId,
      userName,
      userEmail,
      blankMarkupPercent: override.blankMarkupPercent,
      note: override.note,
      updatedAt: override.updatedAt,
    })),
  });
}

// PUT: Update default markup percentage
export async function PUT(request: NextRequest) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const { defaultBlankMarkupPercent } = await request.json();

  if (typeof defaultBlankMarkupPercent !== "number" || defaultBlankMarkupPercent < 0 || defaultBlankMarkupPercent > 500) {
    return NextResponse.json({ error: "Markup must be 0-500%" }, { status: 400 });
  }

  await db
    .insert(platformSettings)
    .values({
      key: DEFAULT_MARKUP_KEY,
      value: String(defaultBlankMarkupPercent),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: {
        value: String(defaultBlankMarkupPercent),
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ success: true, defaultBlankMarkupPercent });
}

// POST: Create or update a per-user pricing override
export async function POST(request: NextRequest) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const { userId, blankMarkupPercent, note } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  if (typeof blankMarkupPercent !== "number" || blankMarkupPercent < 0 || blankMarkupPercent > 500) {
    return NextResponse.json({ error: "Markup must be 0-500%" }, { status: 400 });
  }

  // Verify user exists
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await db
    .insert(userPricingOverrides)
    .values({
      userId,
      blankMarkupPercent,
      note: note || null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userPricingOverrides.userId,
      set: {
        blankMarkupPercent,
        note: note || null,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ success: true });
}

// DELETE: Remove a per-user pricing override (via query param ?userId=...)
export async function DELETE(request: NextRequest) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  await db
    .delete(userPricingOverrides)
    .where(eq(userPricingOverrides.userId, userId));

  return NextResponse.json({ success: true });
}
