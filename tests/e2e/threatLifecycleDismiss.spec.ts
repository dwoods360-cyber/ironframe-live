import { test, expect, type Page } from "@playwright/test";

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
import { waitForLeftRailReady } from "./helpers/dashboardCoreFlows";
import { waitForDashboardReady } from "./helpers/dashboardGate";
import { bootstrapApexOperatorSession, openWorkspaceCommandPost } from "./helpers/commandPostDiagnostic";

const OPERATOR_EMAIL =
  process.env.E2E_OPERATOR_EMAIL?.trim().toLowerCase() ||
  process.env.IRONFRAME_E2E_OPERATOR_EMAIL?.trim().toLowerCase() ||
  "dwoods360@gmail.com";

const DISMISS_REASONS = [
  { value: "FALSE_POSITIVE", label: "False Positive" },
  { value: "RISK_ACCEPTED", label: "Risk Accepted" },
  { value: "MITIGATED", label: "Mitigated" },
  { value: "DUPLICATE", label: "Duplicate" },
] as const;

const GRC_JUSTIFICATION =
  "Inspect the top boundary header area of the Control Room panel element. " +
  "Verify visual presentation of the status indicator dot and header titles.";

const TX_TIMEOUT_RE = /Transaction already closed|interactive transaction timeout|pool timeout/i;

async function registerManualActiveThreat(page: Page, title: string): Promise<void> {
  const manualBtn = page.getByRole("button", { name: /Manual Risk REGISTRATION/i });
  await expect(manualBtn).toBeVisible({ timeout: 15_000 });
  await manualBtn.click();
  await page.getByPlaceholder(/Risk title/i).fill(title);
  await page.getByPlaceholder(/Source agent/i).fill("E2E DeAck Diagnostic");
  await page.getByPlaceholder(/Target sector/i).fill("Healthcare");
  await page.getByPlaceholder(/Inherent risk/i).fill("75");
  await page.getByPlaceholder(/Justification Required/i).fill(GRC_JUSTIFICATION);
  const registerBtn = page.getByRole("button", { name: /^Register$/i });
  await expect(registerBtn).toBeEnabled({ timeout: 8_000 });
  await registerBtn.click();
  await expect(registerBtn).not.toBeVisible({ timeout: 30_000 });

  const activeBoard = page.locator('[data-testid="active-risks-board"]');
  await expect(activeBoard.getByRole("heading", { name: title })).toBeVisible({ timeout: 30_000 });
}

async function submitActiveDismiss(
  page: Page,
  title: string,
  reasonValue: string,
): Promise<{ errors: string[]; toastError: string | null }> {
  const activeBoard = page.locator('[data-testid="active-risks-board"]');
  await activeBoard.scrollIntoViewIfNeeded();

  const heading = activeBoard.getByRole("heading", { name: title }).first();
  await expect(heading).toBeVisible({ timeout: 20_000 });

  const cardRoot = heading.locator('xpath=ancestor::div[contains(@class,"group")][1]');

  const assigneeSelect = cardRoot.locator("select").first();
  if (await assigneeSelect.isVisible().catch(() => false)) {
    const options = await assigneeSelect.locator("option").allTextContents();
    const dwoods = options.find((l) => /dwoods360|dereck|dwoods/i.test(l));
    const pick = dwoods ?? options.find((l) => l.trim() && !/unassigned/i.test(l));
    if (pick) {
      await assigneeSelect.selectOption({ label: pick });
      await page.waitForTimeout(1_500);
    }
  }

  const claimBtn = cardRoot.locator('[data-testid="active-risk-claim-assign-btn"]');
  if (await claimBtn.isVisible().catch(() => false)) {
    const claimed = await claimBtn.getByText(/Claimed/i).isVisible().catch(() => false);
    if (!claimed && (await claimBtn.isEnabled().catch(() => false))) {
      await claimBtn.click();
      await page.waitForTimeout(1_500);
    }
  }

  const dismissBtn = cardRoot.getByRole("button", { name: /De-Acknowledgment/i });
  await expect
    .poll(async () => dismissBtn.isEnabled().catch(() => false), { timeout: 45_000 })
    .toBe(true);
  await dismissBtn.click();

  const reasonSelect = cardRoot.locator("select").first();
  await expect(reasonSelect).toBeVisible({ timeout: 8_000 });
  await reasonSelect.selectOption({ value: reasonValue });

  const justificationInput = cardRoot.getByPlaceholder(/Enter detailed justification/i);
  await justificationInput.fill(GRC_JUSTIFICATION);

  const submitBtn = cardRoot.getByRole("button", { name: /SUBMIT DISMISS/i });
  await expect(submitBtn).toBeEnabled({ timeout: 10_000 });

  const errors: string[] = [];
  const pageErrors: string[] = [];
  const onConsole = (msg: { type: () => string; text: () => string }) => {
    if (msg.type() === "error") errors.push(msg.text());
  };
  page.on("console", onConsole);

  await submitBtn.click();

  await page.waitForTimeout(3_000);

  const visibleError = await page
    .getByText(TX_TIMEOUT_RE)
    .first()
    .textContent()
    .catch(() => null);
  if (visibleError) pageErrors.push(visibleError);

  page.off("console", onConsole);

  await page.waitForTimeout(1_000);

  const combined = [...errors, ...pageErrors].filter((t) => TX_TIMEOUT_RE.test(t));
  return { errors: combined, toastError: pageErrors[0] ?? null };
}

test.describe.configure({ mode: "serial", timeout: 300_000 });

test.describe("De-ack dismiss lifecycle", () => {
  test.afterAll(async () => {
    await disconnectE2ePrisma();
  });

  test("all DISMISS reason variants complete without transaction timeout", async ({ page }) => {
    const production = isE2eProductionTarget();
    const allowProdMutations = process.env.E2E_ALLOW_PROD_MUTATIONS === "1";

    if (production) {
      test.skip(!allowProdMutations, "Set E2E_ALLOW_PROD_MUTATIONS=1 to mutate production.");
      test.skip(!hasDatabaseUrl() || !hasSupabaseAdmin(), "DB + Supabase required.");
      await assertTenantBillingActive("bwc");
      await redeemInviteOnTenantSubdomain(page, OPERATOR_EMAIL, "bwc");
      await page.goto(`${tenantSubdomainOrigin("bwc")}/`, {
        waitUntil: "commit",
        timeout: 120_000,
      });
    } else {
      test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(), "Supabase admin required.");
      await bootstrapApexOperatorSession(page, OPERATOR_EMAIL);
      await openWorkspaceCommandPost(page, "medshield");
      await page.goto(new URL("/", page.url()).href, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
    }

    await waitForLeftRailReady(page);
    const mode = await waitForDashboardReady(page);
    if (mode !== "dashboard") {
      test.skip(true, `Dashboard not ready (mode=${mode})`);
    }

    const tenantId = production
      ? await page.evaluate(async () => {
          const match = document.cookie.match(/(?:^|;\s*)ironframe-tenant=([^;]*)/);
          return match?.[1] ? decodeURIComponent(match[1]).trim() : null;
        })
      : TENANT_UUIDS.medshield;

    void tenantId;

    const results: Array<{ reason: string; errors: string[]; toastError: string | null; title: string }> = [];

    for (const reason of DISMISS_REASONS) {
      const title = `E2E DeAck ${reason.value} ${Date.now()}`;
      await registerManualActiveThreat(page, title);
      const outcome = await submitActiveDismiss(page, title, reason.value);
      results.push({ reason: reason.value, ...outcome, title });

      console.log(`\n=== DE-ACK ${reason.value} ===`, JSON.stringify(outcome, null, 2));
    }

    console.log("\n=== DE-ACK DISMISS MATRIX ===", JSON.stringify(results, null, 2));

    for (const row of results) {
      expect(
        row.errors,
        `${row.reason}: console must not report transaction timeout (${row.title})`,
      ).toHaveLength(0);
      expect(row.toastError, `${row.reason}: UI must not show transaction timeout`).toBeNull();
    }
  });

  test("production BWC: de-ack on active card when E2E_THREAT_ID set", async ({ page }) => {
    test.skip(!isE2eProductionTarget(), "Production-only spot check.");
    test.skip(process.env.E2E_ALLOW_PROD_MUTATIONS !== "1", "Set E2E_ALLOW_PROD_MUTATIONS=1.");
    test.skip(!hasDatabaseUrl() || !hasSupabaseAdmin(), "DB + Supabase required.");

    const threatId = process.env.E2E_THREAT_ID?.trim();
    test.skip(!threatId, "Set E2E_THREAT_ID to an active-board threat uuid.");

    await assertTenantBillingActive("bwc");
    await redeemInviteOnTenantSubdomain(page, OPERATOR_EMAIL, "bwc");
    await page.goto(`${tenantSubdomainOrigin("bwc")}/`, {
      waitUntil: "commit",
      timeout: 120_000,
    });
    await waitForLeftRailReady(page);

    const card = page.locator('[data-testid="active-risks-board"]').locator(`[data-threat-id="${threatId}"]`).first();
    const hasCard = await card.isVisible({ timeout: 30_000 }).catch(() => false);
    test.skip(!hasCard, `Active card ${threatId} not visible — ack it first or pick another id.`);

    const title = (await card.getByRole("heading").first().textContent())?.trim() ?? threatId;
    const outcome = await submitActiveDismiss(page, title, "FALSE_POSITIVE");

    console.log("\n=== PRODUCTION SPOT DE-ACK ===", JSON.stringify({ threatId, title, outcome }, null, 2));

    expect(outcome.errors).toHaveLength(0);
    expect(outcome.toastError).toBeNull();
  });
});
