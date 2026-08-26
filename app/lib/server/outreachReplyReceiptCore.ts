import "server-only";

import prisma from "@/lib/prisma";
import {
  isOutreachReplyAlertEnabled,
  isOutreachReplyReceiptEnabled,
  resolveWorkflowReviewBookingUrl,
} from "@/config/commercialGates";
import {
  OUTREACH_REPLY_SOURCE_PREFIX,
  buildOutreachReplySourceRef,
  extractEmailAddress,
  type OutreachReplyIntakeSource,
} from "@/lib/gtm/outreachReplyIds";
import { buildOutreachReplyReceiptEmail } from "@/lib/gtm/outreachReplyReceiptCopy";
import { notifyOpsChannels } from "@/app/lib/server/notifyOpsEmail";
import { upsertOpsActivity } from "@/app/lib/server/opsScheduleCore";
import { resolveProspectPoolTenantId } from "@/app/lib/server/salesAgentConsoleCore";
import { sendOutboundEmail } from "@/app/lib/server/sendOutboundEmail";

export { OUTREACH_REPLY_SOURCE_PREFIX, buildOutreachReplySourceRef };
export type { OutreachReplyIntakeSource };

export const OUTREACH_REPLY_ACK_MARKER = "[OUTREACH_REPLY_ACK]";
export const OUTREACH_REPLY_ALERT_MARKER = "[OUTREACH_REPLY_ALERT]";

export type ProcessOutreachReplyInput = {
  fromEmail: string;
  subject?: string | null;
  messageId?: string | null;
  companyHint?: string | null;
  firstNameHint?: string | null;
  source: OutreachReplyIntakeSource;
};

export type ProcessOutreachReplyResult = {
  ok: boolean;
  skipped: boolean;
  reason?: string;
  sourceRef: string;
  receiptSent: boolean;
  alertSent: boolean;
  contactId: string | null;
};

function notesHasMarker(notes: string | null | undefined, marker: string): boolean {
  return (notes ?? "").includes(marker);
}

async function appendMarker(activityId: string, marker: string): Promise<void> {
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

async function resolveCrmContact(email: string): Promise<{
  contactId: string;
  tenantId: string;
  name: string | null;
  company: string | null;
} | null> {
  const tenantId = resolveProspectPoolTenantId();
  const contact = await prisma.ironboardCrmContact.findFirst({
    where: { tenantId, email },
    select: { id: true, fullName: true, company: true },
  });
  if (!contact) return null;
  return {
    contactId: contact.id,
    tenantId,
    name: contact.fullName,
    company: contact.company,
  };
}

function firstNameFromContact(name: string | null, hint?: string | null): string | null {
  if (hint?.trim()) return hint.trim().split(/\s+/)[0] ?? null;
  if (!name?.trim()) return null;
  return name.trim().split(/\s+/)[0] ?? null;
}

export async function processOutreachReplyReceipt(
  input: ProcessOutreachReplyInput,
): Promise<ProcessOutreachReplyResult> {
  const fromEmail = extractEmailAddress(input.fromEmail);
  if (!fromEmail.includes("@") || fromEmail.endsWith("@ironframegrc.com")) {
    return {
      ok: false,
      skipped: true,
      reason: "invalid_or_internal_from",
      sourceRef: "",
      receiptSent: false,
      alertSent: false,
      contactId: null,
    };
  }

  const sourceRef = buildOutreachReplySourceRef({
    fromEmail,
    messageId: input.messageId,
    source: input.source,
  });

  const existing = await prisma.opsActivity.findFirst({
    where: { sourceRef },
    select: { id: true, notes: true },
  });

  const crm = await resolveCrmContact(fromEmail);
  const company = input.companyHint?.trim() || crm?.company || null;
  const firstName = firstNameFromContact(crm?.name ?? null, input.firstNameHint);

  const activity =
    existing ??
    (await upsertOpsActivity({
      title: `Outreach reply — ${company || fromEmail}`,
      kind: "OPS_GENERAL",
      status: "IN_PROGRESS",
      dueAt: new Date(),
      ownerLabel: "Founder",
      sourceRef,
      priority: 1,
      href: "/dashboard/admin/approvals?kind=SALES",
      synopsis: [
        `Prospect replied to Path B outreach (${input.source}).`,
        `From: ${fromEmail}`,
        input.subject ? `Subject: ${input.subject}` : null,
        "Action: HITL YES/SOFT/PRICE paste same business day — receipt is not the scheduling reply.",
      ]
        .filter(Boolean)
        .join(" "),
      nextActions: [
        "Paste locked YES/SOFT/PRICE reply (outreachReplyCopy) and DISPATCH",
        "Host workflow review if they book / confirm slots",
      ],
    }));

  const activityId = activity.id;
  const notes = existing?.notes ?? activity.notes ?? "";

  let receiptSent = false;
  if (
    isOutreachReplyReceiptEnabled() &&
    crm &&
    !notesHasMarker(notes, OUTREACH_REPLY_ACK_MARKER)
  ) {
    const mail = buildOutreachReplyReceiptEmail({
      firstName,
      company,
      bookingUrl: resolveWorkflowReviewBookingUrl(),
    });
    const delivery = await sendOutboundEmail({
      to: [fromEmail],
      subject: mail.subject,
      text: mail.text,
      tenantId: crm.tenantId,
      contactId: crm.contactId,
    });
    if (delivery.success) {
      await appendMarker(activityId, OUTREACH_REPLY_ACK_MARKER);
      receiptSent = true;
    } else {
      console.warn("[outreach-reply] receipt failed", delivery.error);
    }
  } else if (!crm) {
    console.warn("[outreach-reply] no CRM contact — receipt skipped", fromEmail);
  }

  let alertSent = false;
  const notesAfterAck = (
    await prisma.opsActivity.findUnique({
      where: { id: activityId },
      select: { notes: true },
    })
  )?.notes;

  if (
    isOutreachReplyAlertEnabled() &&
    !notesHasMarker(notesAfterAck, OUTREACH_REPLY_ALERT_MARKER)
  ) {
    const delivery = await notifyOpsChannels({
      subject: `P1 outreach reply — ${company || fromEmail}`,
      text: [
        "Prospect replied to Path B cold outreach.",
        "",
        `From: ${fromEmail}`,
        company ? `Company: ${company}` : null,
        input.subject ? `Subject: ${input.subject}` : null,
        `Intake: ${input.source}`,
        `Receipt auto-sent: ${receiptSent ? "yes" : "no (HITL still required)"}`,
        "",
        "Action: open Approvals → paste YES/SOFT/PRICE → DISPATCH same business day.",
        "Open: https://ironframegrc.com/dashboard/admin/approvals?kind=SALES",
        "",
        "Audible: Ops Hub plays a chime when this alert is new (tab open).",
      ]
        .filter(Boolean)
        .join("\n"),
    });
    alertSent = delivery.emailOk === true || delivery.endpointsOk > 0;
    if (alertSent || delivery.emailOk === null) {
      await appendMarker(activityId, OUTREACH_REPLY_ALERT_MARKER);
      alertSent = true;
    }
  }

  return {
    ok: true,
    skipped: Boolean(existing) && !receiptSent && !alertSent,
    reason: existing ? "idempotent_existing" : undefined,
    sourceRef,
    receiptSent,
    alertSent,
    contactId: crm?.contactId ?? null,
  };
}

export async function listRecentOutreachReplyAlerts(sinceMs = 15 * 60 * 1000): Promise<
  Array<{
    id: string;
    title: string;
    sourceRef: string | null;
    createdAt: string;
  }>
> {
  const since = new Date(Date.now() - sinceMs);
  const rows = await prisma.opsActivity.findMany({
    where: {
      sourceRef: { startsWith: OUTREACH_REPLY_SOURCE_PREFIX },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, title: true, sourceRef: true, createdAt: true },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    sourceRef: r.sourceRef,
    createdAt: r.createdAt.toISOString(),
  }));
}
