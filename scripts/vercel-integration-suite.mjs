/**
 * Epic 16 / Tier A — integration gate: static types + repo health probes (no full vitest matrix).
 */
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";

const cliStagingBaseUrl = process.env.STAGING_SMOKE_BASE_URL?.trim();

dotenv.config({ path: ".env.staging.local", override: true });
dotenv.config({ path: ".env.local", override: true });
dotenv.config({ path: ".env", override: true });

const base = cliStagingBaseUrl || process.env.STAGING_SMOKE_BASE_URL?.trim();
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

run("npx", ["tsc", "--noEmit"], "TypeScript constitutional check");

if (!skipLive && base) {
  console.log(`[vercel-integration] Live target: ${base}`);
  run("node", ["scripts/staging-smoke-cron.mjs"], "Vercel cron integration smoke", {
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
} else if (!skipLive) {
  console.warn("[vercel-integration] STAGING_SMOKE_BASE_URL unset — skipping live probes (use --skip-live to silence).");
}

console.log("\n[vercel-integration] All gates green.");
