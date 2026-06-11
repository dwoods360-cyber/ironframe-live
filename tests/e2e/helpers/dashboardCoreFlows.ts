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
  for (const label of [/Dismiss clock drift/i, /Dismiss forensic calibration/i]) {
    const btn = page.getByRole("button", { name: label });
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
    }
  }
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
  await select.selectOption(tenantUuid);
  await expect(page.getByTestId("tenant-context-switcher").locator("svg.animate-spin")).toBeHidden({
    timeout: 30_000,
  });
}

export async function waitForLeftRailReady(page: Page): Promise<void> {
  const leftPanel = page.getByTestId("dashboard-left-panel");
  await expect(leftPanel).toBeVisible({ timeout: 20_000 });
  await expect(leftPanel.getByText("CONTROL ROOM")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("workforce-showcase-grid")).toBeVisible({ timeout: 20_000 });
}

export async function assertWorkforceShowcaseIndices(page: Page): Promise<void> {
  await expect(page.locator('[data-left-panel-feature-index="25"]')).toBeVisible();
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
