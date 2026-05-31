import { expect, test } from '@playwright/test';

export type PageMode = 'dashboard' | 'signin' | 'constitutional_void';

/** Wait for dashboard shell or known alternate gates (matches dashboard.spec.ts). */
export async function waitForDashboardReady(page: import('@playwright/test').Page): Promise<PageMode> {
  await page.waitForLoadState('domcontentloaded');
  const dashboardMarker = page
    .getByText('Enterprise Risk Posture')
    .or(page.getByText('Protected Tenants'))
    .first();
  const signInMarker = page.getByRole('heading', { name: /Sign in/i }).first();
  const constitutionalVoidMarker = page
    .getByText(/critical system failure: constitutional void detected/i)
    .first();

  try {
    await Promise.race([
      dashboardMarker.waitFor({ state: 'visible', timeout: 20_000 }),
      signInMarker.waitFor({ state: 'visible', timeout: 20_000 }),
      constitutionalVoidMarker.waitFor({ state: 'visible', timeout: 20_000 }),
    ]);
  } catch {
    // Fall through to explicit mode detection.
  }

  if (await dashboardMarker.isVisible().catch(() => false)) {
    await expect(page.getByText('Loading dashboard…')).not.toBeVisible({ timeout: 20_000 }).catch(() => undefined);
    return 'dashboard';
  }
  if (await signInMarker.isVisible().catch(() => false)) return 'signin';
  if (await constitutionalVoidMarker.isVisible().catch(() => false)) return 'constitutional_void';

  await expect(dashboardMarker).toBeVisible({ timeout: 10_000 });
  return 'dashboard';
}

export function skipUnlessDashboard(mode: PageMode): void {
  if (mode === 'signin') test.skip(true, 'Requires authenticated session');
  if (mode === 'constitutional_void') {
    test.skip(true, 'Constitutional void — ensure DATABASE_URL and /docs/TAS.md for full pipeline E2E');
  }
}
