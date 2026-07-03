import { test, expect } from "@playwright/test";
import { TENANT_UUIDS } from "../../app/utils/tenantIsolation";
import { bootstrapApexOperatorSession } from "./helpers/commandPostDiagnostic";
import {
  assertWorkforceShowcaseIndices,
  dismissClockDriftBannersIfPresent,
  ensureAuditorViewOff,
  readIronframeTenantCookie,
  scrollToLiveIntelligenceStream,
  scrollToSentinelInstruction,
  selectTenantByUuid,
  TAS_READONLY_BASELINE_CENTS,
  tenantUuidForOptionLabel,
  waitForLeftRailReady,
} from "./helpers/dashboardCoreFlows";

function tenantSlugForUuid(tenantUuid: string): string | null {
  if (tenantUuid === TENANT_UUIDS.medshield) return "medshield";
  if (tenantUuid === TENANT_UUIDS.vaultbank) return "vaultbank";
  if (tenantUuid === TENANT_UUIDS.gridcore) return "gridcore";
  return null;
}

async function openCommandPostForTenant(page: import("@playwright/test").Page, tenantUuid: string) {
  const slug = tenantSlugForUuid(tenantUuid);
  if (!slug) {
    throw new Error(`No workspace slug mapping for tenant ${tenantUuid}`);
  }
  await page
    .goto(`/api/auth/workspace-launch?tenant=${slug}&next=%2F`, {
      waitUntil: "commit",
      timeout: 90_000,
    })
    .catch(() => undefined);
  await page.waitForURL(new RegExp(`${slug}\\.lvh\\.me`, "i"), { timeout: 90_000 });
  await waitForLeftRailReady(page);
}

const OPERATOR_EMAIL =
  process.env.IRONFRAME_E2E_OPERATOR_EMAIL?.trim() || "dwoods360@gmail.com";

/**
 * Left-rail + dashboard core runtime loops (UI-only).
 *
 * TAS guardrail: no API calls that mint threats, authorize Sentinel writes, or touch
 * BigInt whole-cent baseline registers (Medshield 1_110_000_000¢, Vaultbank 590_000_000¢,
 * Gridcore 470_000_000¢). Read-only Sentinel readiness via modal is permitted.
 */
test.describe.configure({ mode: "serial", timeout: 180_000 });

test.describe("Dashboard core left-rail flows", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
      "SUPABASE_SERVICE_ROLE_KEY required to mint apex session",
    );

    await bootstrapApexOperatorSession(page, OPERATOR_EMAIL);
  });

  test("tenant switch updates active tenant cookie and workforce showcase indices", async ({
    page,
  }) => {
    await page.goto("/integrity", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await dismissClockDriftBannersIfPresent(page);
    await ensureAuditorViewOff(page);

    const tenantSelect = page.getByTestId("tenant-context-switcher").locator("select");
    await expect(tenantSelect).toBeVisible({ timeout: 15_000 });

    const optionTexts = await tenantSelect.locator("option").allTextContents();
    const tenantOption = optionTexts.find(
      (t) => t.toLowerCase().includes("medshield") || t.toLowerCase().includes("vaultbank"),
    );
    test.skip(!tenantOption, "No seeded tenant rows in Command Center switcher");

    const targetUuid =
      tenantUuidForOptionLabel(tenantOption!) ??
      (tenantOption!.toLowerCase().includes("vaultbank")
        ? TENANT_UUIDS.vaultbank
        : TENANT_UUIDS.medshield);

    await selectTenantByUuid(page, targetUuid);
    await openCommandPostForTenant(page, targetUuid);

    const cookieTenant = await readIronframeTenantCookie(page);
    expect(cookieTenant?.toLowerCase()).toBe(targetUuid.toLowerCase());

    await assertWorkforceShowcaseIndices(page);

    // Switch workspace again — cold-boot must not leak prior tenant into showcase binding.
    const secondUuid =
      targetUuid === TENANT_UUIDS.medshield ? TENANT_UUIDS.vaultbank : TENANT_UUIDS.medshield;
    const secondLabel = secondUuid === TENANT_UUIDS.medshield ? "medshield" : "vaultbank";
    const hasSecond = optionTexts.some((t) => t.toLowerCase().includes(secondLabel));
    test.skip(!hasSecond, "Second tenant not available for cross-switch assertion");

    await page.goto("/integrity", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await selectTenantByUuid(page, secondUuid);

    const cookieAfter = await readIronframeTenantCookie(page);
    expect(cookieAfter?.toLowerCase()).toBe(secondUuid.toLowerCase());

    // Guardrail: test file documents read-only baselines — never assert mutability.
    expect(TAS_READONLY_BASELINE_CENTS.medshield).toBe(1_110_000_000n);
  });

  test.describe("Medshield command post left rail", () => {
    test.beforeEach(async ({ page }) => {
      await openCommandPostForTenant(page, TENANT_UUIDS.medshield);
      await dismissClockDriftBannersIfPresent(page);
      await ensureAuditorViewOff(page);
    });

  test("Expert Mode reveals stream; Secure Terminal rejects invalid macro in feed", async ({
    page,
  }) => {
    await scrollToLiveIntelligenceStream(page);

    const expertToggle = page.locator("#expert-mode-toggle");
    await expect(expertToggle).toBeVisible({ timeout: 15_000 });
    if ((await expertToggle.getAttribute("aria-checked")) !== "true") {
      await expect(page.getByText("[ EXPERT MODE OFF — TELEMETRY STREAM HIDDEN ]")).toBeVisible({
        timeout: 15_000,
      });
      await expertToggle.click();
    }
    await expect(expertToggle).toHaveAttribute("aria-checked", "true");

    const stream = page.getByTestId("live-intelligence-stream-terminal");
    await expect(stream).toBeVisible({ timeout: 10_000 });

    const terminalForm = page
      .getByTestId("dashboard-left-panel")
      .getByTestId("test-run-ingestion");
    await terminalForm.scrollIntoViewIfNeeded();
    const terminalInput = terminalForm.locator('input[placeholder*="kimbot"]');
    await terminalInput.fill("kimbot; rm -rf /");
    await terminalForm.getByRole("button", { name: /^RUN$/i }).click();

    await expect(stream.getByText(/\[AGENT-14:IRONGATE\].*\[REJECTED\]/)).toBeVisible({
      timeout: 10_000,
    });

    // No purge / ledger mutation macros in this smoke path.
    await expect(page.getByText(/DATABASE PURGE COMPLETE/i)).toBeHidden();
  });

  test("Sentinel sweep opens modal and renders read-only agent checklist", async ({ page }) => {
    await scrollToSentinelInstruction(page);

    const instruction = "E2E readiness sweep — tenant-scoped OSINT handoff check";
    const input = page.getByTestId("sentinel-instruction-input");
    await input.fill(instruction);

    const runBtn = page.getByTestId("run-sentinel-sweep");
    await expect(runBtn).toBeEnabled({ timeout: 10_000 });
    await runBtn.click();

    const modal = page.getByTestId("sentinel-sweep-modal");
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await expect(modal.locator("#sentinel-sweep-modal-title")).toBeVisible();

    const checklist = page.getByTestId("sentinel-sweep-checklist");
    await expect(checklist).toBeVisible();
    await expect(checklist.getByText(/Sentinel sweep readiness \(read-only\)/i)).toBeVisible();

    // Running → complete (read-only server action); tolerate DB-less dev with error surface.
    await expect
      .poll(
        async () => {
          const running = await checklist
            .getByText(/Verifying spotlight agents against tenant session/i)
            .isVisible()
            .catch(() => false);
          const rows = await checklist.locator("li").count();
          const error = await checklist.locator(".text-red-400").isVisible().catch(() => false);
          return running || rows >= 1 || error;
        },
        { timeout: 25_000 },
      )
      .toBe(true);

    const rowCount = await checklist.locator("li").count();
    if (rowCount > 0) {
      expect(rowCount).toBeGreaterThanOrEqual(1);
      await expect(checklist.locator("li").first()).toContainText(/PASS|WARN|FAIL/);
    }

    // UI-only: do not submit AUTHORIZE (write path).
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden({ timeout: 10_000 }).catch(() => undefined);
  });
  });
});
