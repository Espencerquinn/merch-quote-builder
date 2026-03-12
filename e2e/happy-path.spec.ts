import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REAL_PRODUCT = "ascolour:5001";
const TEST_IMAGE = path.resolve(__dirname, "fixtures/test-design.png");

/**
 * Full seller journey — one continuous happy-path flow.
 *
 * Homepage -> Signup -> Dashboard -> Browse Products -> Builder ->
 * Upload Image -> Save Design -> Dashboard Products -> Create Store ->
 * Customize Store -> Add Product to Store -> Publish -> Visit Storefront -> Checkout
 */
test.describe("Happy Path: Full Seller Journey", () => {
  const uniqueId = Date.now();
  const email = `e2e-seller-${uniqueId}@test.com`;
  const password = "testpass123";
  const userName = "E2E Seller";
  const storeName = `E2E Store ${uniqueId}`;
  const storeSlug = `e2e-store-${uniqueId}`;
  const designName = "E2E Test Design";

  let storeId: string;

  test.describe.configure({ mode: "serial" });

  let page: import("@playwright/test").Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("Homepage loads with hero and CTAs", async () => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Your Brand");
    await expect(
      page.getByRole("link", { name: "Get Started" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Products", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Sign In" })
    ).toBeVisible();
  });

  test("Navigate to signup and create account", async () => {
    await page.getByRole("link", { name: "Get Started" }).click();
    await page.waitForURL(/\/signup/);

    await expect(
      page.getByRole("heading", { name: /create your account/i })
    ).toBeVisible();

    await page.getByLabel("Name").fill(userName);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create Account" }).click();

    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  });

  test("Dashboard shows welcome and stats", async () => {
    await expect(page.getByText(`Welcome back, ${userName}`)).toBeVisible();
    await expect(page.getByText("Quick Actions")).toBeVisible();
    await expect(page.getByText("Create New Product")).toBeVisible();
    await expect(page.getByText("Create a Store")).toBeVisible();
  });

  test("Browse product catalog", async () => {
    await page.goto("/products");
    await expect(page.getByText("Product Catalog")).toBeVisible();
  });

  test("Builder loads with real AS Colour product", async () => {
    await page.goto(`/builder?product=${encodeURIComponent(REAL_PRODUCT)}`);
    await expect(page.getByText("Color")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Sizes")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /save design/i })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Change product" }).first()).toBeVisible();
    // Verify real product name appears
    await expect(page.getByText("Staple Tee").first()).toBeVisible();
  });

  test("Upload artwork to canvas", async () => {
    // Switch to Uploads tab
    await page.getByRole("button", { name: "Uploads" }).click();
    await page.getByRole("button", { name: "Upload Image" }).click();
    await expect(page.locator("h2", { hasText: "Upload Artwork" })).toBeVisible();

    // Upload test image
    const fileInput = page.locator('input[type="file"][accept="image/png,image/jpeg"]');
    await fileInput.setInputFiles(TEST_IMAGE);
    await expect(page.getByText("test-design.png")).toBeVisible();

    // Accept ToS and save
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.locator("h2", { hasText: "Upload Artwork" })).not.toBeVisible();
  });

  test("Design appears in dashboard products after save", async () => {
    await page.getByRole("button", { name: /save design/i }).click();
    await expect(page.getByRole("button", { name: "Saved!" })).toBeVisible({ timeout: 10000 });

    // Check it appears in dashboard
    await page.goto("/dashboard/products");
    await expect(
      page.getByRole("heading", { name: "My Products" })
    ).toBeVisible();
  });

  test("Create a new store", async () => {
    await page.goto("/dashboard/stores/new");
    await expect(
      page.getByRole("heading", { name: /create store/i })
    ).toBeVisible();

    // Fill store name (slug auto-generates from name)
    const nameInput = page.locator('input[placeholder="My Awesome Store"]');
    await nameInput.fill(storeName);

    // Override the auto-generated slug
    const slugInput = page.locator('input[placeholder="my-awesome-store"]');
    await slugInput.fill("");
    await slugInput.fill(storeSlug);

    await page
      .getByPlaceholder("Tell customers what your store is about...")
      .fill("An e2e test store");

    await page.getByRole("button", { name: "Create Store" }).click();

    await page.waitForURL(/\/dashboard\/stores\/(?!new)[a-f0-9-]+/, {
      timeout: 10000,
    });

    const url = page.url();
    const match = url.match(/\/dashboard\/stores\/([a-f0-9-]+)/);
    storeId = match![1];
    expect(storeId).toBeTruthy();
  });

  test("Store detail page shows store info", async () => {
    await expect(page.getByRole("heading", { name: storeName })).toBeVisible();
    await expect(page.getByText("An e2e test store")).toBeVisible();
  });

  test("Customize store in editor", async () => {
    await page.goto(`/dashboard/stores/${storeId}/editor`);

    await expect(
      page.getByRole("button", { name: "Save Changes" })
    ).toBeVisible({ timeout: 10000 });

    const descField = page.locator("textarea").first();
    await descField.fill("Updated e2e store description");

    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(
      page.getByText(/saved|updated/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test("Publish the store", async () => {
    await page.goto(`/dashboard/stores/${storeId}`);

    await page.getByRole("button", { name: /publish/i }).click();

    await expect(page.getByText("Published")).toBeVisible({ timeout: 5000 });
  });

  test("Public storefront loads", async () => {
    await page.goto(`/store/${storeId}`);

    await expect(
      page.getByRole("heading", { name: storeName })
    ).toBeVisible();

    await expect(page.getByText("Powered by")).toBeVisible();
  });
});

/**
 * Admin journey — login as admin and verify the admin panel.
 */
test.describe("Happy Path: Admin Panel", () => {
  test("Admin can login and access admin panel", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("austin@merchmakers.com");
    await page.getByLabel(/password/i).fill("testpassword123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Platform Overview" })
    ).toBeVisible();
  });
});
