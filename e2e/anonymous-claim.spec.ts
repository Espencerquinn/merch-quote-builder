import { test, expect } from "@playwright/test";
import {
  callEdgeFunction,
  signUpUser,
  restQuery,
  signInAndGetToken,
} from "./helpers";

/**
 * Anonymous design claim flow:
 * Save a design without auth -> get claimToken -> sign up -> claim -> verify ownership.
 *
 * Uses Supabase edge functions (save-design, claim-design) and Supabase Auth signup.
 * Requires `supabase functions serve` to be running.
 */
// These tests require `supabase functions serve` to be running
const EDGE_FUNCTIONS_AVAILABLE = process.env.EDGE_FUNCTIONS === "true";

test.describe("Anonymous Design Claim", () => {
  test.skip(!EDGE_FUNCTIONS_AVAILABLE, "Skipped: set EDGE_FUNCTIONS=true when edge functions are running");

  const uniqueId = Date.now();
  const email = `e2e-anon-${uniqueId}@test.com`;
  const password = "testpass123";

  test.describe.configure({ mode: "serial" });

  let page: import("@playwright/test").Page;
  let anonContext: import("@playwright/test").BrowserContext;
  let decoratedProductId: string;
  let claimToken: string;
  let authToken: string;

  test.beforeAll(async ({ browser }) => {
    // Create an anonymous context (no auth cookies)
    anonContext = await browser.newContext();
    page = await anonContext.newPage();
  });

  test.afterAll(async () => {
    await page.close();
    await anonContext.close();
  });

  test("Anonymous user can save a design and gets claim token", async () => {
    // Call save-design edge function without auth token
    const res = await callEdgeFunction("save-design", {
      body: {
        baseProductId: "static:default",
        name: "Anonymous Design",
        selectedColourId: "white",
        canvasStateJson: JSON.stringify({
          objects: [],
          version: "7.0.0",
        }),
      },
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    decoratedProductId = data.id;
    claimToken = data.claimToken;
    expect(decoratedProductId).toBeTruthy();
    expect(claimToken).toBeTruthy();
  });

  test("Design exists but has no owner", async () => {
    const res = await restQuery("decorated_products", {
      query: `id=eq.${decoratedProductId}&select=id,user_id,name`,
    });
    expect(res.ok).toBeTruthy();
    const data = await res.json();
    expect(data.length).toBe(1);
    expect(data[0].user_id).toBeNull();
    expect(data[0].name).toBe("Anonymous Design");
  });

  test("Sign up a new user", async () => {
    await page.goto("/signup");
    await page.getByLabel("Name").fill("Claim Tester");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create Account" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Get the auth token for API calls
    authToken = await signInAndGetToken(email, password);
  });

  test("Claim the anonymous design", async () => {
    // claim-design edge function expects { token } (not claimToken)
    const res = await callEdgeFunction("claim-design", {
      body: { token: claimToken },
      token: authToken,
    });
    expect(res.ok).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.decoratedProductId).toBe(decoratedProductId);
  });

  test("Claimed design appears in user dashboard", async () => {
    await page.goto("/dashboard/products");
    await expect(page.getByText("Anonymous Design")).toBeVisible();
  });

  test("Claim token cannot be reused", async () => {
    const res = await callEdgeFunction("claim-design", {
      body: { token: claimToken },
      token: authToken,
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid or expired");
  });
});
