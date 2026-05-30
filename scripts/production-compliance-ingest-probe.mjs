/**
 * Live production compliance ingest smoke (forensic lane + Ironlogic RLS).
 * 1) STAGE_COMPLIANCE_FRAME=1 stage script
 * 2) POST /api/threats/ingest with useForensicGraph
 *
 * Run: node scripts/production-compliance-ingest-probe.mjs
 * Env: STAGING_SMOKE_BASE_URL (default https://ironframe-live.vercel.app)
 *      DATABASE_URL / DIRECT_URL for staging (via .env)
 */
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env.production.local" });
dotenv.config({ path: ".env" });

const base = (
  process.env.STAGING_SMOKE_BASE_URL?.trim() || "https://ironframe-live.vercel.app"
).replace(/\/$/, "");

const THREAT_ID = "cmouerday000357xc47kbd6p7";
const MEDSHIELD_TENANT = "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01";

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

console.log("=== Stage compliance frame ===");
const stage = spawnSync("npx", ["tsx", "scripts/stage-production-ingest-threat.ts"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, STAGE_COMPLIANCE_FRAME: "1" },
});
if (stage.status !== 0) fail("staging script failed");

const body = {
  threatId: THREAT_ID,
  tenantId: MEDSHIELD_TENANT,
  useForensicGraph: true,
  contentTag: "CSRD-2026-COMPLIANCE",
  operatorId: "GRC_BOT",
  sourceAgent: "GRC_BOT",
  payloadContent: "CORPORATE_ENVIRONMENTAL_GOVERNANCE_AUDIT_STREAM",
  justification:
    "Medshield Production Ingress Gate — CSRD Article 4 alignment verification protocol. Structuring automatic PostgreSQL RLS rule assignments for tenant validation checks.",
};

console.log("\n=== POST /api/threats/ingest (forensic compliance) ===");
const res = await fetch(`${base}/api/threats/ingest`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-tenant-id": MEDSHIELD_TENANT,
    "x-shadow-plane-active": "1",
  },
  body: JSON.stringify(body),
});

const text = await res.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  fail(`non-JSON response (${res.status}): ${text.slice(0, 500)}`);
}

if (!res.ok) fail(`HTTP ${res.status}: ${text}`);

const bus = json.orchestrationBus;
if (!bus) fail("missing orchestrationBus in response");
if (bus.lane !== "forensic") fail(`expected lane forensic, got ${bus.lane}`);
if (bus.sanitizationStamp !== true) fail("expected sanitizationStamp true");
if (bus.complianceFrameworkId !== "csrd_esrs") {
  fail(`expected complianceFrameworkId csrd_esrs, got ${bus.complianceFrameworkId}`);
}
const rls = bus.rlsPolicyCount ?? 0;
if (typeof rls !== "number" || rls < 1) {
  fail(`expected rlsPolicyCount >= 1, got ${rls}`);
}

console.log("✅ Production compliance ingest probe passed");
console.log(`   lane=${bus.lane} framework=${bus.complianceFrameworkId} rlsPolicyCount=${rls}`);
