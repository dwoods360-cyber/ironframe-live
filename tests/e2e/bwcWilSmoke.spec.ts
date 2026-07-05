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

type SmokeReport = {
  email: string;
  billingStatus: string;
  paths: Array<{
    path: string;
    finalUrl: string;
    mode: string;
    loginHits: number;
    billingHold: boolean;
    dashboardMain: boolean;
  }>;
  tenantCookie: string | null;
  loginNavigationLog: string[];
};

test.describe.configure({ mode: "serial", timeout: 180_000 });

test.describe("BWC Wil smoke — design partner Command Post", () => {
  test.afterAll(async () => {
    await disconnectE2ePrisma();
  });

  test("lands Command Post on tenant host without billing hold or login loop", async ({ page }) => {
    test.skip(!hasDatabaseUrl(), "DATABASE_URL required.");
    test.skip(!hasSupabaseAdmin(), "SUPABASE_SERVICE_ROLE_KEY required.");

    await assertTenantBillingActive(BWC_SLUG);

    const loginNavigationLog: string[] = [];
    page.on("framenavigated", (frame) => {
      if (frame !== page.mainFrame()) return;
      const url = frame.url();
      if (url.includes("/login")) {
        loginNavigationLog.push(url);
      }
    });

    await redeemInviteOnTenantSubdomain(page, BWC_OPERATOR_EMAIL, BWC_SLUG);

    const paths = ["/", "/integrity", "/get-started", "/exports"];
    const pathReports: SmokeReport["paths"] = [];

    const detectPathMode = async (path: string): Promise<string> => {
      if (await page.getByRole("heading", { name: /Sign in/i }).isVisible().catch(() => false)) {
        return "signin";
      }
      if (await page.getByRole("heading", { name: /Workspace access paused/i }).isVisible().catch(() => false)) {
        return "billing_hold";
      }
      if (
        path === "/" &&
        (await page
          .locator('[data-testid="dashboard-main"]')
          .isVisible({ timeout: 90_000 })
          .catch(() => false))
      ) {
        return "command_post";
      }
      if (
        path === "/integrity" &&
        (await page
          .getByRole("heading", { name: /Audit ledger/i })
          .isVisible({ timeout: 30_000 })
          .catch(() => false))
      ) {
        return "integrity_hub";
      }
      if (
        path === "/get-started" &&
        (await page.locator(".ironframe-get-started-portal").isVisible().catch(() => false))
      ) {
        return "get_started";
      }
      if (
        path === "/exports" &&
        (await page
          .getByText(/Analyst Export Console|Compliance Export Ledger|Complete workspace setup before exporting/i)
          .first()
          .isVisible({ timeout: 30_000 })
          .catch(() => false))
      ) {
        return "exports";
      }
      return `unknown:${page.url()}`;
    };

    for (const path of paths) {
      const loginHitsBefore = loginNavigationLog.length;
      await page.goto(`${tenantSubdomainOrigin(BWC_SLUG)}${path}`, {
        waitUntil: path === "/" || path === "/integrity" ? "commit" : "domcontentloaded",
        timeout: path === "/" || path === "/integrity" ? 120_000 : 60_000,
      });

      if (path === "/") {
        await page
          .getByText(/Synchronizing workspace ledger/i)
          .waitFor({ state: "hidden", timeout: 90_000 })
          .catch(() => undefined);
        await waitForLeftRailReady(page).catch(() => undefined);
      }

      if (path === "/integrity") {
        await page
          .getByText(/Loading Integrity Hub/i)
          .waitFor({ state: "hidden", timeout: 90_000 })
          .catch(() => undefined);
      }

      const mode = await detectPathMode(path);
      const billingHold = mode === "billing_hold";
      const dashboardMain = await page
        .locator('[data-testid="dashboard-main"]')
        .isVisible()
        .catch(() => false);

      pathReports.push({
        path,
        finalUrl: page.url(),
        mode,
        loginHits: loginNavigationLog.length - loginHitsBefore,
        billingHold,
        dashboardMain,
      });
    }

    const report: SmokeReport = {
      email: BWC_OPERATOR_EMAIL,
      billingStatus: "ACTIVE",
      paths: pathReports,
      tenantCookie: await readIronframeTenantCookie(page),
      loginNavigationLog,
    };

    console.log("\n=== BWC WIL SMOKE DIAGNOSTIC ===");
    console.log(JSON.stringify(report, null, 2));
    console.log("=== END BWC WIL SMOKE ===\n");

    const root = pathReports.find((row) => row.path === "/");
    expect(root?.finalUrl, "must stay on bwc tenant host").toMatch(/bwc\.lvh\.me/i);
    expect(root?.mode, "Command Post must load on /").toBe("command_post");
    expect(root?.billingHold, "ACTIVE billing must not show hold panel").toBe(false);
    await expect(page.getByText(/FETCH BLOCKED: NO TENANT CONTEXT/i)).toHaveCount(0);

    const integrity = pathReports.find((row) => row.path === "/integrity");
    expect(integrity?.finalUrl, "integrity must stay on tenant host").toMatch(/\/integrity/i);
    expect(integrity?.mode, "integrity must not bounce to sign-in").not.toBe("signin");

    const exports = pathReports.find((row) => row.path === "/exports");
    expect(exports?.mode, "exports must not require re-login").not.toBe("signin");
    expect(exports?.finalUrl, "exports must stay on tenant host /exports route").toMatch(
      /bwc\.lvh\.me:3000\/exports/i,
    );

    expect(
      loginNavigationLog.length,
      `unexpected /login navigations: ${loginNavigationLog.join(" | ") || "none"}`,
    ).toBeLessThanOrEqual(1);

    if (root?.dashboardMain) {
      await page.goto(`${tenantSubdomainOrigin(BWC_SLUG)}/`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await expect(page.locator('[data-testid="dashboard-main"]')).toBeVisible({ timeout: 60_000 });
      await waitForLeftRailReady(page);
      await page.getByTestId("analyst-exports-link").first().click({ noWaitAfter: true });
      await page.waitForURL(/\/exports(?:\?|#|$)/i, { timeout: 60_000 });
      const exportsConsole = page.getByTestId("analyst-exports-console");
      const exportsScopeGate = page.getByTestId("analyst-exports-scope-gate");
      await expect(exportsConsole.or(exportsScopeGate)).toBeVisible({ timeout: 60_000 });
      expect(page.url(), "Analyst exports click must land on /exports").toMatch(/\/exports/i);
    }
  });
});
