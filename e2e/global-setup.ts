import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { execSync, spawn } from "child_process";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * Ensure `supabase functions serve --no-verify-jwt` is running.
 * The built-in edge runtime has a known ES256 JWT verification bug
 * (jose@v4 can't handle CryptoKey), so we use `functions serve` which
 * bypasses the built-in JWT gate while functions still do their own auth.
 */
function ensureFunctionsServe() {
  try {
    const ps = execSync("pgrep -f 'supabase functions serve'", { encoding: "utf-8" }).trim();
    if (ps) {
      console.log("[e2e] Edge functions serve already running.");
      return;
    }
  } catch {
    // pgrep returns exit code 1 if no match — start the process
  }

  console.log("[e2e] Starting supabase functions serve --no-verify-jwt...");
  const child = spawn("supabase", ["functions", "serve", "--no-verify-jwt"], {
    stdio: "ignore",
    detached: true,
  });
  child.unref();
  // Give it a moment to bind
  execSync("sleep 2");
  console.log("[e2e] Edge functions serve started.");
}

export default async function globalSetup() {
  ensureFunctionsServe();

  const sql = postgres(DATABASE_URL, { max: 1 });

  console.log("[e2e] Resetting database...");

  // Truncate user-generated tables (CASCADE handles FKs)
  // NOTE: products, sync_log, and sync_changes are preserved — they contain
  // expensive-to-fetch provider data (images, variants, pricing) seeded from
  // supabase/seed.sql. Truncating them would require a full re-sync (~8 min).
  await sql`
    TRUNCATE TABLE
      order_items, orders,
      anonymous_claim_tokens,
      store_products, store_connectors, stores,
      decorated_products,
      quotes,
      platform_settings, user_pricing_overrides,
      users
    CASCADE
  `;

  // Seed admin user via Supabase Auth (so auth.users + public.users are in sync)
  if (SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Delete existing auth users
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    await Promise.all(
      (existingUsers?.users || []).map((u) => supabase.auth.admin.deleteUser(u.id))
    );

    // Create admin user
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: "austin@merchmakers.com",
      password: "testpassword123",
      email_confirm: true,
      user_metadata: { name: "Austin" },
      app_metadata: { role: "admin" },
    });

    if (error) {
      console.error("[e2e] Failed to create admin user via Supabase Auth:", error);
      // Fallback: insert directly into users table
      await sql`
        INSERT INTO users (id, email, name, role, created_at, updated_at)
        VALUES (${crypto.randomUUID()}, 'austin@merchmakers.com', 'Austin', 'admin', NOW(), NOW())
      `;
    } else {
      // The trigger should auto-create the users row, but ensure it exists
      await sql`
        INSERT INTO users (id, email, name, role, created_at, updated_at)
        VALUES (${newUser.user.id}, 'austin@merchmakers.com', 'Austin', 'admin', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET role = 'admin', name = 'Austin'
      `;
    }
  } else {
    console.warn("[e2e] No SUPABASE_SERVICE_ROLE_KEY — seeding user directly in DB (auth won't work)");
    await sql`
      INSERT INTO users (id, email, name, role, created_at, updated_at)
      VALUES (${crypto.randomUUID()}, 'austin@merchmakers.com', 'Austin', 'admin', NOW(), NOW())
    `;
  }

  console.log("[e2e] Database reset complete. Admin user seeded.");
  await sql.end();
}
