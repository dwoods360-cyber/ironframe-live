"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { ThreatState } from "@prisma/client";
import { sendEscalationEmail } from "@/app/actions/email";

export type PhoneHomeDiagnosticPacket = {
  threatId: string;
  threat: {
    id: string;
    title: string;
    status: string;
    sourceAgent: string;
    score: number;
    targetEntity: string;
  } | null;
  /** Up to three failed attempts captured in AgentOperation.snapshot */
  failedAttempts: Array<{ attempt: number; error: string; at?: string }>;
  agentOperations: Array<{
    id: string;
    agentName: string;
    status: string;
    attemptCount: number;
    lastError: string | null;
  }>;
};

/**
 * Escalation hook: package threat + failed retry snapshot for external triage (Phone Home).
 */
export async function commitPhoneHome(threatId: string): Promise<PhoneHomeDiagnosticPacket> {
  const id = threatId?.trim();
  const packet: PhoneHomeDiagnosticPacket = {
    threatId: id,
    threat: null,
    failedAttempts: [],
    agentOperations: [],
  };

  if (!id) {
    console.warn("[IRONTECH] CRITICAL: Phone Home committed for invalid threat id.");
    return packet;
  }

  const [threat, ops] = await Promise.all([
    prisma.threatEvent.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        status: true,
        sourceAgent: true,
        score: true,
        targetEntity: true,
      },
    }),
    prisma.agentOperation.findMany({
      where: { threatId: id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        agentName: true,
        status: true,
        attemptCount: true,
        lastError: true,
        snapshot: true,
      },
    }),
  ]);

  if (threat) {
    packet.threat = {
      id: threat.id,
      title: threat.title,
      status: String(threat.status),
      sourceAgent: threat.sourceAgent,
      score: threat.score,
      targetEntity: threat.targetEntity,
    };
  }

  packet.agentOperations = ops.map((o) => ({
    id: o.id,
    agentName: o.agentName,
    status: String(o.status),
    attemptCount: o.attemptCount,
    lastError: o.lastError,
  }));

  for (const o of ops) {
    const snap = o.snapshot as Prisma.JsonObject | null;
    const failures = snap?.failures;
    if (Array.isArray(failures)) {
      for (const row of failures) {
        if (row && typeof row === "object") {
          const r = row as Record<string, unknown>;
          packet.failedAttempts.push({
            attempt: typeof r.attempt === "number" ? r.attempt : packet.failedAttempts.length + 1,
            error: typeof r.error === "string" ? r.error : String(r.error ?? ""),
            at: typeof r.at === "string" ? r.at : undefined,
          });
        }
      }
    }
  }
  packet.failedAttempts = packet.failedAttempts.slice(-3);

  console.error(
    `[IRONTECH] CRITICAL ESCALATION: 3-strike / Phone Home threshold for Threat ${id}. Diagnostic packet committed to logs.`,
  );
  console.warn(
    `[IRONTECH] Phone Home diagnostic packet (Threat ${id}):`,
    JSON.stringify(packet, null, 2),
  );

  return packet;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Ironcast: email the diagnostic packet to the configured admin after FAILED (3rd failure).
 * Target: `SystemConfig.admin_alert_email`, then `process.env.ADMIN_EMAIL`.
 */
export async function sendPhoneHomeEmail(
  threatId: string,
  agentOperationId: string,
): Promise<
  | { success: true; to: string; messageId?: string }
  | { success: false; error: string; to?: string }
> {
  const tid = threatId?.trim();
  const opId = agentOperationId?.trim();
  if (!tid || !opId) {
    return { success: false, error: "Missing threatId or agentOperationId." };
  }

  const op = await prisma.agentOperation.findFirst({
    where: { id: opId, threatId: tid },
    select: {
      id: true,
      agentName: true,
      status: true,
      attemptCount: true,
      lastError: true,
      snapshot: true,
      updatedAt: true,
    },
  });
  if (!op) {
    return { success: false, error: "AgentOperation not found for this threat." };
  }

  const packet = await commitPhoneHome(tid);

  const cfg = await prisma.systemConfig.findUnique({
    where: { id: "global" },
    select: { adminAlertEmail: true },
  });
  const fromDb = cfg?.adminAlertEmail?.trim() ?? "";
  const fromEnv = process.env.ADMIN_EMAIL?.trim() ?? "";
  const to = (fromDb || fromEnv).trim();
  if (!to) {
    console.warn("[IRONTECH] Phone Home: no admin_alert_email or ADMIN_EMAIL — email skipped.");
    return { success: false, error: "No escalation email configured" };
  }
  const snapshotJson = JSON.stringify(op.snapshot ?? null, null, 2);
  const packetJson = JSON.stringify(packet, null, 2);

  const subject = `[IRONCAST] Phone Home · Irontech FAILED · ${tid.slice(0, 12)}`;
  const html = `
<div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto; color: #0f172a;">
  <div style="background-color: #7f1d1d; color: #fff; padding: 16px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0; font-size: 18px;">Ironcast · Phone Home</h2>
    <p style="margin: 8px 0 0; font-size: 12px; opacity: 0.9;">Autonomous recovery exhausted — human intervention required.</p>
  </div>
  <div style="padding: 16px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; background: #fff;">
    <p style="margin: 0 0 12px;"><strong>Threat ID:</strong> ${escapeHtml(tid)}</p>
    <p style="margin: 0 0 12px;"><strong>Agent operation ID:</strong> ${escapeHtml(op.id)}</p>
    <p style="margin: 0 0 12px;"><strong>Agent:</strong> ${escapeHtml(op.agentName)} · <strong>Status:</strong> ${escapeHtml(String(op.status))} · <strong>Attempts:</strong> ${op.attemptCount}</p>
    <p style="margin: 0 0 8px;"><strong>Last error</strong></p>
    <pre style="white-space: pre-wrap; font-size: 12px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">${escapeHtml(op.lastError ?? "(none)")}</pre>
    <p style="margin: 16px 0 8px;"><strong>Aggregated diagnostic packet</strong></p>
    <pre style="white-space: pre-wrap; font-size: 11px; background: #f1f5f9; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; max-height: 320px; overflow: auto;">${escapeHtml(packetJson.slice(0, 48_000))}</pre>
    <p style="margin: 16px 0 8px;"><strong>Primary operation snapshot (full JSON)</strong></p>
    <pre style="white-space: pre-wrap; font-size: 11px; background: #f1f5f9; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; max-height: 280px; overflow: auto;">${escapeHtml(snapshotJson.slice(0, 48_000))}</pre>
    <p style="margin-top: 16px; font-size: 11px; color: #64748b;">— Ironframe Irontech / Ironcast</p>
  </div>
</div>`;

  const result = await sendEscalationEmail(to, subject, html);
  if (result.success) {
    return { success: true, to, messageId: result.messageId };
  }
  return { success: false, error: result.error ?? "Send failed", to };
}

/**
 * Sprint 6.9: after manual Attempt 4 fails — URGENT email to remote tech + queue threat for specialist.
 * Idempotent: if already PENDING_REMOTE_INTERVENTION, skips duplicate email.
 */
export async function dispatchRemoteSupportAction(
  threatId: string,
): Promise<
  | { success: true; to: string; messageId?: string; skipped?: boolean }
  | { success: false; error: string }
> {
  const tid = threatId?.trim();
  if (!tid) {
    return { success: false, error: "Missing threat id." };
  }

  const threat = await prisma.threatEvent.findUnique({
    where: { id: tid },
    select: {
      id: true,
      title: true,
      status: true,
      sourceAgent: true,
      score: true,
      targetEntity: true,
      isRemoteAccessAuthorized: true,
    },
  });
  if (!threat) {
    return { success: false, error: "Threat not found." };
  }

  if (threat.status === ThreatState.PENDING_REMOTE_INTERVENTION) {
    return { success: true, to: "(already queued)", skipped: true };
  }

  const ops = await prisma.agentOperation.findMany({
    where: { threatId: tid },
    orderBy: { updatedAt: "asc" },
    select: {
      id: true,
      agentName: true,
      status: true,
      attemptCount: true,
      lastError: true,
      snapshot: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const cfg = await prisma.systemConfig.findUnique({
    where: { id: "global" },
    select: { adminAlertEmail: true },
  });
  const fromDb = cfg?.adminAlertEmail?.trim() ?? "";
  const fromEnvAdmin = process.env.ADMIN_EMAIL?.trim() ?? "";
  const techEnv = process.env.REMOTE_TECH_DISPATCH_EMAIL?.trim() ?? "";
  const to = (techEnv || fromDb || fromEnvAdmin).trim();
  if (!to) {
    console.warn("[REMOTE DISPATCH] No REMOTE_TECH_DISPATCH_EMAIL, admin_alert_email, or ADMIN_EMAIL.");
    return { success: false, error: "No remote tech dispatch email configured." };
  }

  const techId = process.env.REMOTE_TECH_DISPATCH_ID?.trim() || "FIELD-RSV-01";
  const historyJson = JSON.stringify(
    ops.map((o) => ({
      id: o.id,
      agentName: o.agentName,
      status: o.status,
      attemptCount: o.attemptCount,
      lastError: o.lastError,
      snapshot: o.snapshot,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    })),
    null,
    2,
  );

  const subject = `[URGENT DISPATCH] Remote Tech · Manual fix exhausted · ${tid.slice(0, 12)}`;
  const html = `
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #0f172a;">
  <div style="background-color: #7c2d12; color: #fff; padding: 16px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0; font-size: 18px;">URGENT — Remote specialist dispatch</h2>
    <p style="margin: 8px 0 0; font-size: 12px; opacity: 0.95;">Internal remediation (incl. Attempt 4) exhausted. Full AgentOperation history attached below.</p>
  </div>
  <div style="padding: 16px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; background: #fff;">
    <p style="margin: 0 0 8px;"><strong>Threat ID:</strong> ${escapeHtml(tid)}</p>
    <p style="margin: 0 0 8px;"><strong>Title:</strong> ${escapeHtml(threat.title)}</p>
    <p style="margin: 0 0 8px;"><strong>Assigned specialist ref:</strong> ${escapeHtml(techId)}</p>
    <p style="margin: 0 0 8px;"><strong>Remote access pre-authorized in-app:</strong> ${threat.isRemoteAccessAuthorized ? "yes" : "no — pending operator"}</p>
    <p style="margin: 16px 0 8px; font-size: 12px;"><strong>Full AgentOperation history + snapshots (JSON)</strong></p>
    <pre style="white-space: pre-wrap; font-size: 10px; background: #f1f5f9; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; max-height: 480px; overflow: auto;">${escapeHtml(historyJson.slice(0, 120_000))}</pre>
    <p style="margin-top: 16px; font-size: 11px; color: #64748b;">— Ironframe Remote Tech Protocol / Ironcast</p>
  </div>
</div>`;

  const sent = await sendEscalationEmail(to, subject, html);
  if (!sent.success) {
    return { success: false, error: sent.error ?? "Email send failed" };
  }

  await prisma.threatEvent.update({
    where: { id: tid },
    data: {
      status: ThreatState.PENDING_REMOTE_INTERVENTION,
      remoteTechId: techId,
    },
  });

  console.log(`> [SYSTEM] Internal remediation exhausted. Remote Specialist ${techId} dispatched.`);
  console.log(`> [GRC] Remote Access Authorization Pending user signature...`);

  revalidatePath("/");
  return { success: true, to, messageId: sent.messageId };
}
