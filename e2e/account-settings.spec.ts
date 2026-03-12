import { test, expect } from "@playwright/test";

/**
 * Account settings: update profile name, change password, login with new password.
 */
test.describe("Account Settings", () => {
  const uniqueId = Date.now();
  const email = `e2e-settings-${uniqueId}@test.com`;
  const originalPassword = "testpass123";
  const newPassword = "newpass456!";

  test.describe.configure({ mode: "serial" });

  let page: import("@playwright/test").Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    // Sign up a fresh user
    await page.goto("/signup");
    await page.getByLabel("Name").fill("Settings Tester");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(originalPassword);
    await page.getByRole("button", { name: "Create Account" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("Settings page loads with profile and password forms", async () => {
    await page.goto("/dashboard/settings");
    await expect(
      page.getByRole("heading", { name: "Settings" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Profile" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Change Password" })
    ).toBeVisible();
  });

  test("Update profile name", async () => {
    await page.goto("/dashboard/settings");

    // Wait for form to load
    await expect(
      page.getByRole("heading", { name: "Profile" })
    ).toBeVisible();

    // The name input is inside the Profile form section
    // Find the input after the "Name" label
    const nameInput = page
      .locator("form")
      .filter({ hasText: "Profile" })
      .locator('input[type="text"]');

    await nameInput.fill("Updated Name");
    await page
      .locator("form")
      .filter({ hasText: "Profile" })
      .getByRole("button", { name: "Save Profile" })
      .click();

    await expect(
      page.getByText("Profile updated successfully")
    ).toBeVisible({ timeout: 5000 });
  });

  test("Dashboard reflects updated name", async () => {
    // Clear cookies and re-login to refresh session with new name
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(originalPassword);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    await expect(
      page.getByText("Welcome back, Updated Name")
    ).toBeVisible();
  });

  test("Change password via settings page", async () => {
    await page.goto("/dashboard/settings");

    await expect(
      page.getByRole("heading", { name: "Change Password" })
    ).toBeVisible();

    const passwordForm = page
      .locator("form")
      .filter({ hasText: "Change Password" });

    // Fill current password, new password, confirm
    const inputs = passwordForm.locator('input[type="password"]');
    await inputs.nth(0).fill(originalPassword);
    await inputs.nth(1).fill(newPassword);
    await inputs.nth(2).fill(newPassword);

    await passwordForm
      .getByRole("button", { name: "Change Password" })
      .click();

    await expect(
      page.getByText("Password changed successfully")
    ).toBeVisible({ timeout: 5000 });
  });

  test("Can login with new password", async () => {
    // Sign out by clearing cookies and navigating to login
    await page.context().clearCookies();
    await page.goto("/login");

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(newPassword);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    await expect(
      page.getByText("Welcome back, Updated Name")
    ).toBeVisible();
  });

  test("Old password no longer works", async () => {
    await page.context().clearCookies();
    await page.goto("/login");

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(originalPassword);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(
      page.getByText(/invalid|incorrect|error/i)
    ).toBeVisible({ timeout: 5000 });
  });
});
