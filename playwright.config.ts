import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const productionTarget =
  process.env.E2E_PRODUCTION === '1' ||
  process.env.PLAYWRIGHT_TARGET?.trim().toLowerCase() === 'production';
const useProductionBuildServer =
  process.env.CI === 'true' ||
  process.env.CI === '1' ||
  process.env.E2E_USE_BUILD_SERVER === '1';

if (!productionTarget) {
  process.env.IRONFRAME_PUBLIC_INSTANT_CHECKOUT_ENABLED = "1";
}

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  testIgnore: [
    '**/tests/integration/**',
    '**/tests/unit/**',
    '**/tests/perf/**',
    '**/*.test.ts',
  ],
  timeout: 60_000, // 60s per test — avoid timeouts when dev server or Supabase is slow
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Auth bootstrap uses one operator account; serial workers prevent OTP invalidation races.
  workers: 1,
  reporter: 'html',

  use: {
    baseURL: productionTarget
      ? (
          process.env.E2E_PRODUCTION_BASE_URL?.trim().replace(/\/+$/, "") ||
          (process.env.E2E_PRODUCTION_TENANT_SLUG?.trim()
            ? `https://${process.env.E2E_PRODUCTION_TENANT_SLUG.trim().toLowerCase()}.${process.env.E2E_TENANT_APEX_DOMAIN?.trim() || "ironframegrc.com"}`
            : "https://ironframegrc.com")
        )
      : "http://127.0.0.1:3000",
    trace: 'on-first-retry',
    actionTimeout: 15_000, // 15s for click/fill — slower than default 10s
  },

  projects: process.env.CI
    ? [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
      ]
    : [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  ...(productionTarget
    ? {}
    : {
        webServer: {
          command: useProductionBuildServer
            ? 'npm run build && npm run start -- -p 3000'
            : 'npm run dev -- -p 3000',
          url: 'http://127.0.0.1:3000',
          // Never inherit a manually started server that may have stale E2E gate settings.
          reuseExistingServer: false,
          timeout: useProductionBuildServer ? 240 * 1000 : 120 * 1000,
          // Exercise the real provisioning branch without enabling public checkout outside E2E.
          env: {
            IRONFRAME_PLAYWRIGHT_E2E: "1",
            IRONFRAME_PUBLIC_INSTANT_CHECKOUT_ENABLED: "1",
            // Keep local production-bundle tests on the wildcard loopback domain.
            IRONFRAME_TENANT_APEX_DOMAIN: "lvh.me",
            NEXT_PUBLIC_DEVELOPMENT_DOMAIN: "lvh.me:3000",
          },
        },
      }),
});

