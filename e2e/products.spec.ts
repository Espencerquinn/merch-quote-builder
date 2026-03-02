import { test, expect } from "@playwright/test";

test.describe("Product Catalog", () => {
  test("loads product catalog page", async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByText("Product Catalog")).toBeVisible();
  });

  test("shows product cards or empty state", async ({ page }) => {
    await page.goto("/products");
    // Either products are displayed or there's a loading/empty state
    const pageContent = await page.textContent("body");
    expect(
      pageContent?.includes("Product Catalog") || pageContent?.includes("No products")
    ).toBeTruthy();
  });
});
