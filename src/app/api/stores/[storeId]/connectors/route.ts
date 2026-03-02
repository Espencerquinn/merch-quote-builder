import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stores, storeConnectors } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createConnector } from "@/lib/connectors/registry";

// POST: Add a connector to a store
export async function POST(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const store = await db.query.stores.findFirst({
      where: and(eq(stores.id, storeId), eq(stores.userId, session.user.id)),
    });
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const { platform, credentials } = await request.json();

    if (!platform || !credentials) {
      return NextResponse.json({ error: "Platform and credentials are required" }, { status: 400 });
    }

    // Test connection before saving
    try {
      const connector = createConnector(platform, credentials);
      const result = await connector.testConnection();
      if (!result.success) {
        return NextResponse.json(
          { error: `Connection failed: ${result.message}` },
          { status: 400 }
        );
      }
    } catch (err) {
      return NextResponse.json(
        { error: `Invalid credentials: ${err instanceof Error ? err.message : "Unknown error"}` },
        { status: 400 }
      );
    }

    const [connector] = await db
      .insert(storeConnectors)
      .values({
        storeId,
        platform,
        credentials: JSON.stringify(credentials),
        externalStoreUrl: credentials.storeUrl || credentials.siteUrl || null,
        status: "connected",
      })
      .returning();

    return NextResponse.json(connector, { status: 201 });
  } catch (error) {
    console.error("Error creating connector:", error);
    return NextResponse.json({ error: "Failed to create connector" }, { status: 500 });
  }
}

// GET: List connectors for a store
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const store = await db.query.stores.findFirst({
      where: and(eq(stores.id, storeId), eq(stores.userId, session.user.id)),
    });
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const connectors = await db
      .select()
      .from(storeConnectors)
      .where(eq(storeConnectors.storeId, storeId));

    // Strip credentials from response
    const safe = connectors.map(({ credentials, ...rest }) => ({
      ...rest,
      hasCredentials: !!credentials,
    }));

    return NextResponse.json({ data: safe });
  } catch (error) {
    console.error("Error fetching connectors:", error);
    return NextResponse.json({ error: "Failed to fetch connectors" }, { status: 500 });
  }
}
