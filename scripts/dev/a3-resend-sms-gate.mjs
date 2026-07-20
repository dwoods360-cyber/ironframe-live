/**
 * A3 gate: Resend domain OK for invite/sales From; SMS provider keys present if DISPATCH planned.
 * Does not send email or SMS. Never prints secret values.
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

function mask(v) {
  if (!v) return "MISSING";
  if (v.length <= 8) return `set(len=${v.length})`;
  return `${v.slice(0, 4)}…set(len=${v.length})`;
}

function domainOfEmail(email) {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  return email.slice(at + 1).toLowerCase();
}

const env = { ...process.env, ...loadEnvLocal() };
const failures = [];
const notes = [];

console.log("=== A3 Resend + SMS gate ===");

const resendKey = (env.RESEND_API_KEY || "").trim();
const inviteFrom = (env.WORKSPACE_INVITE_FROM_EMAIL || "").trim();
const ironcastFrom = (env.IRONCAST_FROM_EMAIL || "").trim();
const salesFrom = (env.SALES_FROM_EMAIL || env.SALESTEAM_FROM_EMAIL || "").trim();
const fromName = (env.IRONCAST_FROM_NAME || "").trim();

console.log("RESEND_API_KEY:", mask(resendKey));
console.log("WORKSPACE_INVITE_FROM_EMAIL:", inviteFrom || "MISSING");
console.log("IRONCAST_FROM_EMAIL:", ironcastFrom || "(unset — invite From used as fallback)");
console.log("SALES_FROM_EMAIL:", salesFrom || "(unset — invite/ironcast From used)");
console.log("IRONCAST_FROM_NAME:", fromName || "(unset)");

if (!resendKey) failures.push("RESEND_API_KEY missing");
if (!inviteFrom) failures.push("WORKSPACE_INVITE_FROM_EMAIL missing");

const fromEmails = [inviteFrom, ironcastFrom, salesFrom].filter(Boolean);
const neededDomains = [
  ...new Set(fromEmails.map(domainOfEmail).filter(Boolean)),
];

let domainsOk = false;
if (resendKey) {
  const res = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${resendKey}` },
  });
  if (!res.ok) {
    const body = await res.text();
    failures.push(`Resend domains API HTTP ${res.status}: ${body.slice(0, 120)}`);
  } else {
    const json = await res.json();
    const domains = Array.isArray(json.data) ? json.data : [];
    console.log("RESEND_DOMAINS:");
    const verifiedStatuses = new Set(["verified", "already_verified"]);
    for (const d of domains) {
      // List endpoint can lag; prefer GET /domains/:id for authoritative status.
      let status = d.status;
      if (d.id && !verifiedStatuses.has(String(status || "").toLowerCase())) {
        const detailRes = await fetch(
          `https://api.resend.com/domains/${d.id}`,
          { headers: { Authorization: `Bearer ${resendKey}` } },
        );
        if (detailRes.ok) {
          const detail = await detailRes.json();
          status = detail.status || status;
        }
      }
      d._resolvedStatus = status;
      console.log(
        `  - ${d.name} status=${status} region=${d.region || "?"} id=${d.id || "?"}`,
      );
    }
    for (const needed of neededDomains) {
      const match = domains.find(
        (d) => d.name?.toLowerCase() === needed.toLowerCase(),
      );
      if (!match) {
        failures.push(`Domain ${needed} not found in Resend account`);
      } else if (
        !verifiedStatuses.has(
          String(match._resolvedStatus || match.status || "").toLowerCase(),
        )
      ) {
        failures.push(
          `Domain ${needed} status=${match._resolvedStatus || match.status} (need verified)`,
        );
      } else {
        notes.push(`Domain ${needed} verified`);
      }
    }
    domainsOk =
      neededDomains.length > 0 &&
      neededDomains.every((needed) =>
        domains.some(
          (d) =>
            d.name?.toLowerCase() === needed &&
            verifiedStatuses.has(
              String(d._resolvedStatus || d.status || "").toLowerCase(),
            ),
        ),
      );
  }
}

const smsProvider = (env.SMS_PROVIDER || "").trim().toLowerCase() || "(auto)";
const textbeltKey = (env.TEXTBELT_API_KEY || "").trim();
const textbeltSender = (env.TEXTBELT_SENDER || "").trim();
const twilioSid = (env.TWILIO_ACCOUNT_SID || "").trim();
const twilioToken = (env.TWILIO_AUTH_TOKEN || "").trim();
const twilioFrom = (
  env.TWILIO_SMS_FROM_NUMBER ||
  env.SALESTEAM_SMS_FROM ||
  ""
).trim();

console.log("SMS_PROVIDER:", smsProvider);
console.log("TEXTBELT_API_KEY:", mask(textbeltKey));
console.log("TEXTBELT_SENDER:", textbeltSender || "(default Ironframe)");
console.log("TWILIO_ACCOUNT_SID:", mask(twilioSid));
console.log("TWILIO_AUTH_TOKEN:", mask(twilioToken));
console.log("TWILIO_SMS_FROM / SALESTEAM_SMS_FROM:", twilioFrom || "MISSING");

let smsOk = false;
const wantsTextbelt =
  smsProvider === "textbelt" || (!smsProvider.startsWith("twilio") && !!textbeltKey);

if (wantsTextbelt) {
  if (!textbeltKey) {
    failures.push("SMS_PROVIDER=textbelt but TEXTBELT_API_KEY missing");
  } else if (textbeltKey === "textbelt") {
    notes.push(
      "TEXTBELT_API_KEY is free smoke key (1 SMS/day) — OK for dry-run, weak for partner batch",
    );
    smsOk = true;
  } else {
    // Textbelt quota check — does not send SMS
    try {
      const q = await fetch(
        `https://textbelt.com/quota/${encodeURIComponent(textbeltKey)}`,
      );
      const qj = await q.json();
      console.log(
        "TEXTBELT_QUOTA:",
        JSON.stringify({
          success: qj.success,
          quotaRemaining: qj.quotaRemaining,
          error: qj.error || undefined,
        }),
      );
      if (qj.success === false) {
        failures.push(`Textbelt quota check failed: ${qj.error || "unknown"}`);
      } else {
        smsOk = true;
        if (typeof qj.quotaRemaining === "number" && qj.quotaRemaining < 1) {
          notes.push("Textbelt quotaRemaining < 1 — top up before SMS DISPATCH");
        }
      }
    } catch (e) {
      failures.push(`Textbelt quota request error: ${e.message}`);
    }
  }
} else {
  // Twilio path
  if (!twilioSid || !twilioToken) {
    failures.push("Twilio path selected but ACCOUNT_SID / AUTH_TOKEN incomplete");
  } else if (!twilioFrom || !/^\+[1-9]\d{7,14}$/.test(twilioFrom)) {
    failures.push(
      "TWILIO_SMS_FROM_NUMBER / SALESTEAM_SMS_FROM must be Twilio-owned E.164",
    );
  } else {
    smsOk = true;
    notes.push("Twilio credentials shape OK (no live send)");
  }
}

console.log("---");
console.log("RESEND_DOMAIN_OK:", domainsOk ? "yes" : "no");
console.log("SMS_PROVIDER_OK:", smsOk ? "yes" : "no");
for (const n of notes) console.log("NOTE:", n);

if (failures.length) {
  console.log("FAIL:");
  for (const f of failures) console.log(" -", f);
  process.exit(1);
}

console.log(
  "PASS: Resend From domain verified; SMS provider configured for HITL DISPATCH",
);
process.exit(0);
