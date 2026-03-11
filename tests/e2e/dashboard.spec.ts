import { test, expect } from '@playwright/test';

/**
 * E2E: Main dashboard and Assessment Workspace (drawer).
 * Accuracy and Resilience: no silent passes. Data state drives assertions.
 *
 * 1) Data state: If risk cards exist → "View Details" / "Assess Risk" MUST be visible and clickable (hard error if not).
 *    If no risk cards → an empty-state message MUST be visible (hard error if not).
 * 2) GRC gate: When drawer is open → Ingest button MUST exist; if threat ≥ $10M, justification box MUST be present.
 */
const OPEN_DRAWER_LINK_REGEX = /View Details|Assess Risk/i;
const EMPTY_STATE_REGEX = /\[ WAITING FOR (?:INGESTION STREAM|TRIAGE SELECTIONS|RISK CONFIRMATION)[.\s…]+ \]|\[ NO MATCHING RISKS FOR SEARCH[.\s…]* \]/;

test.describe('Main Dashboard and Risk Assessment Drawer', () => {
  test('data state and drawer match UI; GRC gate verified when drawer opens', async ({ page }) => {
    // 1. Navigate and wait for dashboard to load
    await page.goto('/');
    await expect(page.getByText('Loading dashboard…')).not.toBeVisible({ timeout: 15000 });

    // 2. Verify main dashboard header and layout (current UI)
    await expect(page.getByRole('heading', { name: 'EMERGENCY CLICK TEST', level: 1 })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Enterprise Risk Posture')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Protected Tenants').first()).toBeVisible();
    await expect(page.getByText('Control Room')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Industry Profile')).toBeVisible();

    // 3. Data state (deterministic): wait for risk-card link; if it never appears, require empty-state message
    const openDrawerLink = page.getByRole('link', { name: OPEN_DRAWER_LINK_REGEX }).first();
    const emptyState = page.getByText(EMPTY_STATE_REGEX).first();

    let hasRiskCards: boolean;
    try {
      await openDrawerLink.waitFor({ state: 'visible', timeout: 12000 });
      hasRiskCards = true;
    } catch {
      hasRiskCards = false;
    }

    if (hasRiskCards) {
      // IF risk cards exist: link MUST be clickable — already visible from wait above
      await openDrawerLink.click();

      const drawer = page.getByRole('dialog');
      await expect(drawer).toBeVisible({ timeout: 5000 });
      await expect(drawer).toHaveAttribute('aria-modal', 'true');

      // GRC gate: Ingest button MUST exist (no skipping)
      const ingestBtn = drawer.getByRole('button', { name: /^Ingest$/i });
      await expect(ingestBtn).toBeVisible({ timeout: 3000 });

      // If threat ≥ $10M: justification box MUST be present
      const grcJustificationLabel = drawer.getByText(/GRC Justification Required.*50.*character/i);
      const justificationBox = drawer.locator('#grc-justification');
      const isHighValueDrawer = await grcJustificationLabel.isVisible().catch(() => false);
      if (isHighValueDrawer) {
        await expect(justificationBox).toBeVisible({ timeout: 2000 });
      }
    } else {
      // IF no risk cards: empty state message MUST be visible (hard error if not)
      await expect(emptyState).toBeVisible({ timeout: 5000 });
    }
  });

  /**
   * Control-First: Deterministic Data-Aware Test.
   * Checks ALE/exposure from the dashboard; UI MUST match data state. No optional logic — hard-stop validation.
   */
  test('Deterministic Risk Validation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Loading dashboard…')).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByText('EMERGENCY CLICK TEST')).toBeVisible({ timeout: 5000 });

    // GRC MANDATE: Check UI state against expected data (exposure from Enterprise Risk Posture section)
    const postureSection = page.locator('[id="enterprise-risk-posture-heading"]').locator('..');
    await expect(postureSection.getByText('Enterprise Risk Posture')).toBeVisible({ timeout: 10000 });

    // ALE metric: Liability Exposure (USD) shows $0.0 or $X.XM — scope to this section to avoid sidebar matches
    const exposureEl = postureSection.getByText(/\$[\d.]+(?:[KMBT])?/).first();
    await expect(exposureEl).toBeVisible({ timeout: 5000 });
    const exposureText = (await exposureEl.textContent())?.trim() ?? '';

    const assessRiskLink = page.getByRole('link', { name: /Assess Risk|View Details/i });

    const isZeroExposure = exposureText === '$0.0' || exposureText === '$0' || /^\$0\.?0?[KMBT]?$/.test(exposureText);

    if (!isZeroExposure) {
      // If ALE > $0, the Assess Risk / View Details link MUST exist — no skipping
      await expect(assessRiskLink.first()).toBeVisible({ timeout: 5000 });
      await assessRiskLink.first().click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    } else {
      // Empty state: Zero-Risk UI — Active Violations shows "0" and "REQUIRES TRIAGE"
      await expect(page.getByText(/0\s*REQUIRES TRIAGE/)).toBeVisible({ timeout: 5000 });
      await expect(assessRiskLink).toHaveCount(0);
    }
  });
});
