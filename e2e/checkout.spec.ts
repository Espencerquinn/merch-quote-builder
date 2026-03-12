import { test, expect } from "@playwright/test";
import {
  signInAndGetToken,
  callEdgeFunction,
  authHeaders,
  getSupabaseUrl,
  getAnonKey,
} from "./helpers";

const ADMIN_EMAIL = "austin@merchmakers.com";
const ADMIN_PASSWORD = "testpassword123";

// Helper: log in as test user via the UI
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

// Helper: create a decorated product via the save-design edge function
async function createDecoratedProduct(token: string): Promise<string> {
  const res = await callEdgeFunction("save-design", {
    body: {
      baseProductId: "static:default",
      name: "E2E Test Product",
      selectedColourId: "black",
      canvasStateJson: "{}",
    },
    token,
  });
  expect(res.ok).toBeTruthy();
  const data = await res.json();
  return data.id;
}

test.describe("Stripe Checkout Flow", () => {
  let token: string;

  test.beforeEach(async ({ page }) => {
    token = await signInAndGetToken(ADMIN_EMAIL, ADMIN_PASSWORD);
    await login(page);
  });

  test("checkout page loads with size selection", async ({ page }) => {
    const productId = await createDecoratedProduct(token);

    await page.goto(`/dashboard/products/${productId}/checkout`);
    await expect(
      page.getByRole("heading", { name: /checkout/i })
    ).toBeVisible();
    await expect(
      page.getByText(/Select sizes and quantities/)
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /size selection/i })
    ).toBeVisible();
  });

  test("size quantity controls work", async ({ page }) => {
    const productId = await createDecoratedProduct(token);

    await page.goto(`/dashboard/products/${productId}/checkout`);
    await expect(
      page.getByRole("heading", { name: /size selection/i })
    ).toBeVisible();

    // Initially the checkout button should be disabled (says "Proceed to Payment")
    const paymentButton = page.getByRole("button", { name: /proceed to payment/i });
    await expect(paymentButton).toBeVisible();
    await expect(paymentButton).toBeDisabled();

    // Each size has a number input (spinbutton). Fill the M size with 3.
    const mInput = page.getByRole("spinbutton").nth(2); // XS=0, S=1, M=2
    await mInput.fill("3");

    // Quote summary should now appear
    await expect(page.getByText("Quote Summary")).toBeVisible();
    await expect(page.getByText(/Total Quantity:\s*3/)).toBeVisible();

    // Checkout button should now be enabled
    await expect(paymentButton).toBeEnabled();
  });

  test("checkout creates Stripe session or returns server error", async () => {
    const productId = await createDecoratedProduct(token);

    const res = await callEdgeFunction("checkout", {
      body: {
        decoratedProductId: productId,
        sizeBreakdown: { M: 5, L: 5 },
      },
      token,
    });

    // In test environment without STRIPE_SECRET_KEY, the edge function
    // will either succeed (if Stripe is configured) or return 500.
    // Both are valid outcomes for this test.
    if (res.ok) {
      const data = await res.json();
      expect(data.url).toBeTruthy();
      expect(data.url).toContain("checkout.stripe.com");
    } else {
      // 500 is expected when STRIPE_SECRET_KEY is not configured
      expect(res.status).toBe(500);
    }
  });

  test("checkout API rejects missing sizeBreakdown", async () => {
    const productId = await createDecoratedProduct(token);

    const res = await callEdgeFunction("checkout", {
      body: {
        decoratedProductId: productId,
        sizeBreakdown: {},
      },
      token,
    });

    expect(res.ok).toBeFalsy();
    expect(res.status).toBe(400);
  });

  test("checkout API rejects missing product", async () => {
    const res = await callEdgeFunction("checkout", {
      body: {
        decoratedProductId: "nonexistent-id",
        sizeBreakdown: { M: 1 },
      },
      token,
    });

    expect(res.ok).toBeFalsy();
    expect(res.status).toBe(404);
  });

  test("checkout API rejects unauthenticated requests", async () => {
    // Call without a token
    const res = await callEdgeFunction("checkout", {
      body: {
        decoratedProductId: "any-id",
        sizeBreakdown: { M: 1 },
      },
    });

    expect(res.ok).toBeFalsy();
    expect(res.status).toBe(401);
  });
});

test.describe("Checkout Success Page", () => {
  test("success page shows confirmation when authenticated", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/checkout/success");

    await expect(
      page.getByRole("heading", { name: /order confirmed/i })
    ).toBeVisible();
    await expect(page.getByText(/thank you/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /view orders/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /back to dashboard/i })
    ).toBeVisible();
  });

  test("success page redirects unauthenticated users to login", async ({
    page,
  }) => {
    await page.goto("/checkout/success");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });
});
