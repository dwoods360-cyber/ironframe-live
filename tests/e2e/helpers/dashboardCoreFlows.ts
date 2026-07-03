import { expect, type Page } from "@playwright/test";
import { TENANT_UUIDS } from "../../../app/utils/tenantIsolation";

/** Constitutional whole-cent anchors — UI tests must never POST or mutate these registers. */
export const TAS_READONLY_BASELINE_CENTS = {
  medshield: 1_110_000_000n,
  vaultbank: 590_000_000n,
  gridcore: 470_000_000n,
} as const;

export async function readIronframeTenantCookie(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const match = document.cookie.match(/(?:^|;\s*)ironframe-tenant=([^;]*)/);
    const raw = match?.[1]?.trim();
    if (!raw) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  });
}

export async function dismissClockDriftBannersIfPresent(page: Page): Promise<void> {
  for (const label of [
    /Dismiss clock drift/i,
    /Dismiss forensic calibration/i,
    /Dismiss clock drift warning/i,
  ]) {
    const btn = page.getByRole("button", { name: label });
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
    }
  }
}

export async function scrollToLiveIntelligenceStream(page: Page): Promise<void> {
  const heading = page.getByText(/Live Intelligence Stream/i).first();
  await expect(heading).toBeVisible({ timeout: 60_000 });
  await heading.scrollIntoViewIfNeeded();
}

export async function scrollToSentinelInstruction(page: Page): Promise<void> {
  await scrollToLiveIntelligenceStream(page);
  const input = page.getByTestId("sentinel-instruction-input");
  await expect(input).toBeVisible({ timeout: 60_000 });
  await input.scrollIntoViewIfNeeded();
}

export async function ensureAuditorViewOff(page: Page): Promise<void> {
  const toggle = page.locator("#auditor-view-toggle");
  if (!(await toggle.isVisible().catch(() => false))) return;
  const checked = await toggle.getAttribute("aria-checked");
  if (checked === "true") {
    await toggle.click();
  }
}

export async function selectTenantByUuid(page: Page, tenantUuid: string): Promise<void> {
  const select = page.getByTestId("tenant-context-switcher").locator("select");
  await expect(select).toBeVisible({ timeout: 15_000 });
  const isDisabled = await select.isDisabled().catch(() => false);
  if (isDisabled) {
    const cookieTenant = await readIronframeTenantCookie(page);
    if (cookieTenant?.toLowerCase() === tenantUuid.toLowerCase()) {
      return;
    }
    throw new Error(
      `Tenant switcher is locked; cookie=${cookieTenant ?? "null"} cannot select ${tenantUuid}.`,
    );
  }
  const current = await select.inputValue().catch(() => "");
  if (current.toLowerCase() === tenantUuid.toLowerCase()) {
    return;
  }
  await select.selectOption(tenantUuid);
  await expect
    .poll(async () => (await readIronframeTenantCookie(page))?.toLowerCase() ?? "", {
      timeout: 45_000,
    })
    .toBe(tenantUuid.toLowerCase());
  await expect(page.getByTestId("tenant-context-switcher").locator("svg.animate-spin"))
    .toBeHidden({ timeout: 15_000 })
    .catch(() => undefined);
}

export async function waitForLeftRailReady(page: Page): Promise<void> {
  await expect(
    page.getByRole("region", { name: /Loading pipeline and active risk posture/i }),
  )
    .toBeHidden({ timeout: 90_000 })
    .catch(() => undefined);

  const leftPanel = page.getByTestId("dashboard-left-panel");
  await expect(leftPanel).toBeVisible({ timeout: 60_000 });
  await expect(leftPanel.getByText("CONTROL ROOM")).toBeVisible({ timeout: 30_000 });
}

export async function assertWorkforceShowcaseIndices(page: Page): Promise<void> {
  await page
    .getByTestId("dashboard-left-panel")
    .getByText(/Workforce spotlight/i)
    .scrollIntoViewIfNeeded()
    .catch(() => undefined);
  await expect(page.getByTestId("workforce-showcase-grid")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("workforce-showcase-ironcore")).toBeVisible();
  await expect(page.getByTestId("workforce-showcase-ironsight")).toBeVisible();
  await expect(page.getByTestId("workforce-showcase-ironintel")).toBeVisible();
  await expect(page.getByTestId("workforce-showcase-grid").locator("> *")).toHaveCount(3);
}

export function tenantUuidForOptionLabel(label: string): string | null {
  const lower = label.toLowerCase();
  if (lower.includes("medshield")) return TENANT_UUIDS.medshield;
  if (lower.includes("vaultbank")) return TENANT_UUIDS.vaultbank;
  if (lower.includes("gridcore")) return TENANT_UUIDS.gridcore;
  return null;
}
