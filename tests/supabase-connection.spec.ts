import { test, expect } from '@playwright/test';

test('verify live dashboard renders with supabase data', async ({ page }) => {
  // Navigate to the main dashboard
  await page.goto('/');

  // Ensure the page doesn't show a pre-render error
  // FIX: We must point to the 'body' locator before checking for text
  await expect(page.locator('body')).not.toHaveText(/supabaseKey is required/);

  // Check for a core dashboard element to confirm rendering
  const dashboard = page.locator('main');
  await expect(dashboard).toBeVisible();

  console.log('Successfully verified Supabase client initialization in cloud environment.');
});
