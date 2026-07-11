import { test, expect } from "@playwright/test";

import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import {
  assertTenantBillingActive,
  disconnectE2ePrisma,
  hasDatabaseUrl,
  hasSupabaseAdmin,
  isE2eProductionTarget,
  redeemInviteOnTenantSubdomain,
  tenantSubdomainOrigin,
} from "./helpers/ingestionPipeline";
import { readIronframeTenantCookie, waitForLeftRailReady } from "./helpers/dashboardCoreFlows";
import { waitForDashboardReady } from "./helpers/dashboardGate";
import { bootstrapApexOperatorSession, openWorkspaceCommandPost } from "./helpers/commandPostDiagnostic";

const BWC_SLUG = "bwc";
const OPERATOR_EMAIL =
  process.env.E2E_OPERATOR_EMAIL?.trim().toLowerCase() ||
  process.env.IRONFRAME_E2E_OPERATOR_EMAIL?.trim().toLowerCase() ||
  "dwoods360@gmail.com";

const STALE_COOKIE_TENANT = TENANT_UUIDS.medshield;

test.describe.configure({ mode: "serial", timeout: 180_000 });

test.describe("Threat lifecycle diagnostic", () => {
  test.afterAll(async () => {
    await disconnectE2ePrisma();
  });

  test("BWC Command Post: dashboard API must not 403 with stale ironframe-tenant cookie", async ({
    page,
  }) => {
    test.skip(!hasDatabaseUrl(), "DATABASE_URL required.");
    test.skip(!hasSupabaseAdmin(), "SUPABASE_SERVICE_ROLE_KEY required.");

    await assertTenantBillingActive(BWC_SLUG);

    const dashboardLog: Array<{ status: number; body: string }> = [];

    page.on("response", async (response) => {
      if (!response.url().includes("/api/dashboard")) return;
      let body = "";
      try {
        body = await response.text();
      } catch {
        body = "";
      }
      dashboardLog.push({ status: response.status(), body });
    });

    await redeemInviteOnTenantSubdomain(page, OPERATOR_EMAIL, BWC_SLUG);

    const bwcOrigin = tenantSubdomainOrigin(BWC_SLUG);
    const bwcHost = new URL(bwcOrigin).hostname;

    // Simulate stale cookie from a prior workspace (root cause of production 403).
    await page.context().addCookies([
      {
        name: "ironframe-tenant",
        value: STALE_COOKIE_TENANT,
        domain: bwcHost,
        path: "/",
        sameSite: "Lax",
      },
    ]);

    await page.goto(`${bwcOrigin}/`, { waitUntil: "commit", timeout: 120_000 });

    await page
      .getByText(/Synchronizing workspace ledger/i)
      .waitFor({ state: "hidden", timeout: 90_000 })
      .catch(() => undefined);

    await waitForLeftRailReady(page);

    const tenantCookie = await readIronframeTenantCookie(page);
    const retryVisible = await page
      .getByRole("button", { name: /Retry dashboard load/i })
      .isVisible()
      .catch(() => false);

    console.log("\n=== THREAT LIFECYCLE DASHBOARD DIAGNOSTIC ===");
    console.log(
      JSON.stringify(
        {
          target: isE2eProductionTarget() ? "production" : "local",
          url: page.url(),
          staleCookieInjected: STALE_COOKIE_TENANT,
          tenantCookieAfterLoad: tenantCookie,
          dashboardLog,
          retryVisible,
        },
        null,
        2,
      ),
    );
    console.log("=== END DASHBOARD DIAGNOSTIC ===\n");

    const forbidden = dashboardLog.filter((row) => row.status === 403);
    expect(
      forbidden,
      `Dashboard must not return 403 when host-bound tenant disagrees with stale cookie. Log=${JSON.stringify(dashboardLog)}`,
    ).toHaveLength(0);

    await expect(page.locator('[data-testid="dashboard-main"]')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByRole("button", { name: /Retry dashboard load/i })).toHaveCount(0);
  });

  test("Medshield pipeline: acknowledge transitions threat to Active Risks", async ({ page }) => {
    test.skip(
      !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
      "SUPABASE_SERVICE_ROLE_KEY required.",
    );
    test.skip(isE2eProductionTarget(), "Mutating ack test runs on local dev server only.");

    await bootstrapApexOperatorSession(page, OPERATOR_EMAIL);
    await openWorkspaceCommandPost(page, "medshield");

    await page.goto(new URL("/", page.url()).href, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    const mode = await waitForDashboardReady(page);
    if (mode !== "dashboard") {
      test.skip(true, `Dashboard not ready (mode=${mode})`);
    }

    const triageTitle = `E2E Lifecycle Ack ${Date.now()}`;
    const tenantId = TENANT_UUIDS.medshield;
    const justification =
      "E2E lifecycle acknowledge test with sufficient GRC justification for gate compliance.";

    await page.evaluate(
      async ({ title, tenantId, notes }) => {
        const res = await fetch("/api/threats", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
          body: JSON.stringify({
            title,
            source: "E2E Diagnostic",
            target: "Healthcare",
            loss: "50000000",
            notes,
            destination: "pipeline",
          }),
        });
        if (!res.ok) {
          throw new Error(`seed failed: ${res.status} ${await res.text()}`);
        }
      },
      { title: triageTitle, tenantId, notes: justification },
    );
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("ironframe:dashboard-refetch"));
    });
    await page.waitForTimeout(2000);

    await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 });
    await waitForDashboardReady(page);

    const threatCard = page
      .locator('[data-testid="pipeline-threat-card"]')
      .filter({ hasText: triageTitle })
      .first();
    await expect(threatCard).toBeVisible({ timeout: 20_000 });

    const claimBtn = threatCard.locator('[data-testid="pipeline-claim-assign-btn"]');
    if (await claimBtn.isVisible().catch(() => false)) {
      const claimed = await claimBtn.getByText(/Claimed/i).isVisible().catch(() => false);
      if (!claimed) await claimBtn.click();
    }

    await threatCard.locator('[data-testid="grc-justification"]').fill(justification);

    const ackBtn = threatCard.locator('[data-testid="pipeline-acknowledge-btn"]');
    await expect(ackBtn).toBeEnabled({ timeout: 12_000 });

    const actionErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") actionErrors.push(msg.text());
    });

    await ackBtn.click();

    const activeBoard = page.locator('[data-testid="active-risks-board"]');
    await expect(activeBoard.getByText(triageTitle).first()).toBeVisible({ timeout: 30_000 });

    console.log("\n=== ACK LIFECYCLE DIAGNOSTIC ===");
    console.log(JSON.stringify({ triageTitle, actionErrors }, null, 2));
    console.log("=== END ACK DIAGNOSTIC ===\n");

    expect(
      actionErrors.filter((t) => /pool timeout|WORM|403|Dashboard fetch failed/i.test(t)),
      "Acknowledge must not hit pool/WORM/403 errors",
    ).toHaveLength(0);
  });
});
