import "server-only";

import prisma from "@/lib/prisma";
import {
  INBOUND_LEAD_REPLY_SLA_HOURS,
  INBOUND_SLA_T2_ESCALATE_MINUTES,
  INBOUND_SLA_T3_HOLD_MINUTES,
  INBOUND_SLA_WINDOW_COPY,
  isInboundSlaT1AckEnabled,
  isInboundSlaT3AutosendEnabled,
  resolveWorkflowReviewBookingUrl,
} from "@/config/commercialGates";
import {
  addBusinessMilliseconds,
  businessMillisecondsElapsed,
} from "@/lib/gtm/inboundBusinessHours";
import {
  buildInboundT1AckEmail,
  buildInboundT3HoldEmail,
} from "@/lib/gtm/inboundSlaCopy";
import { DISPATCHED_SALES_DRAFT_TAG } from "@/app/lib/server/approvalQueueCore";
import { notifyOpsChannels } from "@/app/lib/server/notifyOpsEmail";
import { resolveProspectPoolTenantId } from "@/app/lib/server/salesAgentConsoleCore";
import { sendOutboundEmail } from "@/app/lib/server/sendOutboundEmail";

/** Keep in sync with inboundLeadOpsCore (avoid circular import). */
const INBOUND_LEAD_SOURCE_PREFIX = "inbound-lead:";
const INBOUND_LEADS_HREF = "/dashboard/operations/salesteam#inbound-leads";

function inboundLeadSourceRef(slug: string): string {
  return `${INBOUND_LEAD_SOURCE_PREFIX}${slug.trim().toLowerCase()}`;
}

export const SLA_T1_MARKER = "[SLA_T1_ACK]";
export const SLA_T2_MARKER = "[SLA_T2_ESCALATED]";
export const SLA_T3_MARKER = "[SLA_T3_HOLD]";

export { buildInboundT1AckEmail, buildInboundT3HoldEmail };

function notesHasMarker(notes: string | null | undefined, marker: string): boolean {
  return (notes ?? "").includes(marker);
}

async function appendSlaMarker(activityId: string, marker: string): Promise<void> {
  const row = await prisma.opsActivity.findUnique({
    where: { id: activityId },
    select: { notes: true },
  });
  if (!row || notesHasMarker(row.notes, marker)) return;
  const next = `${(row.notes ?? "").trim()} · ${marker} ${new Date().toISOString()}`.trim();
  await prisma.opsActivity.update({
    where: { id: activityId },
    data: { notes: next },
  });
}

export async function hasInboundSalesDispatch(contactId: string): Promise<boolean> {
  const tenantId = resolveProspectPoolTenantId();
  const row = await prisma.ironboardCrmInteraction.findFirst({
    where: {
      tenantId,
      contactId,
      summary: { contains: DISPATCHED_SALES_DRAFT_TAG },
    },
    select: { id: true },
  });
  return Boolean(row);
}

async function resolveProspectContact(email: string): Promise<{
  contactId: string;
  tenantId: string;
} | null> {
  const tenantId = resolveProspectPoolTenantId();
  const contact = await prisma.ironboardCrmContact.findFirst({
    where: { tenantId, email: email.toLowerCase() },
    select: { id: true },
  });
  if (!contact) return null;
  return { contactId: contact.id, tenantId };
}

/**
 * T1 — instant prospect ack (not HITL DISPATCH). Idempotent via OpsActivity notes marker.
 */
export async function sendInboundLeadT1Ack(input: {
  orgName: string;
  slug: string;
  email: string;
  activityId?: string;
}): Promise<{ sent: boolean; skipped: boolean; reason?: string }> {
  if (!isInboundSlaT1AckEnabled()) {
    return { sent: false, skipped: true, reason: "t1_disabled" };
  }

  const sourceRef = inboundLeadSourceRef(input.slug);
  const activity =
    input.activityId != null
      ? await prisma.opsActivity.findUnique({ where: { id: input.activityId } })
      : await prisma.opsActivity.findFirst({ where: { sourceRef } });
  if (!activity) return { sent: false, skipped: true, reason: "no_activity" };
  if (notesHasMarker(activity.notes, SLA_T1_MARKER)) {
    return { sent: false, skipped: true, reason: "already_sent" };
  }

  const resolved = await resolveProspectContact(input.email);
  if (!resolved) return { sent: false, skipped: true, reason: "no_crm_contact" };

  const mail = buildInboundT1AckEmail({
    orgName: input.orgName,
    bookingUrl: resolveWorkflowReviewBookingUrl(),
  });
  const delivery = await sendOutboundEmail({
    to: [input.email],
    subject: mail.subject,
    text: mail.text,
    tenantId: resolved.tenantId,
    contactId: resolved.contactId,
  });
  if (!delivery.success) {
    console.warn("[inbound-sla] T1 ack failed", delivery.error);
    return { sent: false, skipped: false, reason: delivery.error ?? "send_failed" };
  }

  await appendSlaMarker(activity.id, SLA_T1_MARKER);
  return { sent: true, skipped: false };
}

async function sendT2OpsEscalate(input: {
  activityId: string;
  orgName: string;
  email: string;
  slug: string;
  draftHref: string;
}): Promise<boolean> {
  const activity = await prisma.opsActivity.findUnique({
    where: { id: input.activityId },
    select: { notes: true },
  });
  if (!activity || notesHasMarker(activity.notes, SLA_T2_MARKER)) return false;

  await notifyOpsChannels({
    subject: `SLA risk — inbound still open (${input.orgName})`,
    text: [
      `P1 workflow-review lead has had no HITL DISPATCH for ${INBOUND_SLA_T2_ESCALATE_MINUTES} Central business minutes.`,
      `SLA breach in ~${INBOUND_SLA_T3_HOLD_MINUTES - INBOUND_SLA_T2_ESCALATE_MINUTES} business minutes.`,
      "",
      `Company: ${input.orgName}`,
      `Email: ${input.email}`,
      `Slug: ${input.slug}`,
      `Window: ${INBOUND_SLA_WINDOW_COPY}`,
      "",
      `Open draft: https://ironframegrc.com${input.draftHref}`,
      "Action: Approve & dispatch SALES now.",
    ].join("\n"),
  });
  await appendSlaMarker(input.activityId, SLA_T2_MARKER);
  return true;
}

async function sendT3Hold(input: {
  activityId: string;
  orgName: string;
  email: string;
}): Promise<boolean> {
  if (!isInboundSlaT3AutosendEnabled()) return false;
  const activity = await prisma.opsActivity.findUnique({
    where: { id: input.activityId },
    select: { notes: true },
  });
  if (!activity || notesHasMarker(activity.notes, SLA_T3_MARKER)) return false;

  const resolved = await resolveProspectContact(input.email);
  if (!resolved) return false;

  const mail = buildInboundT3HoldEmail({
    orgName: input.orgName,
    bookingUrl: resolveWorkflowReviewBookingUrl(),
  });
  const delivery = await sendOutboundEmail({
    to: [input.email],
    subject: mail.subject,
    text: mail.text,
    tenantId: resolved.tenantId,
    contactId: resolved.contactId,
  });
  if (!delivery.success) {
    console.warn("[inbound-sla] T3 hold failed", delivery.error);
    return false;
  }

  await appendSlaMarker(input.activityId, SLA_T3_MARKER);
  await notifyOpsChannels({
    subject: `T3 SLA-hold auto-sent — ${input.orgName}`,
    text: [
      `T3 SLA-hold auto-sent to ${input.email}.`,
      "Human review still required before Path B / workspace talk.",
      `Window: ${INBOUND_SLA_WINDOW_COPY}`,
    ].join("\n"),
  });
  return true;
}

export type InboundSlaTickResult = {
  scanned: number;
  t2: number;
  t3: number;
  skippedDispatched: number;
};

/**
 * Cron tick: T2 ops escalate @ 45 business minutes; T3 hold @ 60 (if autosend on).
 * Skips when HITL SALES already DISPATCHed. Off-hours decay is handled by business clock.
 */
export async function processInboundLeadSlaBackupTick(
  now: Date = new Date(),
): Promise<InboundSlaTickResult> {
  const activities = await prisma.opsActivity.findMany({
    where: {
      sourceRef: { startsWith: INBOUND_LEAD_SOURCE_PREFIX },
      status: { notIn: ["DONE", "CANCELLED"] },
      priority: 1,
    },
    take: 80,
    orderBy: { createdAt: "asc" },
  });

  const result: InboundSlaTickResult = {
    scanned: activities.length,
    t2: 0,
    t3: 0,
    skippedDispatched: 0,
  };

  const t2Ms = INBOUND_SLA_T2_ESCALATE_MINUTES * 60_000;
  const t3Ms = INBOUND_SLA_T3_HOLD_MINUTES * 60_000;

  for (const activity of activities) {
    const slug = (activity.sourceRef ?? "").slice(INBOUND_LEAD_SOURCE_PREFIX.length);
    if (!slug) continue;
    const prospect = await prisma.prospect.findUnique({ where: { slug } });
    if (!prospect) continue;

    const resolved = await resolveProspectContact(prospect.email);
    if (resolved && (await hasInboundSalesDispatch(resolved.contactId))) {
      result.skippedDispatched += 1;
      continue;
    }
    if ((activity.notes ?? "").includes("DISPATCHED")) {
      result.skippedDispatched += 1;
      continue;
    }

    const elapsed = businessMillisecondsElapsed(activity.createdAt, now);
    const draftHref = activity.href?.startsWith("/") ? activity.href : INBOUND_LEADS_HREF;

    if (elapsed >= t2Ms && !notesHasMarker(activity.notes, SLA_T2_MARKER)) {
      const ok = await sendT2OpsEscalate({
        activityId: activity.id,
        orgName: prospect.orgName,
        email: prospect.email,
        slug,
        draftHref,
      });
      if (ok) result.t2 += 1;
    }

    if (elapsed >= t3Ms && !notesHasMarker(activity.notes, SLA_T3_MARKER)) {
      const ok = await sendT3Hold({
        activityId: activity.id,
        orgName: prospect.orgName,
        email: prospect.email,
      });
      if (ok) result.t3 += 1;
    }
  }

  return result;
}

/** Business-hour dueAt for a new inbound OpsActivity (1 Central business hour). */
export function inboundLeadSlaDueAt(from: Date = new Date()): Date {
  return addBusinessMilliseconds(from, INBOUND_LEAD_REPLY_SLA_HOURS * 60 * 60 * 1000);
}
