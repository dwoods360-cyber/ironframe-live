import dotenv from "dotenv";

dotenv.config({ path: ".env.staging.local", override: true });
dotenv.config({ path: ".env.local", override: true });
dotenv.config({ path: ".env", override: true });

const base = (
  process.env.IRONQUERY_EXPORT_PROBE_URL?.trim() ||
  process.env.STAGING_SMOKE_BASE_URL?.trim() ||
  "https://ironframe-live-jj1iesgws-dwoods360-6345s-projects.vercel.app"
).replace(/\/$/, "");

const primarySecret = process.env.IRONFRAME_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim();
const fallbackSecret = process.env.STAGING_SMOKE_SECRET?.trim();
const secret = primarySecret || fallbackSecret;
const bypass = process.env.VERCEL_BYPASS_TOKEN?.trim();
const tenantId =
  process.env.IRONQUERY_EXPORT_TENANT_ID?.trim() || "4d1ea1a4-b6a8-4d12-9eb3-2f0a64ad0ef7";
const format = (process.env.IRONQUERY_EXPORT_FORMAT?.trim() || "csv").toLowerCase();

function assertAsciiHeaderValue(name, value) {
  for (let i = 0; i < value.length; i += 1) {
    if (value.charCodeAt(i) > 255) {
      throw new Error(
        `[IRONQUERY_EXPORT_PROBE] ${name} contains non-ASCII at index ${i}. Restore a clean secret in .env.staging.local (pull from Vercel env).`,
      );
    }
  }
}

if (!secret) {
  console.error("[IRONQUERY_EXPORT_PROBE] Missing IRONFRAME_CRON_SECRET / STAGING_SMOKE_SECRET.");
  process.exit(2);
}

assertAsciiHeaderValue("cron secret", secret);

const url = `${base}/api/internal/ironquery/export`;
const headers = {
  Authorization: `Bearer ${secret}`,
  "x-tenant-id": tenantId,
  "Content-Type": "application/json",
};
if (bypass) {
  assertAsciiHeaderValue("VERCEL_BYPASS_TOKEN", bypass);
  headers["x-vercel-protection-bypass"] = bypass;
}

const res = await fetch(url, {
  method: "POST",
  headers,
  body: JSON.stringify({ tenantId, format }),
});

const contentType = res.headers.get("content-type") ?? "";
let text = "";
let pdfMagic = false;
if (format === "pdf") {
  const buf = Buffer.from(await res.arrayBuffer());
  pdfMagic = buf.length >= 4 && buf.subarray(0, 4).toString("ascii") === "%PDF";
  text = `binary:${buf.length}`;
} else {
  text = await res.text();
}
const lines = text.trim().split("\n");
const isCsv = contentType.includes("text/csv");
const isPdf = contentType.includes("application/pdf");
const isHtml = contentType.includes("text/html") || text.startsWith("<!");

const result = {
  base,
  method: "POST",
  tenantId,
  format,
  status: res.status,
  contentType,
  disposition: res.headers.get("content-disposition"),
  isCsv,
  isPdf,
  isHtml,
  pdfMagic,
  ok:
    res.status === 200 &&
    !isHtml &&
    (format === "pdf" ? isPdf && pdfMagic : isCsv),
  header: lines[0] ?? "",
  dataRow: lines[1] ?? "",
  snippet: format === "pdf" ? `(binary ${text.length} bytes)` : text.slice(0, 280),
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
