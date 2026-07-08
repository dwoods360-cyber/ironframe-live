import { test, expect } from '@playwright/test';
import { skipUnlessDashboard, waitForDashboardReady } from './helpers/dashboardGate';
import { bootstrapApexOperatorSession, openWorkspaceCommandPost } from './helpers/commandPostDiagnostic';

const OPERATOR_EMAIL =
  process.env.IRONFRAME_E2E_OPERATOR_EMAIL?.trim() || 'dwoods360@gmail.com';

test.describe('Control stress test → Command Post pipeline', () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    test.skip(
      !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
      'SUPABASE_SERVICE_ROLE_KEY required to mint apex session',
    );
    await bootstrapApexOperatorSession(page, OPERATOR_EMAIL);
    await openWorkspaceCommandPost(page, 'medshield');
  });

  test('stress test from Evidence Vault surfaces Sentinel card in Attack Velocity', async ({
    page,
  }) => {
    await page.goto(new URL('/vault?section=gaps', page.url()).href, {
      waitUntil: 'domcontentloaded',
      timeout: 90_000,
    });
    const mode = await waitForDashboardReady(page);
    skipUnlessDashboard(mode);

    const stressBtn = page
      .getByRole('button', { name: /^Stress test$/i })
      .or(page.getByRole('button', { name: /Trigger Control Stress Test/i }))
      .first();

    const hasStress = await stressBtn.isVisible({ timeout: 15_000 }).catch(() => false);
    test.skip(!hasStress, 'No control gaps available to stress test in this tenant');

    await stressBtn.click();

    await page.goto(new URL('/#threat-pipeline', page.url()).href, {
      waitUntil: 'domcontentloaded',
      timeout: 90_000,
    });
    await waitForDashboardReady(page);

    const pipelineCard = page
      .locator('[data-testid="pipeline-threat-card"]')
      .filter({ hasText: /Sentinel Hypothesis: Control Stress Test/i })
      .first();

    await expect(pipelineCard).toBeVisible({ timeout: 20_000 });
    await expect(pipelineCard.getByText(/HUMAN_SENTINEL/i)).toBeVisible({ timeout: 5000 });
  });
});
