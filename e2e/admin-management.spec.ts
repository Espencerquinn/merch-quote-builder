import { test, expect } from "@playwright/test";
import {
  signInAndGetToken,
  signUpUser,
  callEdgeFunction,
  restQuery,
} from "./helpers";

/**
 * Admin management: admin pages load, role management, pricing management,
 * dashboard orders page.
 *
 * Uses Supabase edge functions (admin-users) and REST API for pricing/user ops.
 */
test.describe("Admin Management", () => {
  test.describe.configure({ mode: "serial" });

  let page: import("@playwright/test").Page;
  let adminToken: string;
  let regularUserId: string;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    // Get admin auth token
    adminToken = await signInAndGetToken(
      "austin@merchmakers.com",
      "testpassword123"
    );

    // Login via UI
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("austin@merchmakers.com");
    await page.getByLabel(/password/i).fill("testpassword123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Create a regular user via Supabase Auth signup
    const { userId } = await signUpUser(
      `e2e-regular-${Date.now()}@test.com`,
      "testpass123",
      "Regular User"
    );
    regularUserId = userId;
  });

  test.afterAll(async () => {
    await page.close();
  });

  // --- Admin pages load ---

  test("Admin overview page loads", async () => {
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Platform Overview" })
    ).toBeVisible();
    await expect(page.getByText("Total Revenue")).toBeVisible();
  });

  test("Admin users page loads", async () => {
    await page.goto("/admin/users");
    await expect(
      page.getByRole("heading", { name: /users/i })
    ).toBeVisible();
  });

  test("Admin orders page loads", async () => {
    await page.goto("/admin/orders");
    await expect(
      page.getByRole("heading", { name: /orders/i })
    ).toBeVisible();
  });

  test("Admin products page loads", async () => {
    await page.goto("/admin/products");
    await expect(
      page.getByRole("heading", { name: "Products", exact: true })
    ).toBeVisible();
  });

  test("Admin pricing page loads", async () => {
    await page.goto("/admin/pricing");
    await expect(
      page.getByRole("heading", { name: "Pricing Controls" })
    ).toBeVisible();
  });

  test("Admin providers page loads", async () => {
    await page.goto("/admin/providers");
    await expect(
      page.getByRole("heading", { name: /provider/i })
    ).toBeVisible();
  });

  test("Admin quotes page loads", async () => {
    await page.goto("/admin/quotes");
    await expect(
      page.getByRole("heading", { name: /quotes/i })
    ).toBeVisible();
  });

  // --- Admin API operations (role management via edge function) ---

  test("Change user role to admin via API", async () => {
    const res = await callEdgeFunction("admin-users", {
      body: { userId: regularUserId, role: "admin" },
      token: adminToken,
    });
    expect(res.ok).toBeTruthy();
  });

  test("Change user role back to user via API", async () => {
    const res = await callEdgeFunction("admin-users", {
      body: { userId: regularUserId, role: "user" },
      token: adminToken,
    });
    expect(res.ok).toBeTruthy();
  });

  test("Cannot set invalid role via API", async () => {
    const res = await callEdgeFunction("admin-users", {
      body: { userId: regularUserId, role: "superadmin" },
      token: adminToken,
    });
    expect(res.status).toBe(400);
  });

  // --- Pricing management via REST API ---

  test("Get default pricing via REST API", async () => {
    const res = await restQuery("platform_settings", {
      query: "select=*",
      token: adminToken,
    });
    expect(res.ok).toBeTruthy();
    const data = await res.json();
    // Platform settings should exist (may be empty initially)
    expect(Array.isArray(data)).toBeTruthy();
  });

  test("Update default markup via REST API", async () => {
    // Upsert platform_settings
    const res = await restQuery("platform_settings", {
      method: "POST",
      body: {
        key: "default_blank_markup_percent",
        value: "40",
      },
      token: adminToken,
      headers: {
        Prefer: "return=representation,resolution=merge-duplicates",
      },
    });
    expect(res.ok).toBeTruthy();
  });

  test("Create user pricing override via REST API", async () => {
    const res = await restQuery("user_pricing_overrides", {
      method: "POST",
      body: {
        id: crypto.randomUUID(),
        user_id: regularUserId,
        blank_markup_percent: 25,
        note: "E2E test override",
      },
      token: adminToken,
      headers: { Prefer: "return=representation" },
    });
    expect(res.ok).toBeTruthy();
  });

  test("Verify override appears in pricing data", async () => {
    const res = await restQuery("user_pricing_overrides", {
      query: `user_id=eq.${regularUserId}&select=*`,
      token: adminToken,
    });
    const data = await res.json();
    expect(data.length).toBeGreaterThan(0);
    const override = data[0];
    expect(override.blank_markup_percent).toBe(25);
    expect(override.note).toBe("E2E test override");
  });

  test("Delete user pricing override via REST API", async () => {
    const res = await restQuery("user_pricing_overrides", {
      method: "DELETE",
      query: `user_id=eq.${regularUserId}`,
      token: adminToken,
    });
    expect(res.ok).toBeTruthy();
  });

  // --- Dashboard orders page ---

  test("Dashboard orders page loads (empty state)", async () => {
    await page.goto("/dashboard/orders");
    await expect(
      page.getByRole("heading", { name: "Orders", exact: true }).first()
    ).toBeVisible();
    await expect(page.getByText("No orders yet")).toBeVisible();
  });
});
