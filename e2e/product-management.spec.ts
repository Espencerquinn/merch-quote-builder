import { test, expect } from "@playwright/test";
import {
  signInAndGetToken,
  getUserIdFromToken,
  restQuery,
} from "./helpers";

/**
 * Product management flow: view detail, edit via API, delete via API.
 *
 * Uses Supabase edge functions for save-design and REST API for CRUD on
 * the decorated_products table.
 */
test.describe("Product Management", () => {
  const email = "austin@merchmakers.com";
  const password = "testpassword123";

  test.describe.configure({ mode: "serial" });

  let page: import("@playwright/test").Page;
  let token: string;
  let productId: string;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    token = await signInAndGetToken(email, password);

    // Login via UI
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Create a decorated product via REST API
    productId = crypto.randomUUID();
    const userId = getUserIdFromToken(token);
    const res = await restQuery("decorated_products", {
      method: "POST",
      body: {
        id: productId,
        user_id: userId,
        base_product_id: "ascolour:5001",
        name: "Mgmt Test Design",
        selected_colour_id: "black",
        canvas_state_json: JSON.stringify({ objects: [], version: "7.0.0" }),
        status: "draft",
      },
      token,
      headers: { Prefer: "return=representation" },
    });
    expect(res.ok).toBeTruthy();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("Product detail page loads with actions", async () => {
    await page.goto(`/dashboard/products/${productId}`);
    await expect(
      page.getByRole("heading", { name: "Mgmt Test Design" })
    ).toBeVisible();
    await expect(page.getByText("ascolour:5001")).toBeVisible();
    await expect(page.getByText("black")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Edit Design" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Buy This Product" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add to Store" })
    ).toBeVisible();
  });

  test("Edit Design links to builder with edit param", async () => {
    const editLink = page.getByRole("link", { name: "Edit Design" });
    const href = await editLink.getAttribute("href");
    expect(href).toContain(`edit=${productId}`);
    expect(href).toContain("product=ascolour%3A5001");
  });

  test("Update product via REST API", async () => {
    const res = await restQuery("decorated_products", {
      method: "PATCH",
      query: `id=eq.${productId}`,
      body: { name: "Renamed Design" },
      token,
      headers: { Prefer: "return=representation" },
    });
    expect(res.ok).toBeTruthy();
    const data = await res.json();
    expect(data[0].name).toBe("Renamed Design");
  });

  test("Updated name appears on detail page", async () => {
    await page.goto(`/dashboard/products/${productId}`);
    await expect(
      page.getByRole("heading", { name: "Renamed Design" })
    ).toBeVisible();
  });

  test("Delete product via REST API", async () => {
    const res = await restQuery("decorated_products", {
      method: "DELETE",
      query: `id=eq.${productId}`,
      token,
    });
    expect(res.ok).toBeTruthy();
  });

  test("Deleted product returns empty from REST API", async () => {
    const res = await restQuery("decorated_products", {
      query: `id=eq.${productId}`,
      token,
    });
    const data = await res.json();
    expect(data.length).toBe(0);
  });

  test("Products list no longer shows deleted product", async () => {
    await page.goto("/dashboard/products");
    await expect(page.getByText("Renamed Design")).not.toBeVisible();
  });
});
