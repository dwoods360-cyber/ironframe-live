/**
 * Diagnose Resend domain records for A3 (no secrets printed).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

const env = { ...process.env, ...loadEnvLocal() };
const key = (env.RESEND_API_KEY || "").trim();
if (!key) {
  console.error("RESEND_API_KEY missing");
  process.exit(2);
}

const list = await fetch("https://api.resend.com/domains", {
  headers: { Authorization: `Bearer ${key}` },
});
const listJson = await list.json();
const domain = (listJson.data || []).find(
  (d) => d.name?.toLowerCase() === "ironframegrc.com",
);
if (!domain) {
  console.error("ironframegrc.com not in Resend account");
  process.exit(1);
}

console.log("domain_id:", domain.id);
console.log("status:", domain.status);

const detail = await fetch(`https://api.resend.com/domains/${domain.id}`, {
  headers: { Authorization: `Bearer ${key}` },
});
const dj = await detail.json();
console.log("detail_status:", dj.status);
console.log("region:", dj.region);
const records = dj.records || [];
for (const r of records) {
  console.log(
    [
      r.record || r.type || "?",
      `name=${r.name || "?"}`,
      `type=${r.type || "?"}`,
      `status=${r.status || "?"}`,
      `ttl=${r.ttl || "?"}`,
      `value=${(r.value || "").slice(0, 80)}${(r.value || "").length > 80 ? "…" : ""}`,
      r.priority != null ? `priority=${r.priority}` : "",
    ]
      .filter(Boolean)
      .join(" | "),
  );
}

// Ask Resend to re-verify
const verify = await fetch(
  `https://api.resend.com/domains/${domain.id}/verify`,
  {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
  },
);
const vj = await verify.json().catch(() => ({}));
console.log("verify_http:", verify.status);
console.log("verify_body:", JSON.stringify(vj).slice(0, 300));
