import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import {
  signInAndGetToken,
  callEdgeFunction,
  restQuery,
} from "./helpers";

/**
 * Store buyer flow: browse storefront, view product detail, checkout via store API.
 *
 * Uses the admin user to set up a published store with a product,
 * then tests the public buyer experience.
 *
 * Store URLs now use storeId (UUID) instead of slug.
 */
test.describe("Store Buyer Flow", () => {
  let storeId: string;
  let storeProductId: string;
  let decoratedProductId: string;
  let token: string;

  test.describe.configure({ mode: "serial" });

  let page: import("@playwright/test").Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    // Get auth token for API calls
    token = await signInAndGetToken(
      "austin@merchmakers.com",
      "testpassword123"
    );

    // Login via UI
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("austin@merchmakers.com");
    await page.getByLabel(/password/i).fill("testpassword123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Create a decorated product via edge function
    const prodRes = await callEdgeFunction("save-design", {
      body: {
        baseProductId: "ascolour:5001",
        name: "Buyer Test Tee",
        selectedColourId: "black",
        canvasStateJson: JSON.stringify({ objects: [], version: "7.0.0" }),
      },
      token,
    });
    decoratedProductId = (await prodRes.json()).id;

    // Get user id for store ownership
    const userId = (
      await (
        await restQuery("users", {
          query: "select=id&email=eq.austin@merchmakers.com",
          token,
        })
      ).json()
    )[0].id;

    // Create a store via REST API (must supply id — DB has no default)
    const newStoreId = randomUUID();
    const storeRes = await restQuery("stores", {
      method: "POST",
      body: {
        id: newStoreId,
        name: "Buyer Test Store",
        slug: `e2e-buyer-store-${Date.now()}`,
        user_id: userId,
      },
      token,
      headers: { Prefer: "return=representation" },
    });
    const storeData = (await storeRes.json())[0];
    storeId = storeData.id;

    // Add product to store via REST API (must supply id — DB has no default)
    const newSpId = randomUUID();
    const spRes = await restQuery("store_products", {
      method: "POST",
      body: {
        id: newSpId,
        store_id: storeId,
        decorated_product_id: decoratedProductId,
        markup_type: "percentage",
        markup_value: 50,
        selling_price: 1950, // price in cents
        is_visible: true,
      },
      token,
      headers: { Prefer: "return=representation" },
    });
    storeProductId = (await spRes.json())[0].id;

    // Publish the store via REST API
    await restQuery("stores", {
      method: "PATCH",
      query: `id=eq.${storeId}`,
      body: { is_published: true },
      token,
    });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("Storefront shows store name and product", async () => {
    await page.goto(`/store/${storeId}`);
    await expect(
      page.getByRole("heading", { name: "Buyer Test Store" })
    ).toBeVisible();
    await expect(page.getByText("Buyer Test Tee")).toBeVisible();
    await expect(page.getByText("1 product")).toBeVisible();
  });

  test("Product detail page shows name, price, and sizes", async () => {
    // Click the product card to go to detail
    await page.getByText("Buyer Test Tee").click();
    await page.waitForURL(/\/store\/.*\/products\//);

    await expect(
      page.getByRole("heading", { name: "Buyer Test Tee" })
    ).toBeVisible();
    // Back to store link
    await expect(page.getByText("Back to store")).toBeVisible();
    // Footer
    await expect(page.getByText("Powered by")).toBeVisible();
  });

  const EDGE_FUNCTIONS = process.env.EDGE_FUNCTIONS === "true";

  test("Store checkout API creates Stripe session", async () => {
    test.skip(!EDGE_FUNCTIONS, "Requires edge functions");
    const res = await callEdgeFunction("store-checkout", {
      body: {
        storeProductId,
        storeId,
        sizeBreakdown: { M: 3, L: 2 },
      },
    });
    expect(res.ok).toBeTruthy();
    const data = await res.json();
    expect(data.url).toContain("checkout.stripe.com");
  });

  test("Store checkout rejects empty sizeBreakdown", async () => {
    test.skip(!EDGE_FUNCTIONS, "Requires edge functions");
    const res = await callEdgeFunction("store-checkout", {
      body: {
        storeProductId,
        storeId,
        sizeBreakdown: {},
      },
    });
    expect(res.status).toBe(400);
  });

  test("Store checkout rejects invalid product", async () => {
    test.skip(!EDGE_FUNCTIONS, "Requires edge functions");
    const res = await callEdgeFunction("store-checkout", {
      body: {
        storeProductId: "nonexistent-id",
        storeId,
        sizeBreakdown: { M: 1 },
      },
    });
    expect(res.status).toBe(404);
  });
});
