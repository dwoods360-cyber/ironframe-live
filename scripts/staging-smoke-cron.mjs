import dotenv from "dotenv";

/** Shell/CI values captured before dotenv (override:true would clobber them). */
const cliStagingBaseUrl = process.env.STAGING_SMOKE_BASE_URL?.trim();
const cliVercelBypass = process.env.VERCEL_BYPASS_TOKEN?.trim();
const cliIronframeCronSecret = process.env.IRONFRAME_CRON_SECRET?.trim();
const cliCronSecret = process.env.CRON_SECRET?.trim();
const cliStagingSmokeSecret = process.env.STAGING_SMOKE_SECRET?.trim();

const dotenvStaging = dotenv.config({ path: ".env.staging.local", override: true });
dotenv.config({ path: ".env.local", override: true });
dotenv.config({ path: ".env", override: true });

const dotenvParsed = dotenvStaging.parsed ?? {};

// Ensure CLI/Shell parameters explicitly override values specified inside .env files
const targetBaseUrl = (
  cliStagingBaseUrl ||
  dotenvParsed.STAGING_SMOKE_BASE_URL?.trim() ||
  process.env.STAGING_SMOKE_BASE_URL?.trim() ||
  "https://ironframe-live-jva8xzoti-dwoods360-6345s-projects.vercel.app"
).replace(/\/$/, "");

const base = targetBaseUrl;
const vercelBypassToken = cliVercelBypass || process.env.VERCEL_BYPASS_TOKEN?.trim();
const primarySecret =
  cliIronframeCronSecret ||
  cliCronSecret ||
  cliStagingSmokeSecret ||
  process.env.IRONFRAME_CRON_SECRET?.trim() ||
  process.env.CRON_SECRET?.trim();
const fallbackSecret = cliStagingSmokeSecret || process.env.STAGING_SMOKE_SECRET?.trim();
const secret = primarySecret || fallbackSecret;
const tokenSource = (cliIronframeCronSecret || process.env.IRONFRAME_CRON_SECRET?.trim())
  ? "IRONFRAME_CRON_SECRET"
  : (cliCronSecret || process.env.CRON_SECRET?.trim())
    ? "CRON_SECRET"
    : (cliStagingSmokeSecret || process.env.STAGING_SMOKE_SECRET?.trim())
      ? "STAGING_SMOKE_SECRET"
      : "NONE";
if (!primarySecret && fallbackSecret) {
  console.log("[info] Using local STAGING_SMOKE_SECRET token context");
}
if (tokenSource !== "NONE") {
  console.log(`[info] Token source: ${tokenSource}`);
}

if (!secret) {
  console.error("[SMOKE] Missing IRONFRAME_CRON_SECRET / CRON_SECRET in environment.");
  process.exit(2);
}

if (!cliStagingBaseUrl && !dotenvParsed.STAGING_SMOKE_BASE_URL?.trim()) {
  console.warn("[SMOKE] STAGING_SMOKE_BASE_URL not set; using script fallback URL.");
}
const tests = [
  { id: "health_get_valid_bearer", method: "GET", path: "/api/internal/cron/health-posture-triage", token: secret, headers: {}, expect: 200 },
  { id: "health_get_invalid_bearer", method: "GET", path: "/api/internal/cron/health-posture-triage", token: "bad-token", headers: {}, expect: 401 },
  {
    id: "health_post_valid_x_cron",
    method: "POST",
    path: "/api/internal/cron/health-posture-triage",
    token: secret,
    headers: { "x-cron-secret": secret, "Content-Type": "application/json" },
    body: JSON.stringify({
      tenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
      threadId: "smoke-health",
      currentHealthBarPercent: 42,
    }),
    expect: 200,
  },
  { id: "gridcore_get_valid", method: "GET", path: "/api/internal/cron/gridcore-rate-poll?force=1&utility=1", token: secret, headers: {}, expect: 200 },
  { id: "gridcore_get_invalid", method: "GET", path: "/api/internal/cron/gridcore-rate-poll?force=1&utility=1", token: "bad-token", headers: {}, expect: 401 },
  { id: "carbon_get_valid", method: "GET", path: "/api/internal/cron/carbon-budget-reallocation?force=1", token: secret, headers: {}, expect: 200 },
  { id: "carbon_get_invalid", method: "GET", path: "/api/internal/cron/carbon-budget-reallocation?force=1", token: "bad-token", headers: {}, expect: 401 },
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
  tests.push({ id: `${p}_get_valid`, method: "GET", path: p, token: secret, headers: {}, expect: 200 });
  tests.push({ id: `${p}_get_invalid`, method: "GET", path: p, token: "bad-token", headers: {}, expect: 401 });
}

const results = [];
for (const t of tests) {
  const url = `${base}${t.path}`;
  try {
    const method = t.method;
    const token = t.token;
    const existingHeaders = t.headers ?? {};
    const res = await fetch(url, {
      method: method,
      headers: {
        ...existingHeaders,
        "Authorization": `Bearer ${token}`,
        "x-vercel-protection-bypass": vercelBypassToken,
      },
      body: t.body,
    });
    const contentType = res.headers.get("content-type") ?? "";
    const text = await res.text();
    const looksLikeHtml =
      contentType.includes("text/html") ||
      text.startsWith("<!DOCTYPE html>") ||
      text.startsWith("<html");
    const statusMatches = res.status === t.expect;
    const ok = statusMatches && !looksLikeHtml;

    results.push({
      id: t.id,
      status: res.status,
      expected: t.expect,
      ok,
      contentType,
      htmlFallback: looksLikeHtml,
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
  tokenSource,
  total: results.length,
  passed,
  failed,
  has405,
  has5xx,
  freezeGateGreen: failed === 0 && !has405 && !has5xx,
  results,
}, null, 2));

process.exit(failed === 0 ? 0 : 1);
