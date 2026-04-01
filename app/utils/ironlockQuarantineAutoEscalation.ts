import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { logStructuredEvent } from "@/lib/structuredServerLog";
import { ThreatState } from "@prisma/client";
import { IroncastService } from "@/services/ironcast.service";

function parseThreatConfirmationRecipients(): string[] {
  const raw = process.env.THREAT_CONFIRMATION_RECIPIENTS;
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.includes("@"));
}

async function resolveQuarantineNotifyEmails(): Promise<string[]> {
  const fromEnv = parseThreatConfirmationRecipients();
  if (fromEnv.length > 0) return fromEnv;

  const cfg = await prisma.systemConfig.findUnique({
    where: { id: "global" },
    select: { adminAlertEmail: true },
  });
  const admin = cfg?.adminAlertEmail?.trim();
  if (admin && admin.includes("@")) return [admin];

  return [];
}

const QUARANTINE_BODY_SUMMARY =
  "Ironlock has automatically quarantined this threat due to a security protocol breach.";

/**
 * Brain-to-voice: when a threat enters QUARANTINED, notify via Ironcast (Resend + React Email).
 * No-op if already quarantined or no recipients configured.
 */
export async function dispatchIronlockQuarantineAutoEscalation(params: {
  threatId: string;
  tenantUuid: string;
  previousStatus: ThreatState | null;
}): Promise<void> {
  if (params.previousStatus === ThreatState.QUARANTINED) return;

  logStructuredEvent("Ironlock", "auto_escalation_triggered", { threatId: params.threatId });

  const recipients = await resolveQuarantineNotifyEmails();
  if (recipients.length === 0) {
    logStructuredEvent(
      "Ironlock",
      "quarantine_email_skipped",
      { reason: "no_recipients_configured", threatId: params.threatId },
      "warn",
    );
    return;
  }

  const traceId = `ironlock-quarantine-${params.threatId}-${randomUUID()}`;
  const subject = `CRITICAL: Risk ${params.threatId} Quarantined`;

  const tenant = await prisma.tenant.findUnique({
    where: { id: params.tenantUuid },
    select: { slug: true, name: true },
  });
  const displayIdentity = tenant?.name || tenant?.slug || "Unknown Tenant";

  for (const email of recipients) {
    try {
      const result = await IroncastService.dispatch({
        tenant_id: displayIdentity,
        sanitization_status: "VERIFIED_SYSTEM_GENERATED",
        irongate_trace_id: traceId,
        recipient: { email, role: "SYSTEM_ADMIN" },
        notification: {
          priority: "URGENT",
          subject,
          body_summary: QUARANTINE_BODY_SUMMARY,
          risk_id: params.threatId,
        },
        timestamp: BigInt(Date.now()),
      });
      if (!result.success) {
        logStructuredEvent(
          "Ironlock",
          "auto_escalation_provider_failure",
          { threatId: params.threatId, recipient: email },
          "error",
        );
      }
    } catch (err) {
      logStructuredEvent(
        "Ironlock",
        "auto_escalation_dispatch_exception",
        {
          threatId: params.threatId,
          recipient: email,
          detail: err instanceof Error ? err.message : String(err),
        },
        "error",
      );
    }
  }
}
