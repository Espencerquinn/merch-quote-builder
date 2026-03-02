import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads and shows hero section", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Your Brand");
    await expect(page.locator("h1")).toContainText("Your Merch Store");
  });

  test("shows navigation links", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Products" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign In" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Get Started" })).toBeVisible();
  });

  test("shows How It Works section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("How It Works")).toBeVisible();
    await expect(page.getByText("Choose a Product")).toBeVisible();
    await expect(page.getByText("Design It")).toBeVisible();
    await expect(page.getByText("Launch Your Store")).toBeVisible();
    await expect(page.getByText("Start Selling")).toBeVisible();
  });

  test("shows features section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Everything You Need")).toBeVisible();
    await expect(page.getByText("Visual Designer")).toBeVisible();
    await expect(page.getByText("Branded Storefronts")).toBeVisible();
  });

  test("Browse Products link navigates to products page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Browse Products" }).first().click();
    await expect(page).toHaveURL("/products");
  });

  test("footer shows correct year", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("2026 Merch Makers")).toBeVisible();
  });
});
