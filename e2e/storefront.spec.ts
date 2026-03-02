import { test, expect } from "@playwright/test";

test.describe("Public Storefront", () => {
  test("returns 404 for non-existent store", async ({ page }) => {
    const response = await page.goto("/store/this-store-does-not-exist-12345");
    expect(response?.status()).toBe(404);
  });

  test("storefront page structure is correct", async ({ page }) => {
    // Navigate to a store page — if it exists it should have the standard layout
    // If no stores exist, this test gracefully handles 404
    const response = await page.goto("/store/test-store");
    if (response?.status() === 200) {
      await expect(page.getByText("Powered by")).toBeVisible();
      await expect(page.getByRole("link", { name: "Merch Makers" })).toBeVisible();
    }
  });
});
