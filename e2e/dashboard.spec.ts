import { test, expect } from "@playwright/test";

// Helper to log in before tests
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("austin@merchmakers.com");
  await page.getByLabel(/password/i).fill("testpassword123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

test.describe("Dashboard", () => {
  test("shows sidebar navigation after login", async ({ page }) => {
    await login(page);
    await expect(page.getByText("Merch Makers")).toBeVisible();
    await expect(page.getByText("Sign Out")).toBeVisible();
  });

  test("can navigate to products section", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: /products/i }).first().click();
    await page.waitForURL(/\/dashboard\/products/);
  });

  test("can navigate to stores section", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: /stores/i }).first().click();
    await page.waitForURL(/\/dashboard\/stores/);
  });
});
