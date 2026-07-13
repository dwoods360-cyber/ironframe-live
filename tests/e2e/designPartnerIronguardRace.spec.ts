import { test, expect } from "@playwright/test";

import {
  assertTenantBillingActive,
  disconnectE2ePrisma,
  hasDatabaseUrl,
  hasSupabaseAdmin,
  redeemInviteOnTenantSubdomain,
  tenantSubdomainOrigin,
} from "./helpers/ingestionPipeline";
import { readIronframeTenantCookie, waitForLeftRailReady } from "./helpers/dashboardCoreFlows";
import {
  resolveE2EDesignPartnerSlug,
  resolveE2EProductionOperatorEmail,
} from "./helpers/designPartnerE2eEnv";

const IRONGUARD_BLOCKED = /FETCH BLOCKED: NO TENANT CONTEXT/i;

test.describe.configure({ mode: "serial", timeout: 180_000 });

test.describe("Design partner Ironguard tenant race — Command Post bootstrap", () => {
  const tenantSlug = resolveE2EDesignPartnerSlug();
  const operatorEmail = resolveE2EProductionOperatorEmail();

  test.afterAll(async () => {
    await disconnectE2ePrisma();
  });

  test("does not surface IRONGUARD before dashboard fetch completes", async ({ page }) => {
    test.skip(!tenantSlug, "Set E2E_DESIGN_PARTNER_SLUG or E2E_PRODUCTION_TENANT_SLUG.");
    test.skip(!operatorEmail, "Set E2E_PRODUCTION_OPERATOR_EMAIL.");
    test.skip(!hasDatabaseUrl(), "DATABASE_URL required.");
    test.skip(!hasSupabaseAdmin(), "SUPABASE_SERVICE_ROLE_KEY required.");

    await assertTenantBillingActive(tenantSlug);

    const dashboardFetchLog: Array<{ status: number | null; blocked: boolean }> = [];
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      if (IRONGUARD_BLOCKED.test(text) || text.includes("IRONGUARD")) {
        consoleErrors.push(text);
      }
    });

    page.on("response", async (response) => {
      if (!response.url().includes("/api/dashboard")) return;
      const status = response.status();
      let blocked = false;
      try {
        const body = await response.text();
        blocked = IRONGUARD_BLOCKED.test(body);
      } catch {
        blocked = false;
      }
      dashboardFetchLog.push({ status, blocked });
    });

    await redeemInviteOnTenantSubdomain(page, operatorEmail, tenantSlug);

    await page.goto(`${tenantSubdomainOrigin(tenantSlug)}/`, {
      waitUntil: "commit",
      timeout: 120_000,
    });

    await page
      .getByText(/Synchronizing workspace ledger/i)
      .waitFor({ state: "hidden", timeout: 90_000 })
      .catch(() => undefined);

    await waitForLeftRailReady(page);

    await expect(page.locator('[data-testid="dashboard-main"]')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText(IRONGUARD_BLOCKED)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Retry dashboard load/i })).toHaveCount(0);

    const tenantCookie = await readIronframeTenantCookie(page);
    console.log("\n=== DESIGN PARTNER IRONGUARD RACE DIAGNOSTIC ===");
    console.log(
      JSON.stringify(
        {
          url: page.url(),
          tenantCookie,
          dashboardFetchLog,
          consoleErrors,
        },
        null,
        2,
      ),
    );
    console.log("=== END DESIGN PARTNER IRONGUARD RACE ===\n");

    expect(consoleErrors, "console must not emit IRONGUARD tenant block").toHaveLength(0);
    expect(
      dashboardFetchLog.some((row) => row.blocked),
      "dashboard API must not return IRONGUARD block payload",
    ).toBe(false);

    await waitForLeftRailReady(page);
    await page.getByTestId("analyst-exports-link").first().click({ noWaitAfter: true });
    await page.waitForURL(/\/exports(?:\?|#|$)/i, { timeout: 60_000 });
    await expect(page.getByText(IRONGUARD_BLOCKED)).toHaveCount(0);

    const exportsConsole = page.getByTestId("analyst-exports-console");
    const exportsScopeGate = page.getByTestId("analyst-exports-scope-gate");
    await expect(exportsConsole.or(exportsScopeGate)).toBeVisible({ timeout: 60_000 });
  });
});
