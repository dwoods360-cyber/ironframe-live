/**
 * Smoke probe for POST /api/ingestion/endpoint-compliance
 *
 * Run (local):
 *   node scripts/endpoint-compliance-ingest-smoke.mjs
 *
 * Env:
 *   ENDPOINT_SMOKE_BASE_URL   default http://localhost:3000
 *   ENDPOINT_SMOKE_TENANT_UUID  default Medshield dev UUID below
 *   ENDPOINT_SMOKE_SHADOW_PLANE  default 1 (sets x-shadow-plane-active)
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const base = (process.env.ENDPOINT_SMOKE_BASE_URL?.trim() || "http://localhost:3000").replace(
  /\/$/,
  "",
);
const tenantUuid =
  process.env.ENDPOINT_SMOKE_TENANT_UUID?.trim() || "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01";
const shadowPlane = process.env.ENDPOINT_SMOKE_SHADOW_PLANE?.trim() !== "0";
const route = `${base}/api/ingestion/endpoint-compliance`;

let passed = 0;
let failed = 0;

function fail(label, detail) {
  failed += 1;
  console.error(`FAIL  ${label}`);
  if (detail) console.error(`      ${detail}`);
}

function pass(label) {
  passed += 1;
  console.log(`PASS  ${label}`);
}

function headers(extra = {}) {
  return {
    "Content-Type": "application/json",
    "x-tenant-id": tenantUuid,
    ...(shadowPlane ? { "x-shadow-plane-active": "1" } : {}),
    ...extra,
  };
}

async function postCase(label, body, expect) {
  const res = await fetch(route, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    fail(label, `non-JSON ${res.status}: ${text.slice(0, 300)}`);
    return null;
  }

  if (expect.status != null && res.status !== expect.status) {
    fail(label, `expected HTTP ${expect.status}, got ${res.status}: ${text.slice(0, 300)}`);
    return json;
  }
  if (expect.error && json.error !== expect.error) {
    fail(label, `expected error ${expect.error}, got ${json.error}`);
    return json;
  }
  if (expect.idempotentReplay != null && json.idempotentReplay !== expect.idempotentReplay) {
    fail(label, `expected idempotentReplay=${expect.idempotentReplay}, got ${json.idempotentReplay}`);
    return json;
  }
  if (expect.requireId && !json.id) {
    fail(label, "missing response id");
    return json;
  }

  pass(label);
  return json;
}

function loadGoldenFixture() {
  const path = join(repoRoot, "tests/fixtures/endpointComplianceIngress.golden.json");
  const raw = JSON.parse(readFileSync(path, "utf8"));
  raw.tenantId = tenantUuid;
  return raw;
}

console.log(`=== Endpoint compliance ingress smoke ===`);
console.log(`route=${route}`);
console.log(`tenant=${tenantUuid}`);
console.log("");

await postCase(
  "422 VALIDATION_FAILED on decimal financialRisk_cents",
  {
    schemaVersion: "endpoint-compliance-v1",
    tenantId: tenantUuid,
    sourceType: "MDM",
    sourceIntegrationId: "smoke-decimal-probe",
    observedAt: new Date().toISOString(),
    idempotencyKey: "smoke-decimal-probe-key-001",
    endpoint: { hostname: "smoke-host", assetClass: "WORKSTATION" },
    finding: {
      controlIds: ["SOC2-CC6.1"],
      framework: "SOC2",
      state: "NON_COMPLIANT",
      ruleId: "smoke-rule",
      ruleTitle: "Smoke decimal probe",
      severity: "HIGH",
    },
    financialRiskCents: "100.50",
  },
  { status: 422, error: "VALIDATION_FAILED" },
);

const flatKey = `smoke-flat-${Date.now()}`;
await postCase(
  "201 flat MDM profile with title alias",
  {
    remoteTechId: "jamf-smoke-device-001",
    sourceAgent: "JAMF_MDM_PUSH_INTEGRATOR",
    targetEntity: "smoke-workstation-01.corp.example",
    financialRisk_cents: "450000",
    complianceControlIds: ["SOC2_CC6.1"],
    title: "Smoke flat profile title alias",
    telemetryPayload: { isDiskEncrypted: false, probe: "endpoint-compliance-smoke" },
    idempotencyKey: flatKey,
    tenantId: tenantUuid,
  },
  { status: 201, idempotentReplay: false, requireId: true },
);

const canonical = loadGoldenFixture();
const canonicalKey = `smoke-canonical-${Date.now()}`;
canonical.idempotencyKey = canonicalKey;
canonical.observedAt = new Date().toISOString();

const first = await postCase("201 canonical golden fixture", canonical, {
  status: 201,
  idempotentReplay: false,
  requireId: true,
});

if (first?.id) {
  await postCase("200 idempotent replay", canonical, {
    status: 200,
    idempotentReplay: true,
  });
}

console.log("");
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
console.log("Endpoint compliance ingress smoke passed.");
