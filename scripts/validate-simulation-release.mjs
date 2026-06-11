/**
 * One-shot release validation: console apply-error scan + simulation API stability.
 * Usage: node scripts/validate-simulation-release.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.VALIDATION_BASE_URL ?? "http://localhost:3000";
const POLL_ROUNDS = 6;
const POLL_GAP_MS = 800;

async function probeSimulationApis() {
  const endpoints = [
    "/api/simulation/ironintel-resilience",
    "/api/simulation/ironintel-resilience?after=2026-01-01T00:00:00.000Z&simulation=1",
    "/api/simulation/ironsight-review-queue",
  ];
  const results = [];
  for (let round = 0; round < POLL_ROUNDS; round += 1) {
    for (const path of endpoints) {
      const started = Date.now();
      const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
      const elapsed = Date.now() - started;
      let body = "";
      try {
        body = await res.text();
      } catch {
        body = "";
      }
      results.push({ round, path, status: res.status, elapsed, body: body.slice(0, 120) });
    }
    if (round < POLL_ROUNDS - 1) {
      await new Promise((r) => setTimeout(r, POLL_GAP_MS));
    }
  }
  return results;
}

async function scanBrowserConsole() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => {
    pageErrors.push(err.message ?? String(err));
  });

  const resilienceStatuses = [];
  page.on("response", (res) => {
    const url = res.url();
    if (url.includes("/api/simulation/ironintel-resilience")) {
      resilienceStatuses.push(res.status());
    }
    if (url.includes("/api/simulation/ironsight-review-queue")) {
      resilienceStatuses.push(res.status());
    }
  });

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(8_000);

  await browser.close();

  const applyHits = [...consoleErrors, ...pageErrors].filter((m) =>
    /reading 'apply'|Cannot read properties of undefined \(reading 'apply'\)/i.test(m),
  );

  return { consoleErrors, pageErrors, applyHits, resilienceStatuses };
}

function summarizeApi(results) {
  const ironintel = results.filter((r) => r.path.includes("ironintel"));
  const ironsight = results.filter((r) => r.path.includes("ironsight"));
  const ironintel200 = ironintel.filter((r) => r.status === 200).length;
  const ironintel499 = ironintel.filter((r) => r.status === 499).length;
  const ironsight200 = ironsight.filter((r) => r.status === 200).length;
  const maxIronintelMs = Math.max(...ironintel.map((r) => r.elapsed), 0);
  return { ironintel200, ironintel499, ironsight200, totalIronintel: ironintel.length, maxIronintelMs };
}

async function main() {
  console.log("=== Simulation release validation scan ===");
  console.log(`Base URL: ${BASE}\n`);

  const apiResults = await probeSimulationApis();
  const apiSummary = summarizeApi(apiResults);

  console.log("--- Direct API probe ---");
  console.log(
    `ironintel-resilience: ${apiSummary.ironintel200}/${apiSummary.totalIronintel} HTTP 200` +
      (apiSummary.ironintel499 ? ` (${apiSummary.ironintel499} aborted/499)` : "") +
      ` | max latency ${apiSummary.maxIronintelMs}ms`,
  );
  console.log(
    `ironsight-review-queue: ${apiSummary.ironsight200}/${apiResults.filter((r) => r.path.includes("ironsight")).length} HTTP 200`,
  );

  const browserScan = await scanBrowserConsole();
  console.log("\n--- Browser console (dashboard /) ---");
  console.log(`Page errors: ${browserScan.pageErrors.length}`);
  console.log(`Console errors: ${browserScan.consoleErrors.length}`);
  console.log(`'apply' runtime hits: ${browserScan.applyHits.length}`);
  if (browserScan.applyHits.length > 0) {
    for (const hit of browserScan.applyHits) console.log(`  APPLY: ${hit}`);
  }
  const simStatuses = browserScan.resilienceStatuses;
  const sim200 = simStatuses.filter((s) => s === 200).length;
  const sim499 = simStatuses.filter((s) => s === 499).length;
  console.log(
    `\nIn-browser simulation fetches: ${sim200}×200` +
      (sim499 ? `, ${sim499}×499 (nav abort)` : "") +
      ` (${simStatuses.length} total observed)`,
  );

  const apiStable = apiSummary.ironintel200 === apiSummary.totalIronintel && apiSummary.ironsight200 > 0;
  const noApply = browserScan.applyHits.length === 0;

  console.log("\n=== Verdict ===");
  console.log(`API stable (ironintel 200 stream): ${apiStable ? "PASS" : "FAIL"}`);
  console.log(`Console free of 'apply' error: ${noApply ? "PASS" : "FAIL"}`);

  if (!apiStable || !noApply) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
