import { test, expect } from "@playwright/test";

/**
 * Product documentation — authenticated operators only (middleware redirects guests to /login).
 */
test.describe("Documentation auth gate", () => {
  test("guest is redirected to login from docs hub", async ({ page }) => {
    await page.goto("/docs/README");
    await expect(page).toHaveURL(/\/login(\?|$)/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /sign in|log in/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("guest is redirected to login from quickstart slug", async ({ page }) => {
    await page.goto("/docs/user-manuals/quickstart");
    await expect(page).toHaveURL(/\/login(\?|$)/, { timeout: 20_000 });
  });

  test("guest is redirected to login from technical slug", async ({ page }) => {
    await page.goto("/docs/technical/security-and-compliance");
    await expect(page).toHaveURL(/\/login(\?|$)/, { timeout: 20_000 });
  });

  test("guest can view public pricing page", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page).toHaveURL(/\/pricing(\?|$)/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /one premium tier/i })).toBeVisible({
      timeout: 10_000,
    });
  });
});
