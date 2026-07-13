import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const productionTarget =
  process.env.E2E_PRODUCTION === '1' ||
  process.env.PLAYWRIGHT_TARGET?.trim().toLowerCase() === 'production';

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
  workers: process.env.CI ? 1 : undefined,
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
          command: process.env.CI
            ? 'npm run build && npm run start -- -p 3000'
            : 'npm run dev -- -p 3000',
          url: 'http://127.0.0.1:3000',
          reuseExistingServer: !process.env.CI,
          timeout: process.env.CI ? 240 * 1000 : 120 * 1000,
        },
      }),
});

