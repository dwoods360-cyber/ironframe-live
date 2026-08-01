/**
 * Approvals → Needs enrichment (N/E):
 * soft-archive draft, demote deal PROSPECT → SUSPECT, clear unsafe destinations
 * so SalesTeam cannot re-poll a dry-run / bad contact path.
 */
import type { Prisma } from "@prisma/client";

import { NEEDS_ENRICHMENT_DRAFT_TAG } from "@/app/lib/server/approvalQueueCore";
import prisma from "@/lib/prisma";

export function needsEnrichmentPlaceholderEmail(contactId: string): string {
  const short = contactId.replace(/-/g, "").slice(0, 12).toLowerCase();
  return `needs-enrichment+${short}@ironleads.local`;
}

export function buildNeedsEnrichmentSummary(originalSummary: string): string {
  return [
    `${NEEDS_ENRICHMENT_DRAFT_TAG} Operator returned this draft for contact enrichment (not send-ready).`,
    "Deal demoted to SUSPECT; destinations cleared for re-enrichment.",
    "--- Discarded Copy Text ---",
    originalSummary,
  ]
    .join("\n")
    .slice(0, 12_000);
}

export function buildNeedsEnrichmentDealNote(args: {
  stamp: string;
  priorEmail: string;
  priorPhone: string | null;
  operatorNote?: string | null;
}): string {
  const phone = (args.priorPhone ?? "").trim() || "(none)";
  const extra = (args.operatorNote ?? "").trim().slice(0, 400);
  return [
    `[${args.stamp}] Needs enrichment (Approvals N/E): cleared To ${args.priorEmail} / phone ${phone}; demoted PROSPECT → SUSPECT. Do not DISPATCH until named buyer + verified channel.`,
    extra ? `Operator note: ${extra}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export type NeedsEnrichmentResult = {
  ok: true;
  status: "SUCCESS_NEEDS_ENRICHMENT";
  interactionId: string;
  contactId: string;
  dealId: string | null;
  dealDemoted: boolean;
  priorEmail: string;
  priorPhone: string | null;
  placeholderEmail: string;
  suspectReportPath: string;
};

/**
 * Apply Needs enrichment for a pending Approvals interaction.
 * Caller must already validate auth + pending draft state.
 */
export async function applyApprovalNeedsEnrichment(args: {
  interactionId: string;
  contactId: string;
  dealId: string | null;
  originalSummary: string;
  priorEmail: string;
  priorPhone: string | null;
  priorContactMetadata: unknown;
  operatorNote?: string | null;
}): Promise<NeedsEnrichmentResult> {
  const stamp = new Date().toISOString();
  const placeholderEmail = needsEnrichmentPlaceholderEmail(args.contactId);
  const dealNote = buildNeedsEnrichmentDealNote({
    stamp,
    priorEmail: args.priorEmail,
    priorPhone: args.priorPhone,
    operatorNote: args.operatorNote,
  });

  const priorMeta =
    args.priorContactMetadata &&
    typeof args.priorContactMetadata === "object" &&
    !Array.isArray(args.priorContactMetadata)
      ? (args.priorContactMetadata as Record<string, unknown>)
      : {};

  const nextMeta: Record<string, unknown> = {
    ...priorMeta,
    needsEnrichment: {
      at: stamp,
      fromApprovalsInteractionId: args.interactionId,
      priorEmail: args.priorEmail,
      priorPhone: args.priorPhone,
      reason: "Approvals N/E — destination not send-ready",
    },
  };

  let dealDemoted = false;

  await prisma.$transaction(async (tx) => {
    await tx.ironboardCrmInteraction.update({
      where: { id: args.interactionId },
      data: {
        summary: buildNeedsEnrichmentSummary(args.originalSummary),
        occurredAt: new Date(),
      },
    });

    await tx.ironboardCrmContact.update({
      where: { id: args.contactId },
      data: {
        email: placeholderEmail,
        phone: null,
        metadata: nextMeta as Prisma.InputJsonValue,
      },
    });

    if (args.dealId) {
      const deal = await tx.ironboardCrmDeal.findUnique({
        where: { id: args.dealId },
        select: { id: true, stage: true, notes: true },
      });
      if (deal) {
        const nextStage = deal.stage === "PROSPECT" ? "SUSPECT" : deal.stage;
        dealDemoted = deal.stage === "PROSPECT";
        await tx.ironboardCrmDeal.update({
          where: { id: deal.id },
          data: {
            stage: nextStage,
            notes: deal.notes?.trim() ? `${deal.notes.trim()}\n${dealNote}` : dealNote,
          },
        });
      }
    }
  });

  return {
    ok: true,
    status: "SUCCESS_NEEDS_ENRICHMENT",
    interactionId: args.interactionId,
    contactId: args.contactId,
    dealId: args.dealId,
    dealDemoted,
    priorEmail: args.priorEmail,
    priorPhone: args.priorPhone,
    placeholderEmail,
    suspectReportPath: `/dashboard/operations/ironleads/suspects/${args.contactId}`,
  };
}
