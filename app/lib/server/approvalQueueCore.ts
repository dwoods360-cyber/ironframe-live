import "server-only";

import prisma from "@/lib/prisma";
import { isSalesSmsDraft } from "@/app/lib/approvalDraftChannel";

export { isSalesSmsDraft };

export const PENDING_DRAFT_TAG = "[PENDING DRAFT APPROVAL]";
export const PENDING_SUPPORT_INTAKE_TAG = "[PENDING SUPPORT INTAKE]";
export const PENDING_SALES_DRAFT_TAG = "[PENDING SALES DRAFT APPROVAL]";
export const PENDING_CS_ADVISORY_TAG = "[PENDING CS ADVISORY APPROVAL]";
export const DISPATCHED_DRAFT_TAG = "[DISPATCHED SUPPORT COURIER]";
export const DISPATCHED_SALES_DRAFT_TAG = "[DISPATCHED SALES COURIER]";
export const PURGED_DRAFT_TAG = "[PURGED DRAFT]";

export const PENDING_DRAFT_TAGS = [PENDING_DRAFT_TAG, PENDING_SALES_DRAFT_TAG, PENDING_CS_ADVISORY_TAG] as const;

export type ApprovalTier = "Gridcore" | "Vaultbank" | "Medshield";
export type DraftKind = "SUPPORT" | "SALES" | "CUSTOMER_SUCCESS";

export type ApprovalDispatchChannel = "EMAIL" | "SMS";

export type PendingApprovalDraft = {
  id: string;
  contactName: string;
  company: string;
  subject: string;
  incomingQuery: string;
  proposedReply: string;
  tier: ApprovalTier;
  draftKind: DraftKind;
  tenantId: string;
  contactId: string;
  contactEmail: string;
  contactPhone: string | null;
  /** Suggested wire channel for this draft (SALES may be SMS). */
  dispatchChannel: ApprovalDispatchChannel;
};

export function isPendingDraftSummary(summary: string): boolean {
  // Purged rows archive the original body (which still contains PENDING tags) —
  // treat soft-archived drafts as non-pending so Approvals does not re-list them.
  if (summary.includes(PURGED_DRAFT_TAG) || summary.startsWith("[PURGED DRAFT]")) {
    return false;
  }
  return PENDING_DRAFT_TAGS.some((tag) => summary.includes(tag));
}

export function inferDraftKind(summary: string): DraftKind {
  if (summary.includes(PENDING_CS_ADVISORY_TAG)) return "CUSTOMER_SUCCESS";
  return summary.includes(PENDING_SALES_DRAFT_TAG) ? "SALES" : "SUPPORT";
}

function inferTierFromContact(title: string, metadata: unknown): ApprovalTier {
  const meta =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : null;
  const fromMeta = String(meta?.initialBaselineAlignment ?? "").trim();
  if (fromMeta === "Gridcore" || fromMeta === "Vaultbank" || fromMeta === "Medshield") {
    return fromMeta;
  }

  const baselineMatch = title.match(/Baseline:(Gridcore|Vaultbank|Medshield)/i);
  if (baselineMatch?.[1]) {
    const key = baselineMatch[1];
    if (key === "Gridcore" || key === "Vaultbank" || key === "Medshield") return key;
  }

  return "Gridcore";
}

export function parsePendingDraftSummary(summary: string): {
  subject: string;
  proposedReply: string;
  incomingQuery?: string;
} {
  const supportSubject =
    summary.match(/\[PENDING DRAFT APPROVAL\]\s*Re:\s*(.+)/i)?.[1]?.trim() ?? null;
  const salesSubject =
    summary.match(/\[PENDING SALES DRAFT APPROVAL\]\s*(.+)/i)?.[1]?.trim() ?? null;
  const csSubject =
    summary.match(/\[PENDING CS ADVISORY APPROVAL\]\s*(.+)/i)?.[1]?.trim() ?? null;
  const subjectLine = csSubject ?? salesSubject ?? supportSubject ?? "Support inquiry";

  const replyMatch = summary.match(
    /--- Agent Proposed Reply Text ---\s*([\s\S]*?)\s*--- (?:Tracking Core|Prospect Context) ---/,
  );
  const proposedReply =
    replyMatch?.[1]?.trim() ??
    summary
      .replace(PENDING_CS_ADVISORY_TAG, "")
      .replace(PENDING_SALES_DRAFT_TAG, "")
      .replace(PENDING_DRAFT_TAG, "")
      .trim();

  const incomingQueryMatch = summary.match(/--- Incoming Query ---\s*([\s\S]*?)\s*--- Agent Proposed Reply Text ---/);
  const ingressNotesMatch = summary.match(/Ingress Notes:\s*(.+)/i);
  const incomingQuery =
    incomingQueryMatch?.[1]?.trim() ?? ingressNotesMatch?.[1]?.trim() ?? undefined;

  return { subject: subjectLine, proposedReply, incomingQuery };
}

function mapRowToDraft(row: {
  id: string;
  tenantId: string;
  contactId: string | null;
  channel: string | null;
  summary: string;
  contact: {
    fullName: string;
    company: string;
    email: string;
    phone: string | null;
    title: string;
    metadata: unknown;
  } | null;
}): PendingApprovalDraft | null {
  if (!row.contactId || !row.contact) return null;
  if (!isPendingDraftSummary(row.summary)) return null;

  const parsed = parsePendingDraftSummary(row.summary);
  const draftKind = inferDraftKind(row.summary);
  const dispatchChannel: ApprovalDispatchChannel =
    draftKind === "SALES" && isSalesSmsDraft(row.summary, row.channel) ? "SMS" : "EMAIL";

  return {
    id: row.id,
    tenantId: row.tenantId,
    contactId: row.contactId,
    contactEmail: row.contact.email,
    contactPhone: row.contact.phone,
    contactName: row.contact.fullName,
    company: row.contact.company,
    subject: parsed.subject,
    incomingQuery:
      parsed.incomingQuery ?? "Inbound context retained in CRM thread history.",
    proposedReply: parsed.proposedReply,
    tier: inferTierFromContact(row.contact.title, row.contact.metadata),
    draftKind,
    dispatchChannel,
  };
}

export async function fetchPendingApprovalDrafts(): Promise<PendingApprovalDraft[]> {
  const rows = await prisma.ironboardCrmInteraction.findMany({
    where: {
      OR: PENDING_DRAFT_TAGS.map((tag) => ({ summary: { contains: tag } })),
      NOT: {
        OR: [
          { summary: { contains: PURGED_DRAFT_TAG } },
          { summary: { startsWith: "[PURGED DRAFT]" } },
        ],
      },
      contactId: { not: null },
    },
    orderBy: { occurredAt: "desc" },
    take: 50,
    select: {
      id: true,
      tenantId: true,
      contactId: true,
      channel: true,
      summary: true,
      contact: {
        select: {
          fullName: true,
          company: true,
          email: true,
          phone: true,
          title: true,
          metadata: true,
        },
      },
    },
  });

  const drafts = rows
    .map(mapRowToDraft)
    .filter((draft): draft is PendingApprovalDraft => draft != null);

  return Promise.all(
    drafts.map(async (draft) => {
      if (draft.incomingQuery !== "Inbound context retained in CRM thread history.") {
        return draft;
      }
      return {
        ...draft,
        incomingQuery: await resolveIncomingQuery(draft.contactId, draft.id),
      };
    }),
  );
}

async function resolveIncomingQuery(contactId: string, excludeInteractionId: string): Promise<string> {
  const prior = await prisma.ironboardCrmInteraction.findFirst({
    where: {
      contactId,
      id: { not: excludeInteractionId },
      channel: "EMAIL",
      NOT: {
        OR: PENDING_DRAFT_TAGS.map((tag) => ({ summary: { contains: tag } })),
      },
    },
    orderBy: { occurredAt: "desc" },
    select: { summary: true },
  });

  if (!prior?.summary) {
    return "Inbound context retained in CRM thread history.";
  }

  const bodyMatch = prior.summary.match(/Body:\s*([\s\S]+)/i);
  return bodyMatch?.[1]?.trim().slice(0, 2_000) ?? prior.summary.slice(0, 2_000);
}
