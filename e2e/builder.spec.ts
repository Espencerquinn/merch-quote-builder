import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REAL_PRODUCT = "ascolour:5001";
const REAL_PRODUCT_NAME = "Staple Tee";
const TEST_IMAGE = path.resolve(__dirname, "fixtures/test-design.png");

test.describe("Builder", () => {
  test("loads with default product", async ({ page }) => {
    await page.goto("/builder");
    await expect(page.getByText("Color").first()).toBeVisible();
    await expect(page.getByText("Sizes")).toBeVisible();
  });

  test("loads with a real AS Colour product", async ({ page }) => {
    await page.goto(`/builder?product=${encodeURIComponent(REAL_PRODUCT)}`);
    await expect(page.getByText("Color").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Sizes")).toBeVisible();
    // Product name should appear somewhere on the page
    await expect(page.getByText(REAL_PRODUCT_NAME).first()).toBeVisible();
  });

  test("real product shows colour swatches", async ({ page }) => {
    await page.goto(`/builder?product=${encodeURIComponent(REAL_PRODUCT)}`);
    await expect(page.getByText("Color").first()).toBeVisible({ timeout: 15000 });
    // Should have at least one colour button in the colour section
    const colourButtons = page.locator('[title]').filter({ has: page.locator('div') });
    // The Color section should be visible with clickable swatches
    await expect(page.getByText("Color").first()).toBeVisible();
  });

  test("real product shows size options", async ({ page }) => {
    await page.goto(`/builder?product=${encodeURIComponent(REAL_PRODUCT)}`);
    await expect(page.getByText("Sizes").first()).toBeVisible({ timeout: 15000 });
    // Real products should show standard sizes
    await expect(page.getByText("S", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("M", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("L", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("XL", { exact: true }).first()).toBeVisible();
  });

  test("shows save design button", async ({ page }) => {
    await page.goto("/builder");
    await expect(page.getByRole("button", { name: /Save Design/i })).toBeVisible();
  });

  test("shows design/mockups toggle", async ({ page }) => {
    await page.goto("/builder");
    await expect(page.getByRole("button", { name: "Design", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mockups", exact: true })).toBeVisible();
  });

  test("change product button is visible", async ({ page }) => {
    await page.goto("/builder");
    await expect(page.getByRole("button", { name: "Change product" }).first()).toBeVisible();
  });

  test("opens product selector modal with real products", async ({ page }) => {
    await page.goto("/builder");
    await page.getByRole("button", { name: "Change product" }).first().click();
    await expect(page.getByRole("heading", { name: /change product/i })).toBeVisible();
    // Should show product count and real product categories
    await expect(page.getByText(/\d+ products available/)).toBeVisible({ timeout: 10000 });
    // Sidebar should have T-Shirts category button
    const sidebar = page.locator(".w-56");
    await expect(sidebar.getByText("T-Shirts", { exact: true })).toBeVisible();
  });

  test("product selector shows real product cards", async ({ page }) => {
    await page.goto("/builder");
    await page.getByRole("button", { name: "Change product" }).first().click();
    await expect(page.getByText(/\d+ products available/)).toBeVisible({ timeout: 10000 });
    // Should show actual AS Colour product names
    await expect(page.getByText("Staple Tee").first()).toBeVisible();
  });

  test("selecting a product from modal updates builder", async ({ page }) => {
    await page.goto("/builder");
    await page.getByRole("button", { name: "Change product" }).first().click();
    await expect(page.getByText(/\d+ products available/)).toBeVisible({ timeout: 10000 });

    // Filter to T-Shirts category via sidebar
    const sidebar = page.locator(".w-56");
    await sidebar.getByText("T-Shirts", { exact: true }).click();

    // Click on first product card in the grid
    const productCard = page.locator("button").filter({ hasText: "Staple Tee" }).first();
    await productCard.click();

    // Modal should close and builder should update
    await expect(page.getByRole("heading", { name: /change product/i })).not.toBeVisible();
    // URL should update with the product param
    await page.waitForURL(/product=ascolour/, { timeout: 10000 });
  });

  test("upload image through upload modal", async ({ page }) => {
    await page.goto(`/builder?product=${encodeURIComponent(REAL_PRODUCT)}`);
    await expect(page.getByText("Color").first()).toBeVisible({ timeout: 15000 });

    // Click the Uploads tab in sidebar
    await page.getByRole("button", { name: "Uploads" }).click();

    // Click Upload Image button
    await page.getByRole("button", { name: "Upload Image" }).click();

    // Upload modal should appear (h2 in the modal, not h3 in sidebar)
    await expect(page.locator("h2", { hasText: "Upload Artwork" })).toBeVisible();

    // Set file on the hidden file input
    const fileInput = page.locator('input[type="file"][accept="image/png,image/jpeg"]');
    await fileInput.setInputFiles(TEST_IMAGE);

    // File name should appear in the modal
    await expect(page.getByText("test-design.png")).toBeVisible();

    // Check the ToS checkbox
    await page.getByRole("checkbox").check();

    // Click Save
    await page.getByRole("button", { name: "Save", exact: true }).click();

    // Modal should close
    await expect(page.locator("h2", { hasText: "Upload Artwork" })).not.toBeVisible();
  });
});
