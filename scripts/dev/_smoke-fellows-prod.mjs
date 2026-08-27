/**
 * Production smoke: fellows apply → missions 01–04 → rubric.
 * Usage: node scripts/dev/_smoke-fellows-prod.mjs
 */
const BASE = process.env.FELLOWS_SMOKE_BASE || "https://fellows.ironframegrc.com";
const stamp = Date.now();
const email = `fellows.smoke.${stamp}@example.com`;

function parseSetCookie(res) {
  const raw = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  if (raw.length) return raw.map((c) => c.split(";")[0]).join("; ");
  const single = res.headers.get("set-cookie");
  return single ? single.split(";")[0] : "";
}

async function req(path, { method = "GET", body, cookie } = {}) {
  const headers = { Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text.slice(0, 200) };
  }
  return { status: res.status, json, cookie: parseSetCookie(res) || cookie || "" };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function passMission(cookie, n, probePath, probeBody, expectStatus) {
  const probe = await req(probePath, { method: "POST", body: probeBody, cookie });
  assert(
    probe.status === expectStatus && probe.json?.receiptToken,
    `M${n} probe expected ${expectStatus}+receipt, got ${probe.status} ${JSON.stringify(probe.json)}`,
  );
  const tel = await req("/api/fellows/missions/telemetry", {
    method: "POST",
    cookie,
    body: { missionNumber: n, receiptToken: probe.json.receiptToken },
  });
  assert(tel.ok !== false && tel.status === 200 && tel.json?.success, `M${n} telemetry failed: ${JSON.stringify(tel.json)}`);
  console.log(`PASS mission ${n} (${tel.json.progress.passedCount}/${tel.json.progress.totalMissions})`);
  return tel.json;
}

async function main() {
  console.log(`Smoke base: ${BASE}`);
  console.log(`Apply as: ${email}`);

  const apply = await req("/api/fellows/apply", {
    method: "POST",
    body: {
      fullName: "Prod Smoke Fellow",
      email,
      linkedInUrl: "https://www.linkedin.com/in/ironframe-smoke-test",
      academicTrack: "MSCSIA_COURSEWORK",
      labFocus: "MULTI_TENANT_EVIDENCE",
      employerType: "NON_COMMERCIAL_STUDENT",
      requestArchitectureBrief: false,
    },
  });
  assert(apply.status === 200 && apply.json?.success, `apply failed: ${apply.status} ${JSON.stringify(apply.json)}`);
  assert(apply.cookie.includes("ironframe_fellow_session"), "missing fellow session cookie");
  const cookie = apply.cookie;
  console.log("PASS apply + session cookie");

  const me = await req("/api/fellows/me", { cookie });
  assert(me.status === 200 && me.json?.fellowId, `me failed: ${me.status} ${JSON.stringify(me.json)}`);
  console.log(`PASS me (${me.json.fullName})`);

  await passMission(
    cookie,
    1,
    "/api/fellows/sandbox/exposure-stress",
    {
      sleMinCents: 250_000_00,
      sleMaxCents: 1_200_000_00,
      aroMinMilli: 250,
      aroMaxMilli: 1000,
    },
    200,
  );

  await passMission(
    cookie,
    2,
    "/api/fellows/sandbox/untrusted-ingest",
    {
      action: "promote_to_executive_pack",
      artifactId: "vendor-q-unverified-001",
    },
    422,
  );

  await passMission(
    cookie,
    3,
    "/api/fellows/sandbox/cross-tenant-probe",
    {
      sourceTenantId: "mssp-client-001",
      targetTenantId: "mssp-client-002",
    },
    403,
  );

  await passMission(
    cookie,
    4,
    "/api/fellows/sandbox/lineage-export",
    { format: "JSON" },
    200,
  );

  const rubric = await req("/api/fellows/rubric", {
    method: "POST",
    cookie,
    body: {
      quantitativeScore: 4,
      lineageScore: 4,
      isolationScore: 5,
      velocityScore: 4,
      mathFrictionNotes: "Whole-cent bounds were clear; float contrast helped teaching.",
      academicUseDescription: "Capstone appendix evidence for isolation and estimated exposure.",
      workplaceFrictionJson: ["Shared-stack tenancy / soft tags"],
      requestBriefing: false,
    },
  });
  assert(
    rubric.status === 200 && rubric.json?.completionBadgeHash,
    `rubric failed: ${rubric.status} ${JSON.stringify(rubric.json)}`,
  );
  console.log(`PASS rubric hash=${String(rubric.json.completionBadgeHash).slice(0, 16)}…`);
  console.log("SMOKE OK");
}

main().catch((err) => {
  console.error("SMOKE FAIL:", err.message);
  process.exit(1);
});
