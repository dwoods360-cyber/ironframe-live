import { test, expect } from "@playwright/test";

import {
  assertTenantBillingActive,
  disconnectE2ePrisma,
  hasDatabaseUrl,
  hasSupabaseAdmin,
  redeemInviteOnTenantSubdomain,
  tenantSubdomainOrigin,
} from "./helpers/ingestionPipeline";

const BWC_SLUG = "bwc";
const BWC_OPERATOR_EMAIL =
  process.env.E2E_BWC_OPERATOR_EMAIL?.trim().toLowerCase() ||
  "wil@blackwoodscoffee.com";

const AUDIT_LOG_STORAGE_KEY = "ironframe-audit-intelligence-log-v1";

test.describe.configure({ mode: "serial", timeout: 120_000 });

test.describe("Reports audit trail responsiveness", () => {
  test.afterAll(async () => {
    await disconnectE2ePrisma();
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!hasDatabaseUrl(), "DATABASE_URL required.");
    test.skip(!hasSupabaseAdmin(), "SUPABASE_SERVICE_ROLE_KEY required.");
    await assertTenantBillingActive(BWC_SLUG);
    await redeemInviteOnTenantSubdomain(page, BWC_OPERATOR_EMAIL, BWC_SLUG);
  });

  test("loads /reports/audit-trail without freezing the main thread", async ({ page }) => {
    const origin = tenantSubdomainOrigin(BWC_SLUG);

    await page.goto(`${origin}/reports/audit-trail`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await expect(page.getByTestId("reports-audit-trail-page")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("audit-ledger-stream")).toBeVisible({ timeout: 30_000 });

    const search = page.getByRole("textbox", { name: "Filter audit logs" });
    await expect(search).toBeVisible({ timeout: 15_000 });

    const interactiveMs = await page.evaluate(async () => {
      const start = performance.now();
      while (performance.now() - start < 8_000) {
        await new Promise((r) => setTimeout(r, 50));
        if (document.querySelector('[data-testid="audit-ledger-stream"]')) break;
      }
      return Math.round(performance.now() - start);
    });
    expect(interactiveMs).toBeLessThan(8_000);

    await search.fill("LOGIN");
    await expect(search).toHaveValue("LOGIN");
  });

  test("remains interactive with a large client-side audit ledger", async ({ page }) => {
    const origin = tenantSubdomainOrigin(BWC_SLUG);

    await page.addInitScript((storageKey) => {
      const rows = Array.from({ length: 2_000 }, (_, i) => ({
        id: `stress-${i}`,
        timestamp: new Date(Date.now() - i * 60_000).toISOString(),
        user_id: "stress-operator",
        action_type: "CONFIG_CHANGE",
        log_type: "GRC",
        metadata_tag: "GRC_GOVERNANCE",
        description: `Stress audit row ${i} LOGIN validation`,
        ip_address: "127.0.0.1",
        ledger_sequence: i + 1,
      }));
      window.localStorage.setItem(storageKey, JSON.stringify(rows));
    }, AUDIT_LOG_STORAGE_KEY);

    await page.goto(`${origin}/reports/audit-trail`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await expect(page.getByTestId("reports-audit-trail-page")).toBeVisible({ timeout: 45_000 });

    const search = page.getByRole("textbox", { name: "Filter audit logs" });
    await expect(search).toBeEditable({ timeout: 20_000 });

    const domRowCount = await page.locator('[data-testid="audit-ledger-stream"] [role="button"]').count();
    expect(domRowCount).toBeLessThan(80);

    await search.fill("Stress audit row 42");
    await expect(search).toHaveValue("Stress audit row 42");
  });

  test("header nav leaves /reports/audit-trail without opening a ledger row", async ({ page }) => {
    const origin = tenantSubdomainOrigin(BWC_SLUG);

    await page.goto(`${origin}/reports/audit-trail`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await expect(page.getByTestId("reports-audit-trail-page")).toBeVisible({ timeout: 30_000 });

    await page.getByTestId("header-integrity-hub-chip").click();
    await expect(page).toHaveURL(`${origin}/integrity`, { timeout: 20_000 });
  });

  test("header vendor chip navigates off /reports/audit-trail", async ({ page }) => {
    const origin = tenantSubdomainOrigin(BWC_SLUG);

    await page.goto(`${origin}/reports/audit-trail`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await expect(page.getByTestId("reports-audit-trail-page")).toBeVisible({ timeout: 30_000 });

    await page.getByTestId("header-vendor-list-chip").click();
    await expect(page).toHaveURL(new RegExp(`${origin}/vendors`), { timeout: 20_000 });
  });
});
