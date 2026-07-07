import "server-only";

import {
  DISPATCHED_DRAFT_TAG,
  PENDING_DRAFT_TAG,
  PENDING_SUPPORT_INTAKE_TAG,
  PURGED_DRAFT_TAG,
  parsePendingDraftSummary,
} from "@/app/lib/server/approvalQueueCore";
import { supportObjectiveLabel } from "@/app/lib/support/supportIntentObjectives";
import type { InTenantSupportObjective } from "@/app/types/inTenantSupportTelemetry";
import prisma from "@/lib/prisma";

export type SupportTicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "AWAITING_APPROVAL"
  | "DISPATCHED"
  | "PURGED";

export type SupportPortalTicket = {
  id: string;
  status: SupportTicketStatus;
  subject: string;
  urgency: string;
  objective: string;
  objectiveLabel: string;
  userNotes: string;
  path: string | null;
  surface: string | null;
  frameworkContext: string | null;
  contactName: string;
  contactEmail: string;
  company: string;
  occurredAt: string;
  summaryExcerpt: string;
  proposedReply: string | null;
};

const SUPPORT_SUMMARY_MARKERS = [
  PENDING_SUPPORT_INTAKE_TAG,
  "[SUPPORT INTAKE PROCESSED]",
  PENDING_DRAFT_TAG,
  DISPATCHED_DRAFT_TAG,
  PURGED_DRAFT_TAG,
  "inTenantSupportTicket",
  "Support console inquiry",
] as const;

function sanitizeText(raw: unknown, maxLen: number): string {
  return String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maxLen);
}

function parseIntakeFields(summary: string): {
  urgency: string;
  objective: string;
  userNotes: string;
  frameworkContext: string | null;
  path: string | null;
  surface: string | null;
} {
  const urgency = summary.match(/--- Urgency ---\s*(\S+)/)?.[1]?.trim() ?? "ROUTINE";
  const objectiveLine = summary.match(/--- Objective ---\s*(.+)/)?.[1]?.trim() ?? "";
  const objective = objectiveLine.split("|")[0]?.trim() ?? "OTHER";
  const userNotes =
    summary.match(/--- Operator Details ---\s*([\s\S]*?)\s*--- Route \/ Framework ---/)?.[1]?.trim() ??
    "";
  const routeLine = summary.match(/--- Route \/ Framework ---\s*(.+)/)?.[1]?.trim() ?? "";
  const frameworkContext = routeLine.match(/framework=([^|]+)/)?.[1]?.trim() ?? null;
  const path = routeLine.match(/path=([^|]+)/)?.[1]?.trim() ?? null;
  const surface = routeLine.match(/surface=([^|]+)/)?.[1]?.trim() ?? null;

  return {
    urgency,
    objective,
    userNotes,
    frameworkContext: frameworkContext === "UNKNOWN" ? null : frameworkContext,
    path: path === "n/a" ? null : path,
    surface: surface === "n/a" ? null : surface,
  };
}

export function inferSupportTicketStatus(summary: string): SupportTicketStatus {
  if (summary.includes(PURGED_DRAFT_TAG)) return "PURGED";
  if (summary.includes(DISPATCHED_DRAFT_TAG)) return "DISPATCHED";
  if (
    summary.includes(PENDING_DRAFT_TAG) &&
    !summary.includes("[PENDING SALES DRAFT") &&
    !summary.includes("[PENDING CS ADVISORY")
  ) {
    return "AWAITING_APPROVAL";
  }
  if (summary.includes("[SUPPORT INTAKE PROCESSED]")) return "IN_PROGRESS";
  if (summary.includes(PENDING_SUPPORT_INTAKE_TAG)) return "OPEN";
  return "OPEN";
}

function buildTicketSubject(summary: string, status: SupportTicketStatus): string {
  if (status === "AWAITING_APPROVAL" || status === "DISPATCHED" || status === "PURGED") {
    return parsePendingDraftSummary(summary).subject;
  }
  if (summary.includes("Support console inquiry")) {
    return "Support console inquiry";
  }
  const objective = parseIntakeFields(summary).objective;
  return `Support ticket · ${supportObjectiveLabel(objective as InTenantSupportObjective)}`;
}

/** Tenant-scoped support ticket ledger for the operator portal. */
export async function listSupportPortalTickets(
  tenantId: string,
  options?: { status?: SupportTicketStatus | "ALL"; limit?: number },
): Promise<{ tickets: SupportPortalTicket[]; polledAt: string }> {
  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 200);

  const rows = await prisma.ironboardCrmInteraction.findMany({
    where: {
      tenantId,
      contactId: { not: null },
      OR: SUPPORT_SUMMARY_MARKERS.map((marker) => ({ summary: { contains: marker } })),
    },
    include: {
      contact: {
        select: {
          fullName: true,
          email: true,
          company: true,
        },
      },
    },
    orderBy: { occurredAt: "desc" },
    take: limit,
  });

  const tickets: SupportPortalTicket[] = [];

  for (const row of rows) {
    if (!row.contact) continue;
    const status = inferSupportTicketStatus(row.summary);
    if (options?.status && options.status !== "ALL" && status !== options.status) continue;

    const intake = parseIntakeFields(row.summary);
    const draft =
      status === "AWAITING_APPROVAL" || status === "DISPATCHED" || status === "PURGED"
        ? parsePendingDraftSummary(row.summary)
        : null;

    tickets.push({
      id: row.id,
      status,
      subject: buildTicketSubject(row.summary, status),
      urgency: intake.urgency,
      objective: intake.objective,
      objectiveLabel: supportObjectiveLabel(intake.objective as InTenantSupportObjective),
      userNotes: intake.userNotes || draft?.incomingQuery || "",
      path: intake.path,
      surface: intake.surface,
      frameworkContext: intake.frameworkContext,
      contactName: row.contact.fullName,
      contactEmail: row.contact.email,
      company: row.contact.company,
      occurredAt: row.occurredAt.toISOString(),
      summaryExcerpt: sanitizeText(row.summary, 500),
      proposedReply: draft?.proposedReply ?? null,
    });
  }

  return { tickets, polledAt: new Date().toISOString() };
}

export async function getSupportPortalTicket(
  tenantId: string,
  interactionId: string,
): Promise<SupportPortalTicket | null> {
  const row = await prisma.ironboardCrmInteraction.findFirst({
    where: { id: interactionId, tenantId, contactId: { not: null } },
    include: {
      contact: {
        select: {
          fullName: true,
          email: true,
          company: true,
        },
      },
    },
  });

  if (!row?.contact) return null;
  if (!SUPPORT_SUMMARY_MARKERS.some((marker) => row.summary.includes(marker))) return null;

  const status = inferSupportTicketStatus(row.summary);
  const intake = parseIntakeFields(row.summary);
  const draft =
    status === "AWAITING_APPROVAL" || status === "DISPATCHED" || status === "PURGED"
      ? parsePendingDraftSummary(row.summary)
      : null;

  return {
    id: row.id,
    status,
    subject: buildTicketSubject(row.summary, status),
    urgency: intake.urgency,
    objective: intake.objective,
    objectiveLabel: supportObjectiveLabel(intake.objective as InTenantSupportObjective),
    userNotes: intake.userNotes || draft?.incomingQuery || "",
    path: intake.path,
    surface: intake.surface,
    frameworkContext: intake.frameworkContext,
    contactName: row.contact.fullName,
    contactEmail: row.contact.email,
    company: row.contact.company,
    occurredAt: row.occurredAt.toISOString(),
    summaryExcerpt: sanitizeText(row.summary, 4_000),
    proposedReply: draft?.proposedReply ?? null,
  };
}
