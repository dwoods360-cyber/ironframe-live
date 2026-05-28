/**
 * Epic 12 + Tier A — automated integration gate for Vercel preview/production URLs.
 *
 * Usage:
 *   STAGING_SMOKE_BASE_URL=https://your-preview.vercel.app node scripts/vercel-integration-suite.mjs
 *
 * Requires IRONFRAME_CRON_SECRET or STAGING_SMOKE_SECRET (and VERCEL_BYPASS_TOKEN when deployment protection is on).
 */
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";

/** Shell/CI URL wins over `.env.staging.local` (dotenv would otherwise overwrite it). */
const cliStagingBaseUrl = process.env.STAGING_SMOKE_BASE_URL?.trim();

dotenv.config({ path: ".env.staging.local", override: true });
dotenv.config({ path: ".env.local", override: true });
dotenv.config({ path: ".env", override: true });

const base = cliStagingBaseUrl || process.env.STAGING_SMOKE_BASE_URL?.trim();
const epic12Only = process.argv.includes("--epic12-only");
const skipLive = process.argv.includes("--skip-live");

function run(cmd, args, label, extraEnv = {}) {
  console.log(`\n[vercel-integration] ▶ ${label}`);
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...extraEnv },
  });
  if (r.status !== 0) {
    console.error(`[vercel-integration] ✗ ${label} failed (exit ${r.status ?? 1})`);
    process.exit(r.status ?? 1);
  }
  console.log(`[vercel-integration] ✓ ${label}`);
}

run("npx", ["vitest", "run", "tests/unit/signedAttestationGuard.test.ts", "tests/integration/epic12-shredder-attestation-guard.test.ts"], "Epic 12 vitest matrix (5 tests)");

if (epic12Only) {
  console.log("\n[vercel-integration] Done (--epic12-only).");
  process.exit(0);
}

if (skipLive) {
  console.log("\n[vercel-integration] Done (--skip-live).");
  process.exit(0);
}

if (!base) {
  console.error(
    "[vercel-integration] STAGING_SMOKE_BASE_URL is required for live Vercel cron smoke. Set it to the preview deployment origin.",
  );
  process.exit(2);
}

console.log(`[vercel-integration] Live target: ${base}`);
run(
  "node",
  ["scripts/staging-smoke-cron.mjs"],
  "Vercel cron integration smoke (21 probes)",
  { STAGING_SMOKE_BASE_URL: base },
);

console.log("\n[vercel-integration] All gates green.");
