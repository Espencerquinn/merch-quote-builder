import { test, expect } from "@playwright/test";

test.describe("Public Storefront", () => {
  test("shows not-found message for non-existent store", async ({ page }) => {
    // With SPA routing, the server always returns 200; check for not-found UI instead
    await page.goto("/store/00000000-0000-0000-0000-000000000000");
    await expect(page.getByRole("heading", { name: "Store Not Found" })).toBeVisible();
    await expect(page.getByText("doesn't exist or isn't published")).toBeVisible();
  });

  test("not-found page has a link home", async ({ page }) => {
    await page.goto("/store/00000000-0000-0000-0000-000000000001");
    await expect(page.getByRole("link", { name: "Go Home" })).toBeVisible();
  });
});
