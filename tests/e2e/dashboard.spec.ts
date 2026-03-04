import { test, expect } from '@playwright/test';

/**
 * E2E: Main dashboard and Assessment Workspace (drawer).
 * - Main page shows Enterprise Risk Posture and governance UI.
 * - Clicking "Assess Risk" opens the 25% opaque slide-out drawer (role=dialog).
 */
test.describe('Main Dashboard and Risk Assessment Drawer', () => {
  test('displays main dashboard header and opens drawer via Assess Risk', async ({ page }) => {
    // 1. Navigate to the main dashboard (root)
    await page.goto('/');

    // 2. Wait for dashboard to load (no longer "Loading dashboard…")
    await expect(page.getByText('Loading dashboard…')).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Enterprise Risk Posture')).toBeVisible({ timeout: 5000 });

    // 3. Verify main dashboard context (header / governance stream)
    await expect(page.getByText('Protected Tenants')).toBeVisible();
    await expect(page.getByText('GOVERNANCE ACTIVITY STREAM')).toBeVisible();

    // 4. Open the Assessment Workspace (drawer) by clicking "Assess Risk" on a risk card
    const assessRisk = page.getByRole('link', { name: 'Assess Risk' });
    await expect(assessRisk.first()).toBeVisible({ timeout: 10000 });
    await assessRisk.first().click();

    // 5. Verify the slide-out drawer opens (opaque drawer with role=dialog)
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible({ timeout: 5000 });
    await expect(drawer).toHaveAttribute('aria-modal', 'true');
  });
});
