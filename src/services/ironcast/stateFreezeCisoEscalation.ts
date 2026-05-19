import "server-only";

import { randomUUID } from "crypto";

import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import { logStructuredEvent } from "@/lib/structuredServerLog";
import prisma from "@/lib/prisma";
import { IroncastService } from "@/services/ironcast.service";
import { computeSustainabilityStaleLockdown } from "@/app/config/sustainabilityStaleLockdown";
import { recalculateSystemMaturityScore } from "@/app/services/governanceScoring";

/** Scripted Ironcast / Twilio voice line (constitutional State Freeze). */
export const IRONCAST_STATE_FREEZE_VOICE_MESSAGE =
  "IRONCAST EMERGENCY: Ironframe has entered a State Freeze due to prolonged sustainability API outage. $1.6B baseline is now in Read-Only mode. 3-Key Override required.";

const VOICE_FALLBACK_DELAY_MS = 5 * 60 * 1000;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function dispatchPagerDutyStateFreezeCritical(payload: {
  dedupKey: string;
  degradedSinceIso: string;
}): Promise<boolean> {
  const routingKey = process.env.PAGERDUTY_CONSTITUTIONAL_AUTHORITY_ROUTING_KEY?.trim();
  if (!routingKey) {
    logStructuredEvent(
      "Ironcast",
      "pagerduty_state_freeze_skipped",
      { reason: "PAGERDUTY_CONSTITUTIONAL_AUTHORITY_ROUTING_KEY unset" },
      "warn",
    );
    return false;
  }
  try {
    const res = await fetch("https://events.pagerduty.com/v2/enqueue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routing_key: routingKey,
        event_action: "trigger",
        dedup_key: payload.dedupKey,
        payload: {
          summary: "Ironframe State Freeze — Constitutional Authority (CRITICAL)",
          source: "ironframe-irontech",
          severity: "critical",
          component: "Constitutional Authority",
          group: "ironframe",
          class: "state_freeze",
          custom_details: {
            message: IRONCAST_STATE_FREEZE_VOICE_MESSAGE,
            degradedSinceIso: payload.degradedSinceIso,
          },
        },
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      logStructuredEvent(
        "Ironcast",
        "pagerduty_state_freeze_failed",
        { status: res.status, detail: t.slice(0, 500) },
        "error",
      );
      return false;
    }
    logStructuredEvent("Ironcast", "pagerduty_state_freeze_enqueued", { dedupKey: payload.dedupKey }, "info");
    return true;
  } catch (e) {
    logStructuredEvent(
      "Ironcast",
      "pagerduty_state_freeze_error",
      { detail: e instanceof Error ? e.message : String(e) },
      "error",
    );
    return false;
  }
}

async function dispatchIroncastStateFreezeEmail(adminEmail: string, tenantId: string): Promise<void> {
  try {
    await IroncastService.dispatch({
      tenant_id: tenantId,
      sanitization_status: "VERIFIED_SYSTEM_GENERATED",
      irongate_trace_id: randomUUID(),
      recipient: { email: adminEmail, role: "SYSTEM_ADMIN" },
      notification: {
        priority: "URGENT",
        subject: "CRITICAL — Ironframe State Freeze (Constitutional Authority)",
        body_summary: IRONCAST_STATE_FREEZE_VOICE_MESSAGE,
      },
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
    });
  } catch (e) {
    logStructuredEvent(
      "Ironcast",
      "state_freeze_email_failed",
      { detail: e instanceof Error ? e.message : String(e) },
      "warn",
    );
  }
}

async function dispatchTwilioStateFreezeVoice(toE164: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_VOICE_FROM_NUMBER?.trim();
  if (!sid || !token || !from) {
    logStructuredEvent(
      "Ironcast",
      "twilio_voice_skipped",
      { reason: "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_VOICE_FROM_NUMBER" },
      "warn",
    );
    return false;
  }
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">${escapeXml(
    IRONCAST_STATE_FREEZE_VOICE_MESSAGE,
  )}</Say></Response>`;
  try {
    const body = new URLSearchParams({
      To: toE164,
      From: from,
      Twiml: twiml,
    });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      logStructuredEvent(
        "Ironcast",
        "twilio_voice_failed",
        { status: res.status, detail: t.slice(0, 400) },
        "error",
      );
      return false;
    }
    logStructuredEvent("Ironcast", "twilio_voice_enqueued", { to: toE164.replace(/\d(?=\d{4})/g, "•") }, "info");
    return true;
  } catch (e) {
    logStructuredEvent(
      "Ironcast",
      "twilio_voice_error",
      { detail: e instanceof Error ? e.message : String(e) },
      "error",
    );
    return false;
  }
}

/**
 * Idempotent: first time Irontech hard-freeze is active, record escalation time + Level-1 forensic audit +
 * PagerDuty (Constitutional Authority integration) + Ironcast URGENT email.
 */
export async function ensureStateFreezeCisoEscalation(): Promise<void> {
  const row = await prisma.systemConfig.findUnique({
    where: { id: "global" },
    select: {
      sustainabilityLiveApiDegraded: true,
      sustainabilityApiDegradedSince: true,
      sustainabilityStaleLockdownWaived: true,
      stateFreezeEscalatedAt: true,
      adminAlertEmail: true,
    },
  });
  const lock = computeSustainabilityStaleLockdown(row);
  if (!lock.blockingMutations) return;
  if (row?.stateFreezeEscalatedAt) return;

  const claimed = await prisma.systemConfig.updateMany({
    where: { id: "global", stateFreezeEscalatedAt: null },
    data: { stateFreezeEscalatedAt: new Date() },
  });
  if (claimed.count === 0) return;

  const degradedSinceIso = row?.sustainabilityApiDegradedSince?.toISOString() ?? new Date().toISOString();
  const dedupKey = `ironframe-state-freeze-${degradedSinceIso}`;

  const pdOk = await dispatchPagerDutyStateFreezeCritical({ dedupKey, degradedSinceIso });

  const adminEmail =
    row?.adminAlertEmail?.trim() ||
    process.env.THREAT_CONFIRMATION_RECIPIENTS?.split(",")[0]?.trim() ||
    process.env.IRONCAST_SMOKE_RECIPIENT?.trim();

  const tenant = await prisma.tenant.findFirst({ select: { id: true } });
  const tenantId = tenant?.id ?? "00000000-0000-0000-0000-000000000001";

  if (adminEmail) {
    await dispatchIroncastStateFreezeEmail(adminEmail, tenantId);
  } else {
    logStructuredEvent("Ironcast", "state_freeze_email_skipped", { reason: "no_admin_email" }, "warn");
  }

  try {
    await auditLogCreateLoose({
      data: {
        action: "LEVEL_1_FORENSIC_EVENT",
        justification: JSON.stringify({
          kind: "STATE_FREEZE_IRONCAST_ESCALATION",
          agent: "IRONCAST_AGENT_7",
          severity: "LEVEL_1",
          pagerDutyEnqueued: pdOk,
          dedupKey,
          degradedSinceIso,
          message:
            "Ironcast (Agent 7): Level 1 forensic event — Irontech State Freeze; PagerDuty CRITICAL to Constitutional Authority service (if routing key configured); URGENT Ironcast email to admin path; Twilio voice ladder armed for T+5m if CISO emergency number configured.",
        }),
        operatorId: "IRONCAST_AGENT_7",
        threatId: null,
        isSimulation: false,
      },
    });
  } catch (e) {
    console.error("[Ironcast] Level 1 forensic audit failed", e);
  }
}

/**
 * After {@link VOICE_FALLBACK_DELAY_MS} from escalation, optional Twilio voice to CISO.
 * PagerDuty acknowledgment is not polled in v1; operational assumption: incident remains open until human ack —
 * voice is the statutory follow-up rung (recorded as maturity drift when dispatched).
 */
export async function maybeDispatchStateFreezeCisoVoiceFallback(): Promise<void> {
  const row = await prisma.systemConfig.findUnique({
    where: { id: "global" },
    select: {
      sustainabilityLiveApiDegraded: true,
      sustainabilityApiDegradedSince: true,
      sustainabilityStaleLockdownWaived: true,
      stateFreezeEscalatedAt: true,
      stateFreezeVoiceDispatchedAt: true,
    },
  });
  const lock = computeSustainabilityStaleLockdown(row);
  if (!lock.blockingMutations) return;
  if (!row?.stateFreezeEscalatedAt || row.stateFreezeVoiceDispatchedAt) return;

  const elapsed = Date.now() - row.stateFreezeEscalatedAt.getTime();
  if (elapsed < VOICE_FALLBACK_DELAY_MS) return;

  const to = process.env.IRONCAST_CISO_EMERGENCY_PHONE?.trim();
  if (!to) {
    logStructuredEvent(
      "Ironcast",
      "state_freeze_voice_skipped",
      { reason: "IRONCAST_CISO_EMERGENCY_PHONE unset" },
      "info",
    );
    return;
  }

  const ok = await dispatchTwilioStateFreezeVoice(to);
  if (!ok) return;

  await prisma.systemConfig.update({
    where: { id: "global" },
    data: { stateFreezeVoiceDispatchedAt: new Date() },
  });

  try {
    await auditLogCreateLoose({
      data: {
        action: "LEVEL_1_FORENSIC_EVENT",
        justification: JSON.stringify({
          kind: "STATE_FREEZE_CISO_VOICE_FALLBACK",
          agent: "IRONCAST_AGENT_7",
          severity: "LEVEL_1",
          delayMsApprox: VOICE_FALLBACK_DELAY_MS,
          message:
            "Ironcast (Agent 7): CISO emergency voice ladder — Twilio outbound after statutory delay; records constitutional escalation gap as maturity drift.",
        }),
        operatorId: "IRONCAST_AGENT_7",
        threatId: null,
        isSimulation: false,
      },
    });
  } catch (e) {
    console.error("[Ironcast] voice fallback audit failed", e);
  }

  await recalculateSystemMaturityScore({ trigger: "IRONCAST_STATE_FREEZE_VOICE_FALLBACK" });
}
