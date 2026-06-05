/**
 * Epic 17 — Live orchestration shadow smoke.
 *
 * Fires a mock live runtime transaction through the serverless ingest path with an
 * active, non-harnessed sovereign bus cycle, then asserts the concrete observability
 * signature `[epic17-telemetry-stream]` was emitted (mirrored in the HTTP response from
 * the same payload written to Vercel runtime logs).
 *
 * Usage:
 *   node scripts/epic17-orchestration-shadow-smoke.mjs
 *   STAGING_SMOKE_BASE_URL=https://preview.vercel.app node scripts/epic17-orchestration-shadow-smoke.mjs
 *   node scripts/epic17-orchestration-shadow-smoke.mjs --skip-stage
 *
 * Env: STAGING_SMOKE_BASE_URL, VERCEL_BYPASS_TOKEN, DATABASE_URL (for --stage)
 */
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";

const EPIC17_SIGNATURE = "[epic17-telemetry-stream]";
const cliStagingBaseUrl = process.env.STAGING_SMOKE_BASE_URL?.trim();
const cliVercelBypass = process.env.VERCEL_BYPASS_TOKEN?.trim();
const skipStage = process.argv.includes("--skip-stage");

const dotenvStaging = dotenv.config({ path: ".env.staging.local", override: true });
dotenv.config({ path: ".env.local", override: true });
dotenv.config({ path: ".env", override: true });

const stagingBypassToken = dotenvStaging.parsed?.VERCEL_BYPASS_TOKEN?.trim();

const base = (
  cliStagingBaseUrl ||
  process.env.STAGING_SMOKE_BASE_URL?.trim() ||
  "https://ironframe-live.vercel.app"
).replace(/\/$/, "");
const vercelBypass =
  cliVercelBypass || stagingBypassToken || process.env.VERCEL_BYPASS_TOKEN?.trim();

const MEDSHIELD_TENANT = "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01";
const THREAT_ID = "cmouerday000357xc47kbd6p7";

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function buildHeaders() {
  const headers = {
    "Content-Type": "application/json",
    "x-tenant-id": MEDSHIELD_TENANT,
    "x-shadow-plane-active": "1",
  };
  if (vercelBypass) {
    headers["x-vercel-protection-bypass"] = vercelBypass;
  }
  return headers;
}

const sovereignNarrative =
  "CONFIDENTIAL AWS GUARDDUTY: Medshield ingress-bus vulnerability CVE-2026-EPIC17-SMOKE CRITICAL on medshield-prod-ingress-bus. " +
  "Total liability exposure $11,100,000.00. Vendor ID 550e8400-e29b-41d4-a716-446655440000. Exposure factor 0.85.";

if (!skipStage) {
  console.log("=== Stage IDENTIFIED threat (vulnerability frame) ===");
  const stage = spawnSync("npx", ["tsx", "scripts/stage-production-ingest-threat.ts"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env },
  });
  if (stage.status !== 0) fail("stage-production-ingest-threat.ts failed");
}

console.log(`\n=== POST ${base}/api/threats/ingest (sovereign bus, shadow plane) ===`);

const ingestBody = {
  threatId: THREAT_ID,
  tenantId: MEDSHIELD_TENANT,
  operatorId: "GRC_BOT",
  sourceAgent: "GRC_BOT",
  useSovereignBus: true,
  orchestrationLane: "sovereign",
  skipOrchestrationBus: false,
  healthBarPercent: 85,
  justification:
    "Epic 17 orchestration shadow smoke: sovereign workforce bus with telemetry stream observability signature required on ironcast completion.",
  rawData: {
    source: "AWS",
    timestamp: new Date().toISOString(),
    alertId: THREAT_ID,
    affectedAssets: ["medshield-prod-ingress-bus"],
    telemetryType: "VULNERABILITY",
    text: sovereignNarrative,
    payload: {
      details: { cve: "CVE-2026-EPIC17-SMOKE", severity: "CRITICAL" },
      exposureFactor: 0.85,
      assetValueCents: 1110000000,
    },
  },
};

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 180_000);

let res;
try {
  res = await fetch(`${base}/api/threats/ingest`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(ingestBody),
    signal: controller.signal,
  });
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("aborted")) {
    fail("ingest timed out after 180s — sovereign bus may be waiting on GOOGLE_API_KEY / Gemini");
  }
  fail(`fetch failed: ${message}`);
} finally {
  clearTimeout(timeout);
}

const rawText = await res.text();
let json;
try {
  json = JSON.parse(rawText);
} catch {
  fail(`non-JSON response (${res.status}): ${rawText.slice(0, 500)}`);
}

if (!res.ok) {
  fail(`HTTP ${res.status}: ${rawText.slice(0, 800)}`);
}
if (json.success !== true) {
  fail(`ingest success=false: ${JSON.stringify(json)}`);
}

const bus = json.orchestrationBus;
if (!bus) fail("missing orchestrationBus — bus may be disabled (IRONFRAME_INGEST_BUS_DISABLED?)");
if (bus.lane !== "sovereign") {
  fail(`expected sovereign lane, got ${bus.lane ?? "(none)"}`);
}

const stream = bus.epic17TelemetryStream;
if (!stream) {
  fail(
    "missing orchestrationBus.epic17TelemetryStream — ironcast did not record Epic 17 observability (check GOOGLE_API_KEY and sovereign graph completion)",
  );
}
if (stream.signature !== EPIC17_SIGNATURE) {
  fail(`expected signature ${EPIC17_SIGNATURE}, got ${stream.signature}`);
}
if (stream.ok !== true) {
  fail(`epic17 telemetry stream not ok: ${stream.error ?? JSON.stringify(stream)}`);
}

const report = {
  base,
  threatId: THREAT_ID,
  tenantId: MEDSHIELD_TENANT,
  lane: bus.lane,
  status: bus.status,
  currentAgent: bus.assignedQuarantiner ?? bus.currentAgent,
  epic17TelemetryStream: stream,
  observabilityLogLine: `${EPIC17_SIGNATURE} ${JSON.stringify({
    tenantId: stream.tenantId,
    initialized: stream.initialized,
    added: stream.added,
    updated: stream.updated,
    removed: stream.removed,
    unchangedCount: stream.unchangedCount,
  })}`,
  freezeGateGreen: true,
};

console.log(JSON.stringify(report, null, 2));
console.log(
  `\n✅ EPIC 17 SHADOW SMOKE GREEN: sovereign bus completed; runtime observability signature ${EPIC17_SIGNATURE} verified.`,
);
process.exit(0);
