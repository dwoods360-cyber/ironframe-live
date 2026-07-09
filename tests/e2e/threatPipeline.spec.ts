import { test, expect } from '@playwright/test';
import { skipUnlessDashboard, waitForDashboardReady } from './helpers/dashboardGate';
import { bootstrapApexOperatorSession, openWorkspaceCommandPost } from './helpers/commandPostDiagnostic';
import { TENANT_UUIDS } from '@/app/utils/tenantIsolation';

const OPERATOR_EMAIL =
  process.env.IRONFRAME_E2E_OPERATOR_EMAIL?.trim() || 'dwoods360@gmail.com';

/**
 * E2E: Threat Pipeline & GRC Gates (GATEKEEPER PROTOCOL).
 * Codifies defenses for Threat Ingestion pipeline and structured justification workflows.
 *
 * Resilient to: slow dev server, empty pipeline (no Attack Velocity until threats exist),
 * and tenant state — we wait for dashboard shell first, then pipeline section (Manual Risk REGISTRATION or Attack Velocity).
 */

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

/** Mandate 8: human assignee custody before acknowledge — claim via header row. */
async function claimPipelineThreatAssignee(
  threatCard: import('@playwright/test').Locator,
) {
  const claimBtn = threatCard.locator('[data-testid="pipeline-claim-assign-btn"]');
  await expect(claimBtn).toBeVisible({ timeout: 8000 });
  const claimed = await claimBtn.getByText(/Claimed/i).isVisible().catch(() => false);
  if (!claimed) {
    await claimBtn.click();
    await expect(claimBtn.getByText(/Claimed/i)).toBeVisible({ timeout: 12_000 });
  }
}

const MANUAL_REGISTER_JUSTIFICATION =
  'E2E manual risk registration with minimum fifty character justification for GRC gate.';

/** Manual Risk REGISTRATION requires 50+ char justification before Register enables. */
async function registerManualPipelineThreat(
  page: import('@playwright/test').Page,
  opts: { title: string; loss?: string; reopenForm?: boolean },
) {
  const manualBtn = page.getByRole('button', { name: /Manual Risk REGISTRATION/i });
  await expect(manualBtn).toBeVisible({ timeout: 8000 });
  if (opts.reopenForm !== false) {
    await manualBtn.click();
  }
  await page.getByPlaceholder(/Risk title/i).fill(opts.title);
  await page.getByPlaceholder(/Source agent/i).fill('E2E Test');
  await page.getByPlaceholder(/Target sector/i).fill('Healthcare');
  await page.getByPlaceholder(/Inherent risk/i).fill(opts.loss ?? '2.0');
  await page.getByPlaceholder(/Justification Required/i).fill(MANUAL_REGISTER_JUSTIFICATION);
  const registerBtn = page.getByRole('button', { name: /^Register$/i });
  await expect(registerBtn).toBeEnabled({ timeout: 5000 });
  await registerBtn.click();
  await expect(registerBtn).not.toBeVisible({ timeout: 25_000 });
  await page.waitForTimeout(800);
}

/** Manual registration UI lands on Active Risks; pipeline E2E seeds via API. */
async function seedPipelineThreatViaApi(
  page: import('@playwright/test').Page,
  opts: { title: string; loss?: string },
) {
  const tenantId = TENANT_UUIDS.medshield;
  const loss = opts.loss ?? '200000000';
  await page.evaluate(
    async ({ title, loss, tenantId, notes }) => {
      const res = await fetch('/api/threats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          title,
          source: 'E2E Test',
          target: 'Healthcare',
          loss,
          notes,
          destination: 'pipeline',
        }),
      });
      if (!res.ok) {
        throw new Error(`seed pipeline threat failed: ${res.status} ${await res.text()}`);
      }
    },
    { title: opts.title, loss, tenantId, notes: MANUAL_REGISTER_JUSTIFICATION },
  );
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('ironframe:dashboard-refetch'));
  });
  await page.waitForTimeout(3000);
  await attackVelocityLocator(page).scrollIntoViewIfNeeded().catch(() => {});
}

test.describe('Threat Pipeline & GRC Gates', () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    test.skip(
      !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
      'SUPABASE_SERVICE_ROLE_KEY required to mint apex session',
    );
    await bootstrapApexOperatorSession(page, OPERATOR_EMAIL);
    await openWorkspaceCommandPost(page, "medshield");
  });

  async function gotoCommandPostHome(page: import('@playwright/test').Page) {
    await page.goto(new URL('/', page.url()).href, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  }

  test('Test 1: Zero-Trust UI Rendering — pipeline loads for active tenant; Kimbot tags with tenantId', async ({
    page,
  }) => {
    await gotoCommandPostHome(page);
    const mode = await waitForDashboardReady(page);
    skipUnlessDashboard(mode);
    await waitForPipelineSection(page);

    // Pipeline section is present (either empty state or Attack Velocity when threats exist)
    const hasAttackVelocity = await attackVelocityLocator(page).isVisible().catch(() => false);
    const hasWaiting =
      (await page.getByText('[ WAITING FOR TRIAGE SELECTIONS... ]').isVisible()) ||
      (await page.getByText('[ WAITING FOR INGESTION STREAM... ]').first().isVisible()) || false;
    const hasLiabilityBadge =
      (await page.getByText(/\$[\d.]+M Liability/).first().isVisible()) ||
      (await page.getByText(/\d+ Attacks in Queue/).first().isVisible()) || false;
    const hasManualRegistration = await page
      .getByRole('button', { name: /Manual Risk REGISTRATION/i })
      .isVisible()
      .catch(() => false);
    expect(hasAttackVelocity || hasWaiting || hasLiabilityBadge || hasManualRegistration).toBeTruthy();

    await expect(page.getByText('Protected Tenants').first()).toBeVisible({ timeout: 5000 });
  });

  test('Test 2: High-Velocity UI Condensation — 5 threats render as Lead Card + badge only', async ({
    page,
  }) => {
    await gotoCommandPostHome(page);
    const mode = await waitForDashboardReady(page);
    skipUnlessDashboard(mode);
    await waitForPipelineSection(page);
    await page.waitForTimeout(2000); // allow pipeline DB sync so manual threats persist

    // Open Manual Risk Registration and add 5 threats
    for (let i = 0; i < 5; i++) {
      await registerManualPipelineThreat(page, {
        title: `E2E Condensation Threat ${i} ${Date.now()}`,
        reopenForm: i === 0 ? true : true,
      });
      await page.waitForTimeout(400);
      if (i < 4) {
        const manualBtn = page.getByRole('button', { name: /Manual Risk REGISTRATION/i });
        await manualBtn.click();
        await expect(page.getByPlaceholder(/Risk title/i)).toBeVisible({ timeout: 2000 });
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
    await gotoCommandPostHome(page);
    const mode = await waitForDashboardReady(page);
    skipUnlessDashboard(mode);
    await waitForPipelineSection(page);
    await page.waitForTimeout(2000); // allow pipeline DB sync to complete so our manual threat is not overwritten

    // Add one manual threat with liability > $10M (pipeline lane for acknowledge gates)
    const highLiabilityTitle = `E2E High Liability ${Date.now()}`;
    await seedPipelineThreatViaApi(page, { title: highLiabilityTitle, loss: '1200000000' });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 90_000 });
    await waitForDashboardReady(page);
    await waitForPipelineSection(page);
    await page.waitForTimeout(3000);

    await page.waitForTimeout(1500);
    // Scroll pipeline into view; Attack Velocity appears after we add a threat
    await waitForPipelineSection(page);
    await attackVelocityLocator(page).scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(500);

    const threatCard = page
      .locator('[data-testid="pipeline-threat-card"]')
      .filter({ hasText: highLiabilityTitle })
      .first();
    await expect(threatCard).toBeVisible({ timeout: 10_000 });
    await threatCard.scrollIntoViewIfNeeded();

    const justification = threatCard.locator('[data-testid="grc-justification"]');
    await expect(justification).toBeVisible({ timeout: 8000 });

    const ackBtn = threatCard.locator('[data-testid="pipeline-acknowledge-btn"]');
    await expect(ackBtn).toBeVisible({ timeout: 5000 });
    await expect(ackBtn).toBeDisabled();

    await justification.fill(
      'This is a detailed justification for acknowledging the high-value threat per GRC policy.',
    );
    // GRC length met but assignee custody still open — acknowledge stays blocked.
    await expect(ackBtn).toBeDisabled();

    await claimPipelineThreatAssignee(threatCard);
    await expect(ackBtn).toBeEnabled({ timeout: 12_000 });
  });

  test('Test 4: Acknowledge transitions pipeline card to Active Risks within 3 seconds', async ({
    page,
  }) => {
    await gotoCommandPostHome(page);
    const mode = await waitForDashboardReady(page);
    skipUnlessDashboard(mode);
    await waitForPipelineSection(page);
    await page.waitForTimeout(2000);

    const triageTitle = `E2E Ack Transition ${Date.now()}`;
    await seedPipelineThreatViaApi(page, { title: triageTitle });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 90_000 });
    await waitForDashboardReady(page);
    await waitForPipelineSection(page);
    await page.waitForTimeout(3000);

    await waitForPipelineSection(page);
    await attackVelocityLocator(page).scrollIntoViewIfNeeded().catch(() => {});

    const threatCard = page
      .locator('[data-testid="pipeline-threat-card"]')
      .filter({ hasText: triageTitle })
      .first();
    await expect(threatCard).toBeVisible({ timeout: 12_000 });

    const justification = threatCard.locator('[data-testid="grc-justification"]');
    await justification.fill(
      'E2E acknowledge transition test with sufficient GRC justification for gate compliance.',
    );

    await claimPipelineThreatAssignee(threatCard);

    const ackBtn = threatCard.locator('[data-testid="pipeline-acknowledge-btn"]');
    await expect(ackBtn).toBeEnabled({ timeout: 5000 });

    const startedAt = Date.now();
    await ackBtn.click();

    const activeBoard = page.locator('[data-testid="active-risks-board"]');
    await activeBoard.scrollIntoViewIfNeeded();
    await expect(activeBoard.getByText(triageTitle).first()).toBeVisible({ timeout: 3000 });
    await expect(threatCard).not.toBeVisible({ timeout: 3000 });

    const elapsedMs = Date.now() - startedAt;
    expect(elapsedMs).toBeLessThan(3000);
  });

  test('Test 5: Assignee custody — tenant roster loads and acknowledge gated until claim', async ({
    page,
  }) => {
    await gotoCommandPostHome(page);
    const mode = await waitForDashboardReady(page);
    skipUnlessDashboard(mode);
    await waitForPipelineSection(page);
    await page.waitForTimeout(2000);

    const triageTitle = `E2E Assignee Custody ${Date.now()}`;
    await registerManualPipelineThreat(page, { title: triageTitle });

    const activeBoard = page.locator('[data-testid="active-risks-board"]');
    await activeBoard.scrollIntoViewIfNeeded();
    await expect(activeBoard.getByRole('heading', { name: triageTitle })).toBeVisible({
      timeout: 15_000,
    });

    const cardRoot = activeBoard
      .getByRole('heading', { name: triageTitle })
      .locator('xpath=ancestor::div[contains(@class,"group")][1]');

    const assigneeSelect = cardRoot.locator('select').first();
    await expect(assigneeSelect).toBeVisible({ timeout: 8000 });
    const optionLabels = await assigneeSelect.locator('option').allTextContents();
    expect(optionLabels.length).toBeGreaterThan(1);
    expect(optionLabels.some((l) => /unassigned/i.test(l))).toBeTruthy();
    expect(
      optionLabels.some((l) => /dwoods360|@ironframe\.local|dereck|user_01/i.test(l)),
    ).toBeTruthy();

    const ackBtn = cardRoot.getByRole('button', { name: /^ACKNOWLEDGE$/i });
    await expect(ackBtn).toBeDisabled();

    const claimBtn = cardRoot.locator('[data-testid="active-risk-claim-assign-btn"]');
    await expect(claimBtn).toBeVisible();
    await expect(claimBtn).toContainText(/Claim/i);
    await expect(
      cardRoot.getByRole('button', { name: /CLAIM & ASSIGN THREAT/i }),
    ).toHaveCount(0);
  });

  test.skip('Test 6: Structured Triage Workflow — DISMISS/REVERT open inline form; dropdown + text required before submit', async ({
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
