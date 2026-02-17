import { test, expect } from '@playwright/test';

test.describe('Vendors Dashboard Audit', () => {
  test('Should load and interact with the vendors table', async ({ page }) => {
    
    // Step 1: Baseline Load (Accounting for Windows Hydration Delay)
    await test.step('Navigate and Wait for Mount', async () => {
      await page.goto('http://localhost:3000/vendors');
      // Explicitly wait for the table structure to exist before checking visibility
      // This ensures the 'isMounted' state has flipped to true.
      await page.waitForSelector('text=VENDOR NAME', { state: 'visible', timeout: 15000 });
    });

    // Step 2: Layout Integrity
    await test.step('Verify Dashboard Header', async () => {
      // Use regex /i to ensure case-insensitivity against CSS transformations
      const header = page.locator('h1');
      await expect(header).toHaveText(/SUPPLY CHAIN \/\/ GLOBAL/i, { timeout: 10000 });
    });

    // Step 3: Interactive Logic - FIXED STRICT MODE VIOLATION
    await test.step('Verify Add Vendor Modal', async () => {
      // Use the specific Test ID to avoid ambiguity between header and toolbar buttons
      const addBtn = page.getByTestId('header-add-vendor-chip');
      await addBtn.waitFor({ state: 'visible' });
      await addBtn.click();
      
      // Verify modal visibility
      await expect(page.getByText(/Add New Vendor/i)).toBeVisible();
      
      // Clean Exit
      await page.keyboard.press('Escape');
    });

    // Step 4: Dropdown Logic
    await test.step('Verify Action Menu Dropdown', async () => {
      // Find the first three-dot menu icon in the grid
      const actionButton = page.locator('button').filter({ has: page.locator('.lucide-more-vertical') }).first();
      await actionButton.click();
      
      // Verify menu items (Z-Index check)
      await expect(page.getByText(/EMAIL VENDOR/i)).toBeVisible();
      await expect(page.getByText(/GENERAL RFI/i)).toBeVisible();
    });
  });
});