#!/usr/bin/env node
/**
 * Design-partner production smoke — hits live Vercel tenant host from env.
 * Requires E2E_PRODUCTION_TENANT_SLUG, E2E_PRODUCTION_OPERATOR_EMAIL, DATABASE_URL, Supabase keys.
 */
import { execSync } from "node:child_process";

process.env.E2E_PRODUCTION = "1";

const reporterFlag = process.env.CI ? " --reporter=github" : "";

execSync(
  `npx playwright test tests/e2e/reportsAuditTrailResponsiveness.spec.ts tests/e2e/designPartnerProductionSmoke.spec.ts --project=chromium --workers=1${reporterFlag}`,
  { stdio: "inherit", env: process.env },
);
