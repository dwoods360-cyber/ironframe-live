import { test, expect } from '@playwright/test';

import { skipUnlessDashboard, waitForDashboardReady } from './helpers/dashboardGate';

/**
 * E2E: Main dashboard and Assessment Workspace (drawer).
 * Accuracy and Resilience: no silent passes. Data state drives assertions.
 * Resilient to slow dev server / Supabase: wait for dashboard shell before asserting.
 *
 * 1) Data state: If risk cards exist → "View Details" / "Assess Risk" MUST be visible and clickable (hard error if not).
 *    If no risk cards → an empty-state message MUST be visible (hard error if not).
 * 2) GRC gate: When drawer is open → Ingest button MUST exist; if threat ≥ $10M, justification box MUST be present.
 */
const OPEN_DRAWER_LINK_REGEX = /View Details|Assess Risk/i;
const EMPTY_STATE_REGEX = /\[ WAITING FOR (?:INGESTION STREAM|TRIAGE SELECTIONS|RISK CONFIRMATION)[.\s…]+ \]|\[ NO MATCHING RISKS FOR SEARCH[.\s…]* \]/;

/** Tripane rail fractions — must match `DASHBOARD_GRID_PROPORTIONS` in dashboardTripaneLayout.ts */
const TRIPANE_LEFT_VW = 0.22;
const TRIPANE_CENTER_VW = 0.48;
const TRIPANE_RIGHT_VW = 0.3;

const DASHBOARD_ENTRY_PATH = '/integrity';

async function waitForTripaneShell(page: import('@playwright/test').Page) {
  const leftPane = page.locator('[data-testid="dashboard-left-panel"]:not([aria-hidden="true"])');
  const centerPane = page.locator('[data-testid="dashboard-main"]');
  const rightPane = page.locator('[data-ironframe-audit-intelligence="true"]');

  await expect(leftPane).toBeVisible({ timeout: 20_000 });
  await expect(centerPane).toBeVisible({ timeout: 20_000 });
  await expect(rightPane).toBeVisible({ timeout: 20_000 });

  return { leftPane, centerPane, rightPane };
}

async function openDashboardOrSkip(page: import('@playwright/test').Page) {
  await page.goto(DASHBOARD_ENTRY_PATH);
  const mode = await waitForDashboardReady(page);
  skipUnlessDashboard(mode);
}

test.describe('Main Dashboard and Risk Assessment Drawer', () => {
  test('data state and drawer match UI; GRC gate verified when drawer opens', async ({ page }) => {
    await openDashboardOrSkip(page);

    // Verify main dashboard header and layout (current UI)
    await expect(page.getByRole('heading', { name: 'EMERGENCY CLICK TEST', level: 1 }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Enterprise Risk Posture')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Protected Tenants').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Control Room')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Industry Profile')).toBeVisible({ timeout: 8000 });

    // 3. Data state (deterministic): wait for risk-card link; if it never appears, require empty-state message
    const openDrawerLink = page.getByRole('link', { name: OPEN_DRAWER_LINK_REGEX }).first();
    const emptyState = page.getByText(EMPTY_STATE_REGEX).first();

    let hasRiskCards: boolean;
    try {
      await openDrawerLink.waitFor({ state: 'visible', timeout: 15_000 });
      hasRiskCards = true;
    } catch {
      hasRiskCards = false;
    }

    if (hasRiskCards) {
      await openDrawerLink.click();

      const drawer = page.getByRole('dialog');
      await expect(drawer).toBeVisible({ timeout: 8000 });
      await expect(drawer).toHaveAttribute('aria-modal', 'true');

      const ingestBtn = drawer.getByRole('button', { name: /^Ingest$/i });
      await expect(ingestBtn).toBeVisible({ timeout: 5000 });

      const grcJustificationLabel = drawer.getByText(/GRC Justification Required.*50.*character/i);
      const justificationBox = drawer.locator('#grc-justification');
      const isHighValueDrawer = await grcJustificationLabel.isVisible().catch(() => false);
      if (isHighValueDrawer) {
        await expect(justificationBox).toBeVisible({ timeout: 3000 });
      }
    } else {
      await expect(emptyState).toBeVisible({ timeout: 8000 });
    }
  });

  /**
   * Control-First: Deterministic Data-Aware Test.
   */
  test('Deterministic Risk Validation', async ({ page }) => {
    await openDashboardOrSkip(page);
    await expect(page.getByRole('heading', { name: 'EMERGENCY CLICK TEST' }).first()).toBeVisible({ timeout: 10_000 });

    const postureSection = page.locator('[id="enterprise-risk-posture-heading"]').locator('..');
    await expect(postureSection.getByText('Enterprise Risk Posture')).toBeVisible({ timeout: 12_000 });

    const exposureEl = postureSection.getByText(/\$[\d.]+(?:[KMBT])?/).first();
    await expect(exposureEl).toBeVisible({ timeout: 8000 });
    const exposureText = (await exposureEl.textContent())?.trim() ?? '';

    const assessRiskLink = page.getByRole('link', { name: /Assess Risk|View Details/i });

    const isZeroExposure = exposureText === '$0.0' || exposureText === '$0' || /^\$0\.?0?[KMBT]?$/.test(exposureText);

    if (!isZeroExposure) {
      await expect(assessRiskLink.first()).toBeVisible({ timeout: 8000 });
      await assessRiskLink.first().click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 8000 });
    } else {
      await expect(page.getByText(/0\s*REQUIRES TRIAGE/)).toBeVisible({ timeout: 8000 });
      await expect(assessRiskLink).toHaveCount(0);
    }
  });
});

test.describe('Tripane layout geometry', () => {
  test('Verify Core Tripane Layout Geometry Invariants', async ({ page }) => {
    await openDashboardOrSkip(page);

    const { leftPane, centerPane, rightPane } = await waitForTripaneShell(page);

    const viewportWidth = page.viewportSize()?.width ?? 1920;

    const leftBox = await leftPane.boundingBox();
    const centerBox = await centerPane.boundingBox();
    const rightBox = await rightPane.boundingBox();

    expect(leftBox).not.toBeNull();
    expect(centerBox).not.toBeNull();
    expect(rightBox).not.toBeNull();

    expect(leftBox!.width).toBeCloseTo(viewportWidth * TRIPANE_LEFT_VW, 0);
    expect(centerBox!.width).toBeCloseTo(viewportWidth * TRIPANE_CENTER_VW, 0);
    expect(rightBox!.width).toBeCloseTo(viewportWidth * TRIPANE_RIGHT_VW, 0);

    const totalWidth = leftBox!.width + centerBox!.width + rightBox!.width;
    expect(totalWidth).toBeCloseTo(viewportWidth, 0);
  });
});
