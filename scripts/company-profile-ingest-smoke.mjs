/**
 * Smoke probe for POST /api/ingestion/company-profile
 *
 * Run (local, dev server required):
 *   node scripts/company-profile-ingest-smoke.mjs
 *
 * Env:
 *   COMPANY_PROFILE_SMOKE_BASE_URL   default http://localhost:3000
 *   COMPANY_PROFILE_SMOKE_TENANT_UUID  tenant under test
 *   COMPANY_PROFILE_SMOKE_SHADOW_PLANE  default 1 (sets x-shadow-plane-active)
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const base = (
  process.env.COMPANY_PROFILE_SMOKE_BASE_URL?.trim() || "http://localhost:3000"
).replace(/\/$/, "");
const tenantUuid =
  process.env.COMPANY_PROFILE_SMOKE_TENANT_UUID?.trim() ||
  "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01";
const shadowPlane = process.env.COMPANY_PROFILE_SMOKE_SHADOW_PLANE?.trim() !== "0";
const route = `${base}/api/ingestion/company-profile`;

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
    fail(label, `expected error ${expect.error}, got ${json.error ?? JSON.stringify(json)}`);
    return json;
  }
  if (expect.created != null && json.created !== expect.created) {
    fail(label, `expected created=${expect.created}, got ${json.created}`);
    return json;
  }
  if (expect.requireCompanyId && !json.companyId) {
    fail(label, "missing response companyId");
    return json;
  }

  pass(label);
  return json;
}

function loadGoldenFixture() {
  const path = join(repoRoot, "tests/fixtures/companyProfileIngress.golden.json");
  const raw = JSON.parse(readFileSync(path, "utf8"));
  raw.tenantId = tenantUuid;
  return raw;
}

console.log("=== Company profile ingress smoke ===");
console.log(`route=${route}`);
console.log(`tenant=${tenantUuid}`);
console.log("");

await postCase(
  "422 VALIDATION_FAILED on bad schemaVersion",
  {
    schemaVersion: "company-profile-v0",
    tenantId: tenantUuid,
    companyName: "Smoke Co",
    sector: "Technology",
  },
  { status: 422, error: "VALIDATION_FAILED" },
);

const golden = loadGoldenFixture();
const uniqueSuffix = Date.now();
golden.companyName = `Smoke Holdings ${uniqueSuffix}`;
golden.departments = ["Operations", "Security"];

const created = await postCase("201 primary company bootstrap", golden, {
  status: 201,
  created: true,
  requireCompanyId: true,
});

if (created?.companyId) {
  golden.sector = "Updated Sector";
  await postCase("200 upsert existing primary company", golden, {
    status: 200,
    created: false,
    requireCompanyId: true,
  });
}

console.log("");
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
console.log("Company profile ingress smoke passed.");
