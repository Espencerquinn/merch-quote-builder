import { test, expect } from "@playwright/test";

test.describe("Builder", () => {
  test("loads with default product", async ({ page }) => {
    await page.goto("/builder");
    // Builder should show a canvas area and controls
    await expect(page.getByText("Color")).toBeVisible();
    await expect(page.getByText("Sizes")).toBeVisible();
  });

  test("shows save design button", async ({ page }) => {
    await page.goto("/builder");
    await expect(page.getByRole("button", { name: /Save Design/i })).toBeVisible();
  });

  test("shows design/mockups toggle", async ({ page }) => {
    await page.goto("/builder");
    await expect(page.getByRole("button", { name: "Design" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mockups" })).toBeVisible();
  });

  test("change product button is visible", async ({ page }) => {
    await page.goto("/builder");
    await expect(page.getByText("Change product")).toBeVisible();
  });

  test("opens product selector modal", async ({ page }) => {
    await page.goto("/builder");
    await page.getByText("Change product").click();
    // Modal should appear with product list or loading state
    await expect(page.getByText(/Select a Product|Loading/i)).toBeVisible();
  });
});
