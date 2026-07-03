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

const BWC_SLUG = "bwc";
const BWC_OPERATOR_EMAIL =
  process.env.E2E_BWC_OPERATOR_EMAIL?.trim().toLowerCase() ||
  "wil@blackwoodscoffee.com";

const IRONGUARD_BLOCKED = /FETCH BLOCKED: NO TENANT CONTEXT/i;

test.describe.configure({ mode: "serial", timeout: 180_000 });

test.describe("BWC Ironguard tenant race — Command Post bootstrap", () => {
  test.afterAll(async () => {
    await disconnectE2ePrisma();
  });

  test("does not surface IRONGUARD before dashboard fetch completes", async ({ page }) => {
    test.skip(!hasDatabaseUrl(), "DATABASE_URL required.");
    test.skip(!hasSupabaseAdmin(), "SUPABASE_SERVICE_ROLE_KEY required.");

    await assertTenantBillingActive(BWC_SLUG);

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

    await redeemInviteOnTenantSubdomain(page, BWC_OPERATOR_EMAIL, BWC_SLUG);

    await page.goto(`${tenantSubdomainOrigin(BWC_SLUG)}/`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await expect(page.locator('[data-testid="dashboard-main"]')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText(IRONGUARD_BLOCKED)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Retry dashboard load/i })).toHaveCount(0);

    const tenantCookie = await readIronframeTenantCookie(page);
    console.log("\n=== BWC IRONGUARD RACE DIAGNOSTIC ===");
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
    console.log("=== END BWC IRONGUARD RACE ===\n");

    expect(consoleErrors, "console must not emit IRONGUARD tenant block").toHaveLength(0);
    expect(
      dashboardFetchLog.some((row) => row.blocked),
      "dashboard API must not return IRONGUARD block payload",
    ).toBe(false);

    await waitForLeftRailReady(page);
    await page.getByTestId("analyst-exports-link").first().click();
    await page.waitForURL(/\/exports(?:\?|#|$)/i, { timeout: 60_000 });
    await expect(page.getByText(IRONGUARD_BLOCKED)).toHaveCount(0);

    const exportsConsole = page.getByTestId("analyst-exports-console");
    const exportsScopeGate = page.getByTestId("analyst-exports-scope-gate");
    await expect(exportsConsole.or(exportsScopeGate)).toBeVisible({ timeout: 60_000 });
  });
});
