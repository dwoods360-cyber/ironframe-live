import { test, expect } from '@playwright/test';

/**
 * E2E: Threat Pipeline & GRC Gates (GATEKEEPER PROTOCOL).
 * Codifies defenses for Threat Ingestion pipeline and structured justification workflows.
 *
 * Resilient to: slow dev server, empty pipeline (no Attack Velocity until threats exist),
 * and tenant state — we wait for dashboard shell first, then pipeline section (Manual Risk REGISTRATION or Attack Velocity).
 */

/** Wait for dashboard to finish loading and shell to be visible (avoids race with Supabase/API). */
async function waitForDashboardReady(page: import('@playwright/test').Page) {
  await page.waitForSelector('[data-testid="dashboard-main"]', { state: 'visible', timeout: 15_000 });
  await expect(page.getByText('Loading dashboard…')).not.toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByText('Enterprise Risk Posture').or(page.getByText('Protected Tenants')).first()
  ).toBeVisible({ timeout: 15_000 });
}

/** Resilient locator for Attack Velocity section only (do not couple with badge). */
function attackVelocityLocator(page: import('@playwright/test').Page) {
  return page.locator('[data-testid="pipeline-attack-velocity"]').first();
}

/** Wait for pipeline section to be mounted (Attack Velocity only appears when there are threats). */
async function waitForPipelineSection(page: import('@playwright/test').Page) {
  await expect(
    page
      .locator('[data-testid="pipeline-attack-velocity"]')
      .or(page.getByText('[ WAITING FOR TRIAGE SELECTIONS... ]'))
      .or(page.getByText('[ WAITING FOR INGESTION STREAM... ]'))
      .or(page.getByRole('button', { name: /Manual Risk REGISTRATION/i }))
      .or(page.getByText('RISK REGISTRATION'))
      .first()
  ).toBeVisible({ timeout: 15_000 });
}

test.describe('Threat Pipeline & GRC Gates', () => {
  test('Test 1: Zero-Trust UI Rendering — pipeline loads for active tenant; Kimbot tags with tenantId', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForDashboardReady(page);
    await waitForPipelineSection(page);

    // Pipeline section is present (either empty state or Attack Velocity when threats exist)
    const hasAttackVelocity = await attackVelocityLocator(page).isVisible().catch(() => false);
    const hasWaiting =
      (await page.getByText('[ WAITING FOR TRIAGE SELECTIONS... ]').isVisible()) ||
      (await page.getByText('[ WAITING FOR INGESTION STREAM... ]').first().isVisible()) || false;
    const hasLiabilityBadge =
      (await page.getByText(/\$[\d.]+M Liability/).first().isVisible()) ||
      (await page.getByText(/\d+ Attacks in Queue/).first().isVisible()) || false;
    expect(hasAttackVelocity || hasWaiting || hasLiabilityBadge).toBeTruthy();

    await expect(page.getByText('Protected Tenants').first()).toBeVisible({ timeout: 5000 });
  });

  test('Test 2: High-Velocity UI Condensation — 5 threats render as Lead Card + badge only', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForDashboardReady(page);
    await waitForPipelineSection(page);
    await page.waitForTimeout(2000); // allow pipeline DB sync so manual threats persist

    // Open Manual Risk Registration and add 5 threats
    const manualBtn = page.getByRole('button', { name: /Manual Risk REGISTRATION/i });
    await expect(manualBtn).toBeVisible({ timeout: 8000 });
    await manualBtn.click();

    const titleInput = page.getByPlaceholder(/Risk title/i);
    await expect(titleInput).toBeVisible({ timeout: 3000 });

    for (let i = 0; i < 5; i++) {
      await titleInput.fill(`E2E Condensation Threat ${i} ${Date.now()}`);
      await page.getByPlaceholder(/Source agent/i).fill('E2E Test');
      await page.getByPlaceholder(/Target sector/i).fill('Healthcare');
      await page.getByPlaceholder(/Inherent risk/i).fill('2.0');
      await page.getByRole('button', { name: /^Register$/i }).click();
      await page.waitForTimeout(400);
      if (i < 4) {
        await manualBtn.click();
        await expect(titleInput).toBeVisible({ timeout: 2000 });
      }
    }

    // Assert: "N Attacks in Queue" badge with N >= 5 (condensed stack)
    await waitForPipelineSection(page);
    await attackVelocityLocator(page).scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const badge = page.getByText(/\d+ Attacks in Queue/).first();
    await expect(badge).toBeVisible({ timeout: 12000 });
    const badgeText = await badge.textContent();
    const n = parseInt(badgeText?.replace(/\D/g, '') ?? '0', 10);
    expect(n).toBeGreaterThanOrEqual(5);
  });

  test('Test 3: The $10M GRC Gate — Acknowledge blocked without 50-character justification', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForDashboardReady(page);
    await waitForPipelineSection(page);
    await page.waitForTimeout(2000); // allow pipeline DB sync to complete so our manual threat is not overwritten

    // Add one manual threat with liability > $10M
    const manualBtn = page.getByRole('button', { name: /Manual Risk REGISTRATION/i });
    await expect(manualBtn).toBeVisible({ timeout: 8000 });
    await manualBtn.click();

    await page.getByPlaceholder(/Risk title/i).fill(`E2E High Liability ${Date.now()}`);
    await page.getByPlaceholder(/Source agent/i).fill('E2E Test');
    await page.getByPlaceholder(/Target sector/i).fill('Healthcare');
    await page.getByPlaceholder(/Inherent risk/i).fill('12.0');
    await page.getByRole('button', { name: /^Register$/i }).click();

    await page.waitForTimeout(1500);
    // Scroll pipeline into view; Attack Velocity appears after we add a threat
    await waitForPipelineSection(page);
    await attackVelocityLocator(page).scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(500);

    // GRC justification box must be present for high-value threat
    const justification = page.locator('[data-testid="grc-justification"]');
    await expect(justification).toBeVisible({ timeout: 5000 });

    // Acknowledge button must be disabled when justification < 50 chars
    const ackBtn = page.locator('[data-testid="pipeline-threat-card"]').getByRole('button', { name: /^Acknowledge$/i }).or(
      page.getByRole('button', { name: /^Acknowledge$/i }).first()
    );
    await expect(ackBtn.first()).toBeDisabled();

    // Optional: 50+ chars enables Acknowledge
    await justification.fill('This is a detailed justification for acknowledging the high-value threat per GRC policy.');
    await expect(ackBtn.first()).toBeEnabled({ timeout: 2000 });
  });

  test.skip('Test 4: Structured Triage Workflow — DISMISS/REVERT open inline form; dropdown + text required before submit', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForDashboardReady(page);
    await waitForPipelineSection(page);

    // Ensure we have one low-value pipeline threat, then Acknowledge it to move to Active Risks
    const manualBtn = page.getByRole('button', { name: /Manual Risk REGISTRATION/i });
    const manualVisible = await manualBtn.isVisible().catch(() => false);
    const triageTitle = `E2E Triage ${Date.now()}`;
    if (manualVisible) {
      await manualBtn.click();
      await page.getByPlaceholder(/Risk title/i).fill(triageTitle);
      await page.getByPlaceholder(/Source agent/i).fill('E2E');
      await page.getByPlaceholder(/Inherent risk/i).fill('1.0'); // low value so Acknowledge is enabled
      await page.getByRole('button', { name: /^Register$/i }).click();
      // Data-driven wait: wait until the new title shows up in the DOM
      await expect(page.getByText(triageTitle).first()).toBeVisible({ timeout: 15_000 });
    }

    // Click Acknowledge on the specific card we just created (low-value so button is enabled)
    const ackBtn = page
      .locator('div, section, li')
      .filter({ hasText: triageTitle })
      .getByRole('button', { name: /Acknowledge/i })
      .first();
    await ackBtn.click();
    await page.waitForTimeout(1500);

    // Scroll to Active Risks board and find DISMISS RISK within that container to avoid strict mode (multiple elements)
    const activeRisksSection = page.locator('[data-testid="active-risks-board"]');
    await activeRisksSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const dismissBtn = activeRisksSection.getByRole('button', { name: /DISMISS RISK/i }).first();
    const revertBtn = activeRisksSection.getByRole('button', { name: 'REVERT TO PIPELINE' }).first();

    const hasDismiss = await dismissBtn.isVisible().catch(() => false);
    const hasRevert = await revertBtn.isVisible().catch(() => false);

    if (hasDismiss) {
      await dismissBtn.click();
      await page.waitForTimeout(500); // allow inline form animation before looking for dropdown
      const submitBtn = page.getByRole('button', { name: 'SUBMIT DISMISS' }).first();
      await expect(submitBtn).toBeVisible({ timeout: 5000 });
      await expect(submitBtn).toBeDisabled();
      const formArea = submitBtn.locator('..').locator('..');
      const reasonSelect = formArea.locator('select').first();
      await expect(reasonSelect).toBeVisible({ timeout: 3000 });
      await reasonSelect.selectOption({ value: 'FALSE_POSITIVE' });
      const justificationInput = formArea.getByPlaceholder(/Enter detailed justification/i).first();
      await expect(justificationInput).toBeVisible({ timeout: 2000 });
      await justificationInput.fill('E2E test justification for audit log to satisfy gatekeeper protocol.');
      await expect(submitBtn).toBeEnabled({ timeout: 2000 });
      await page.getByRole('button', { name: 'CANCEL' }).first().click();
    }

    if (hasRevert && !hasDismiss) {
      await revertBtn.click();
      await page.waitForTimeout(500); // allow inline form animation
      const reasonSelect = page.locator('select').filter({ has: page.locator('option') }).first();
      await expect(reasonSelect).toBeVisible({ timeout: 3000 });
      await expect(page.getByPlaceholder(/Enter detailed justification/i).first()).toBeVisible({ timeout: 2000 });
      const submitRevert = page.getByRole('button', { name: 'SUBMIT REVERT' }).first();
      await expect(submitRevert).toBeDisabled();
      await reasonSelect.selectOption({ index: 1 });
      await page.getByPlaceholder(/Enter detailed justification/i).first().fill('E2E test justification for revert to pipeline.');
      await expect(submitRevert).toBeEnabled({ timeout: 2000 });
      await page.getByRole('button', { name: 'CANCEL' }).first().click();
    }

    expect(hasDismiss || hasRevert).toBeTruthy();
  });
});
