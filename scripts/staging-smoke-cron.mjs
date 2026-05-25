import dotenv from "dotenv";

dotenv.config({ path: ".env.staging.local" });
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const base = (process.env.STAGING_SMOKE_BASE_URL || process.env.STAGING_BASE_URL || "https://ironframe-live.vercel.app").replace(/\/+$/, "");
const primarySecret = process.env.IRONFRAME_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim();
const fallbackSecret = process.env.STAGING_SMOKE_SECRET?.trim();
const secret = primarySecret || fallbackSecret;

if (!primarySecret && fallbackSecret) {
  console.log("[info] Using local STAGING_SMOKE_SECRET token context");
}

if (!secret) {
  console.error("[SMOKE] Missing IRONFRAME_CRON_SECRET / CRON_SECRET in environment.");
  process.exit(2);
}

const tests = [
  { id: "health_get_valid_bearer", method: "GET", path: "/api/internal/cron/health-posture-triage", headers: { Authorization: `Bearer ${secret}` }, expect: 200 },
  { id: "health_get_invalid_bearer", method: "GET", path: "/api/internal/cron/health-posture-triage", headers: { Authorization: "Bearer bad-token" }, expect: 401 },
  {
    id: "health_post_valid_x_cron",
    method: "POST",
    path: "/api/internal/cron/health-posture-triage",
    headers: { "x-cron-secret": secret, "Content-Type": "application/json" },
    body: JSON.stringify({
      tenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
      threadId: "smoke-health",
      currentHealthBarPercent: 42,
    }),
    expect: 200,
  },
  { id: "gridcore_get_valid", method: "GET", path: "/api/internal/cron/gridcore-rate-poll?force=1&utility=1", headers: { Authorization: `Bearer ${secret}` }, expect: 200 },
  { id: "gridcore_get_invalid", method: "GET", path: "/api/internal/cron/gridcore-rate-poll?force=1&utility=1", headers: { Authorization: "Bearer bad-token" }, expect: 401 },
  { id: "carbon_get_valid", method: "GET", path: "/api/internal/cron/carbon-budget-reallocation?force=1", headers: { Authorization: `Bearer ${secret}` }, expect: 200 },
  { id: "carbon_get_invalid", method: "GET", path: "/api/internal/cron/carbon-budget-reallocation?force=1", headers: { Authorization: "Bearer bad-token" }, expect: 401 },
];

for (const p of [
  "/api/internal/cron/industry-scout",
  "/api/internal/cron/ironscribe-daily-audit",
  "/api/internal/cron/ironsight-regulatory-poll",
  "/api/internal/cron/ironwatch-api-heartbeat",
  "/api/internal/cron/ironwatch-security-monitor",
  "/api/internal/cron/sustainability-achievement-report",
  "/api/internal/cron/agent17-sentinel",
]) {
  tests.push({ id: `${p}_get_valid`, method: "GET", path: p, headers: { Authorization: `Bearer ${secret}` }, expect: 200 });
  tests.push({ id: `${p}_get_invalid`, method: "GET", path: p, headers: { Authorization: "Bearer bad-token" }, expect: 401 });
}

const results = [];
for (const t of tests) {
  const url = `${base}${t.path}`;
  try {
    const res = await fetch(url, {
      method: t.method,
      headers: t.headers,
      body: t.body,
    });
    const text = await res.text();
    results.push({
      id: t.id,
      status: res.status,
      expected: t.expect,
      ok: res.status === t.expect,
      snippet: text.slice(0, 200),
      url: t.path,
    });
  } catch (err) {
    results.push({
      id: t.id,
      status: "ERR",
      expected: t.expect,
      ok: false,
      snippet: err instanceof Error ? err.message : String(err),
      url: t.path,
    });
  }
}

const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;
const has405 = results.some((r) => r.status === 405);
const has5xx = results.some((r) => typeof r.status === "number" && r.status >= 500);

console.log(JSON.stringify({
  base,
  total: results.length,
  passed,
  failed,
  has405,
  has5xx,
  freezeGateGreen: failed === 0 && !has405 && !has5xx,
  results,
}, null, 2));

process.exit(failed === 0 ? 0 : 1);
