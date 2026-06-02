/**
 * Epic 12 + Epic 16 + Tier A — automated integration gate for Vercel preview/production URLs.
 *
 * Usage:
 *   npm run test:vercel-integration              # tsc + Epic 12 vitest (--skip-live)
 *   npm run test:vercel-integration:live         # full live cron + Ironquery CSV/PDF probes
 *   npm run test:vercel-integration:live:epic17  # live suite + sovereign telemetry shadow smoke
 *   npm run test:vercel-integration:cloud:epic17  # cloud probes + Epic 17 only (skip local tsc/vitest)
 *   STAGING_SMOKE_BASE_URL=https://preview.vercel.app node scripts/vercel-integration-suite.mjs --include-epic17 --cloud-only
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
const includeEpic17 = process.argv.includes("--include-epic17");
const cloudOnly = process.argv.includes("--cloud-only");

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

if (!cloudOnly) {
  run("npx", ["tsc", "--noEmit"], "TypeScript constitutional check");

  run(
    "npx",
    [
      "vitest",
      "run",
      "tests/unit/pkiSignatureVerifier.test.ts",
      "tests/unit/bankVaultDualGate.test.ts",
      "tests/integration/bank-vault-success.test.ts",
      "tests/integration/bank-vault-rejection.test.ts",
    ],
    "Epic 11 vault PKI matrix",
  );

  run(
    "npx",
    ["vitest", "run", "tests/unit/signedAttestationGuard.test.ts", "tests/integration/epic12-shredder-attestation-guard.test.ts"],
    "Epic 12 vitest matrix (5 tests)",
  );
} else {
  console.log("\n[vercel-integration] --cloud-only: skipping local tsc/vitest; running edge HTTP probes only.");
}

if (epic12Only) {
  console.log("\n[vercel-integration] Done (--epic12-only).");
  process.exit(0);
}

if (skipLive) {
  console.log("\n[vercel-integration] Done (--skip-live).");
  process.exit(0);
}

if (!base) {
  console.warn(
    "[vercel-integration] STAGING_SMOKE_BASE_URL unset — skipping live Vercel probes (pass --skip-live to silence).",
  );
  console.log("\n[vercel-integration] All gates green.");
  process.exit(0);
}

console.log(`[vercel-integration] Live target: ${base}`);
run("node", ["scripts/staging-smoke-cron.mjs"], "Vercel cron integration smoke (21 probes)", {
  STAGING_SMOKE_BASE_URL: base,
});
run("node", ["scripts/ironquery-export-probe.mjs"], "Ironquery CSV export probe", {
  STAGING_SMOKE_BASE_URL: base,
  IRONQUERY_EXPORT_FORMAT: "csv",
});
run("node", ["scripts/ironquery-export-probe.mjs"], "Ironquery PDF export probe", {
  STAGING_SMOKE_BASE_URL: base,
  IRONQUERY_EXPORT_FORMAT: "pdf",
});

if (includeEpic17) {
  run(
    "node",
    ["scripts/epic17-orchestration-shadow-smoke.mjs"],
    "Epic 17 sovereign orchestration shadow smoke ([epic17-telemetry-stream])",
    { STAGING_SMOKE_BASE_URL: base },
  );
}

console.log("\n[vercel-integration] All gates green.");
