#!/usr/bin/env node
/**
 * BWC production smoke — hits live Vercel (bwc.ironframegrc.com).
 * Requires DATABASE_URL + Supabase admin keys in .env.local.
 */
import { execSync } from "node:child_process";

process.env.E2E_PRODUCTION = "1";

execSync(
  "npx playwright test tests/e2e/reportsAuditTrailResponsiveness.spec.ts tests/e2e/bwcWilSmoke.spec.ts --project=chromium --workers=1",
  { stdio: "inherit", env: process.env },
);
