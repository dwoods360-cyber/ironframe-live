import { test, expect } from '@playwright/test';

test('verify live dashboard renders without supabase errors', async ({ page }) => {
  // Navigate to the root URL
  const response = await page.goto('/');

  // 1. Verify the server responded successfully (no 500 Server Errors)
  expect(response?.ok()).toBeTruthy();

  // 2. Ensure the fatal Supabase error is absolutely not present
  await expect(page.locator('body')).not.toHaveText(/supabaseKey is required/);

  // 3. Verify the page actually rendered HTML content
  await expect(page.locator('body')).toBeVisible();

  console.log('Successfully verified cloud environment rendering and connectivity.');
});
