import { test, expect } from "@playwright/test";

/**
 * Smoke tests for Ironframe (App Router routes).
 * Purpose: catch runtime crashes even if build succeeds.
 */
const ROUTES = ["/", "/audit-trail", "/reports"];

for (const route of ROUTES) {
  test(`route loads without crashing: ${route}`, async ({ page }) => {
    const res = await page.goto(route, { waitUntil: "domcontentloaded" });

    // Some environments return null for response; guard it.
    if (res) expect(res.status(), `HTTP status for ${route}`).toBeLessThan(400);

    // Catch common Next.js crash screens.
    await expect(page.locator("body")).not.toContainText("Unhandled Runtime Error");
    await expect(page.locator("body")).not.toContainText("Application error");
  });
}

