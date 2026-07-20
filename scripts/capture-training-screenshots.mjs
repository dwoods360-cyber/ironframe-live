/**
 * Refresh training screenshot corpus under public/docs/training/assets/.
 *
 * Default: copy proven Level 1 / Level 2 UI captures into track-specific filenames
 * so analyst / practitioner-core / ops-gtm chapters always have learning images.
 *
 * Optional live capture (authenticated):
 *   TRAINING_SCREENSHOT_BASE_URL=http://127.0.0.1:3000
 *   TRAINING_SCREENSHOT_STORAGE_STATE=./secrets/training-screenshot-storage.json
 *   node scripts/capture-training-screenshots.mjs --live
 *
 * Create storage state once via Playwright codegen / login save.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const assetsDir = path.join(root, "public", "docs", "training", "assets");

/** @type {Array<{ out: string, from: string }>} */
const COPY_MAP = [
  // Path A — Jr. GRC Analyst
  { out: "analyst-01-hazard-pipeline.png", from: "level-1-04-integrity-hub-ale.png" },
  { out: "analyst-02-evidence-chain.png", from: "level-1-05-evidence-vault.png" },
  { out: "analyst-03-auditor-export.png", from: "get-started-dashboard-exports-stack.png" },
  { out: "analyst-04-board-note.png", from: "level-1-07-board-report-readiness.png" },
  { out: "analyst-05-mini-audit-cycle.png", from: "level-1-03-dashboard-navigation.png" },
  { out: "analyst-06-analyst-certification.png", from: "level-1-12-student-certification.png" },
  // Path B — Platform Practitioner Core
  { out: "practitioner-core-01-security-controls.png", from: "level-2-04-security-compliance-controls.png" },
  { out: "practitioner-core-02-audit-trail-exports.png", from: "level-2-05-audit-trail-exports.png" },
  { out: "practitioner-core-03-money-integrity.png", from: "level-2-11-bigint-financial-integrity.png" },
  { out: "practitioner-core-04-architecture-topology.png", from: "level-2-01-architecture-topology.png" },
  { out: "practitioner-core-05-api-ingress-contracts.png", from: "level-2-02-api-ingress-contracts.png" },
  { out: "practitioner-core-06-deployment-ops.png", from: "level-2-03-deployment-ops-runbooks.png" },
  { out: "practitioner-core-07-ironboard-bridge.png", from: "level-2-06-ironboard-telemetry-bridge.png" },
  { out: "practitioner-core-08-certification.png", from: "level-2-12-practitioner-certification.png" },
  // Path C — Ops GTM (seed from closest until --live replaces)
  { out: "ops-gtm-01-ops-hub-home.png", from: "level-2-09-sales-support-portals.png" },
  { out: "ops-gtm-02-approvals-hitl.png", from: "level-2-10-approvals-human-in-loop.png" },
  { out: "ops-gtm-03-ironleads-suspect.png", from: "level-2-09-sales-support-portals.png" },
  { out: "ops-gtm-04-workflow-review-live.png", from: "level-1-07-board-report-readiness.png" },
  { out: "ops-gtm-05-calendar-recap.png", from: "level-1-03-dashboard-navigation.png" },
  { out: "ops-gtm-06-certification.png", from: "level-1-12-student-certification.png" },
  // Path D — Governance Frame
  { out: "gf-l1-01-what-gf-is.png", from: "level-1-08-governance-frame-reader.png" },
  { out: "gf-l1-02-two-planes.png", from: "level-1-09-docs-hub-handbook.png" },
  { out: "gf-l1-03-read-briefing.png", from: "level-1-08-governance-frame-reader.png" },
  { out: "gf-l1-04-cite-primary.png", from: "level-1-08-governance-frame-reader.png" },
  { out: "gf-l1-05-reader-cert.png", from: "level-1-12-student-certification.png" },
  { out: "gf-l3-04-quarantine-promote.png", from: "level-2-09-sales-support-portals.png" },
  { out: "gf-l3-05-verifier-cert.png", from: "level-1-12-student-certification.png" },
];

/** Live capture targets (require storage state). */
const LIVE_CAPTURES = [
  { file: "ops-gtm-01-ops-hub-home.png", route: "/dashboard/operations" },
  { file: "ops-gtm-02-approvals-hitl.png", route: "/dashboard/admin/approvals?kind=SALES" },
  { file: "ops-gtm-03-ironleads-suspect.png", route: "/dashboard/operations/ironleads" },
  { file: "ops-gtm-04-workflow-review-live.png", route: "/dashboard/operations/workflow-review" },
  { file: "ops-gtm-05-calendar-recap.png", route: "/dashboard/operations?tab=calendar" },
  { file: "analyst-03-auditor-export.png", route: "/exports" },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyBaselines() {
  ensureDir(assetsDir);
  let ok = 0;
  let missing = 0;
  for (const row of COPY_MAP) {
    const src = path.join(assetsDir, row.from);
    const dest = path.join(assetsDir, row.out);
    if (!fs.existsSync(src)) {
      console.warn(`[skip] missing source ${row.from}`);
      missing += 1;
      continue;
    }
    fs.copyFileSync(src, dest);
    console.log(`[copy] ${row.from} → ${row.out}`);
    ok += 1;
  }
  console.log(`Copied ${ok} assets (${missing} missing sources).`);
}

async function liveCapture() {
  const base = (process.env.TRAINING_SCREENSHOT_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
  const statePath =
    process.env.TRAINING_SCREENSHOT_STORAGE_STATE ||
    path.join(root, "secrets", "training-screenshot-storage.json");
  if (!fs.existsSync(statePath)) {
    console.warn(
      `[live] No storage state at ${statePath}. Ran copy baselines only.\n` +
        `  Save a Playwright storageState after operator login, then re-run with --live.`,
    );
    return;
  }
  let playwright;
  try {
    playwright = await import("playwright");
  } catch {
    console.warn("[live] playwright not installed — skip live capture.");
    return;
  }
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: statePath,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  for (const shot of LIVE_CAPTURES) {
    const url = `${base}${shot.route}`;
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
      await page.waitForTimeout(800);
      const dest = path.join(assetsDir, shot.file);
      await page.screenshot({ path: dest, fullPage: false });
      console.log(`[live] ${shot.route} → ${shot.file}`);
    } catch (err) {
      console.warn(`[live] failed ${shot.route}: ${err instanceof Error ? err.message : err}`);
    }
  }
  await browser.close();
}

const live = process.argv.includes("--live");
copyBaselines();
if (live) {
  await liveCapture();
} else {
  console.log("Tip: npm run training:screenshots -- --live  (with storage state) refreshes Ops Hub captures.");
}
