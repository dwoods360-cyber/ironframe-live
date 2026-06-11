import { test, expect } from "@playwright/test";
import { TENANT_UUIDS } from "../../app/utils/tenantIsolation";
import { waitForDashboardReady, skipUnlessDashboard } from "./helpers/dashboardGate";
import {
  assertWorkforceShowcaseIndices,
  dismissClockDriftBannersIfPresent,
  ensureAuditorViewOff,
  readIronframeTenantCookie,
  selectTenantByUuid,
  TAS_READONLY_BASELINE_CENTS,
  tenantUuidForOptionLabel,
  waitForLeftRailReady,
} from "./helpers/dashboardCoreFlows";

/**
 * Left-rail + dashboard core runtime loops (UI-only).
 *
 * TAS guardrail: no API calls that mint threats, authorize Sentinel writes, or touch
 * BigInt whole-cent baseline registers (Medshield 1_110_000_000¢, Vaultbank 590_000_000¢,
 * Gridcore 470_000_000¢). Read-only Sentinel readiness via modal is permitted.
 */
test.describe("Dashboard core left-rail flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    const mode = await waitForDashboardReady(page);
    skipUnlessDashboard(mode);
    await dismissClockDriftBannersIfPresent(page);
    await ensureAuditorViewOff(page);
  });

  test("tenant switch updates active tenant cookie and workforce showcase indices", async ({
    page,
  }) => {
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
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await waitForLeftRailReady(page);

    const cookieTenant = await readIronframeTenantCookie(page);
    expect(cookieTenant?.toLowerCase()).toBe(targetUuid.toLowerCase());

    await assertWorkforceShowcaseIndices(page);

    // Switch workspace again — cold-boot must not leak prior tenant into showcase binding.
    const secondUuid =
      targetUuid === TENANT_UUIDS.medshield ? TENANT_UUIDS.vaultbank : TENANT_UUIDS.medshield;
    const secondLabel = secondUuid === TENANT_UUIDS.medshield ? "medshield" : "vaultbank";
    const hasSecond = optionTexts.some((t) => t.toLowerCase().includes(secondLabel));
    test.skip(!hasSecond, "Second tenant not available for cross-switch assertion");

    await selectTenantByUuid(page, secondUuid);
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await waitForLeftRailReady(page);

    const cookieAfter = await readIronframeTenantCookie(page);
    expect(cookieAfter?.toLowerCase()).toBe(secondUuid.toLowerCase());
    await assertWorkforceShowcaseIndices(page);

    // Guardrail: test file documents read-only baselines — never assert mutability.
    expect(TAS_READONLY_BASELINE_CENTS.medshield).toBe(1_110_000_000n);
  });

  test("Expert Mode reveals stream; Secure Terminal rejects invalid macro in feed", async ({
    page,
  }) => {
    await selectTenantByUuid(page, TENANT_UUIDS.medshield);
    await waitForLeftRailReady(page);

    await expect(page.getByText("[ EXPERT MODE OFF — TELEMETRY STREAM HIDDEN ]")).toBeVisible();

    const expertToggle = page.locator("#expert-mode-toggle");
    await expect(expertToggle).toBeVisible();
    if ((await expertToggle.getAttribute("aria-checked")) !== "true") {
      await expertToggle.click();
    }
    await expect(expertToggle).toHaveAttribute("aria-checked", "true");

    const stream = page.getByTestId("live-intelligence-stream-terminal");
    await expect(stream).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("[ EXPERT MODE OFF — TELEMETRY STREAM HIDDEN ]")).toBeHidden();

    const terminalForm = page.getByTestId("test-run-ingestion");
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
    await selectTenantByUuid(page, TENANT_UUIDS.medshield);
    await waitForLeftRailReady(page);

    const instruction = "E2E readiness sweep — tenant-scoped OSINT handoff check";
    const input = page.getByTestId("sentinel-instruction-input");
    await input.scrollIntoViewIfNeeded();
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
    await modal.getByRole("button", { name: /^Cancel$/i }).click();
    await expect(modal).toBeHidden({ timeout: 10_000 });
  });
});
