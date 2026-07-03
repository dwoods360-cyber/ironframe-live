import { test, expect } from "@playwright/test";

/**
 * Guest documentation footprint — /docs/* must render without auth redirect loops.
 */
test.describe("Public documentation reader", () => {
  test("guest can open docs hub without session", async ({ page }) => {
    await page.goto("/docs/README");
    await expect(page.locator('[data-ironframe-surface="docs-reader"]')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/DOCUMENTATION HUB|Documentation Center|Master Documentation/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("guest can open canonical quickstart slug", async ({ page }) => {
    await page.goto("/docs/user-manuals/quickstart");
    await expect(page.locator('[data-ironframe-surface="docs-reader"]')).toBeVisible({
      timeout: 20_000,
    });
  });

  test("guest can open security and compliance technical slug", async ({ page }) => {
    await page.goto("/docs/technical/security-and-compliance");
    await expect(page.locator('[data-ironframe-surface="docs-reader"]')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/Security & Compliance/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("missing database slug shows compilation ingress portal", async ({ page }) => {
    await page.goto("/docs/technical/__unseeded-slug-test__");
    await expect(page.locator('[data-ironframe-surface="docs-reader"]')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/Compilation ingress portal active/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/WORKSPACE TARGET:/i)).toBeVisible();
    await expect(page.getByText(/npm run db:seed:app-documents/i)).toBeVisible();
  });
});
