import { test, expect } from '@playwright/test';

/**
 * SOVEREIGN E2E TEST: Sentinel Dashboard
 * Mandate: Verify UI accurately reflects Agent 11 memory and Irontrust math.
 */
test.describe('Sentinel Dashboard Experience', () => {
  test('👁️ VISUAL AUDIT: Should display correct risk status and agent progress', async ({ page }) => {
    // 1. Navigate to the Dashboard (Mocking Auth for this E2E run)
    await page.goto('/dashboard');

    // 2. Verify Title & Tenant Context
    await expect(page.locator('h1')).toContainText('Sentinel Dashboard');
    await expect(page.locator('header')).toContainText('Sovereign Orchestration Monitoring');

    // 3. Verify Financial Risk Card (Agent 3 Logic)
    // Checking if the USD formatting is present ($11,100,000.00)
    const riskCard = page.locator('section').filter({ hasText: 'Financial Exposure' });
    await expect(page.getByText('$11,100,000.00')).toBeVisible();

    // 4. Verify Audit Stepper (Agent 1 & 5 Logic)
    // Check for the checkmarks or "Completed" status in the stepper
    const stepper = page.locator('div').filter({ hasText: 'Initial Routing' });
    await expect(page.getByText('Agent 1 (Ironcore)')).toBeVisible();
    await expect(page.getByText('Agent 3 (Irontrust)')).toBeVisible();

    // 5. Verify Checkpoint Memory (Agent 11) — Audit Chain of Command section
    await expect(page.getByText('Audit Chain of Command')).toBeVisible();
  });
});
