import { test, expect } from "@playwright/test";

test.describe("Product Catalog", () => {
  test("loads product catalog page", async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByText("Product Catalog")).toBeVisible();
  });

  test("shows real product cards from seed data", async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByText("Product Catalog")).toBeVisible();
    // Should show real AS Colour products from seeded data
    await expect(page.getByText("T-Shirts").first()).toBeVisible({ timeout: 10000 });
  });

  test("product cards have thumbnails", async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByText("Product Catalog")).toBeVisible();
    // Wait for product images to load
    const images = page.locator("img[src*='bigcommerce.com']");
    await expect(images.first()).toBeVisible({ timeout: 10000 });
    const count = await images.count();
    expect(count).toBeGreaterThan(0);
  });
});
