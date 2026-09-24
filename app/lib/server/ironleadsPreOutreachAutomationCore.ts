import "server-only";

import type { Prisma } from "@prisma/client";

import { CORE_BEACHHEAD_SECTORS } from "@/lib/crm/leadPrioritization";
import { PENDING_SALES_DRAFT_TAG } from "@/app/lib/server/approvalQueueCore";
import { shouldAutoQueueTouch1Draft } from "@/app/lib/ironleadsPreOutreachPolicy";
import { enrichIronleadsSuspectIfPlaceholder } from "@/app/lib/server/ironleadsAutoEnrichCore";
import { resolveSalesTeamCrmScopeSlug } from "@/app/lib/server/operationsApiRedaction";
import { buildC1LockedEmailBody } from "@/app/lib/server/salesteamC1LockedCopy";
import { submitSalesteamOutreachDraft } from "@/app/lib/server/salesteamIngressCore";
import { pullPendingSuspectBatch } from "@/app/lib/server/ironleadsPendingPoolCore";
import { withProspectPoolTenant } from "@/app/lib/server/ironleadsTenantScope";

function asRec(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

function resolveSector(raw: string | null): (typeof CORE_BEACHHEAD_SECTORS)[number] {
  const sector = (raw ?? "REGIONAL_BHC").trim().toUpperCase();
  if ((CORE_BEACHHEAD_SECTORS as readonly string[]).includes(sector)) {
    return sector as (typeof CORE_BEACHHEAD_SECTORS)[number];
  }
  return "REGIONAL_BHC";
}

export type PreOutreachResult = {
  contactId: string;
  enriched: boolean;
  appliedEmail: boolean;
  promoted: boolean;
  queuedDraftId: string | null;
  skippedReason: string | null;
};

/**
 * After Research: run paid finders if the buyer is named and email is still a
 * placeholder, then queue a T1 Approvals EMAIL draft when Fit+Buyer+Email PASS.
 * Never DISPATCHes.
 */
export async function runPreOutreachAfterResearch(
  contactId: string,
): Promise<PreOutreachResult> {
  const enrich = await enrichIronleadsSuspectIfPlaceholder(contactId, {
    includeHunter: true,
  });
  const appliedEmail = enrich.providers.some((p) => p.appliedEmail);
  const queued = await maybePromoteAndQueueTouch1Draft(contactId);
  return {
    contactId,
    enriched: enrich.providers.length > 0,
    appliedEmail,
    promoted: queued.promoted,
    queuedDraftId: queued.queuedDraftId,
    skippedReason: queued.skippedReason,
  };
}

export async function maybePromoteAndQueueTouch1Draft(
  contactId: string,
): Promise<{
  promoted: boolean;
  queuedDraftId: string | null;
  skippedReason: string | null;
}> {
  const row = await withProspectPoolTenant((tx, tenantId) =>
    tx.ironboardCrmContact.findFirst({
      where: { id: contactId, tenantId },
      select: {
        id: true,
        company: true,
        fullName: true,
        email: true,
        industrySector: true,
        metadata: true,
        primaryDeals: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: {
            id: true,
            stage: true,
            notes: true,
            valueCents: true,
            tenantId: true,
          },
        },
      },
    }),
  );
  if (!row) {
    return { promoted: false, queuedDraftId: null, skippedReason: "Contact not found" };
  }

  const deal = row.primaryDeals[0] ?? null;
  if (!deal) {
    return { promoted: false, queuedDraftId: null, skippedReason: "No deal" };
  }

  const meta = asRec(row.metadata);
  const named = asRec(meta.namedBuyer);
  const brief = asRec(meta.accountResearchBrief);
  const gates = asRec(brief.gates);
  const hold = asRec(meta.operatorHold);
  const namedName =
    (typeof named.fullName === "string" && named.fullName) || row.fullName;

  if (
    !shouldAutoQueueTouch1Draft({
      email: row.email,
      namedBuyerName: namedName,
      fit: String(asRec(gates.fit).result || ""),
      holdClassification: String(hold.classification || ""),
      company: row.company,
    })
  ) {
    return {
      promoted: false,
      queuedDraftId: null,
      skippedReason: "Not Fit PASS + named buyer + promote-ready email",
    };
  }

  let promoted = false;
  if (deal.stage === "SUSPECT") {
    const stamp = new Date().toISOString();
    const noteLine = `[${stamp}] Auto-promoted SUSPECT → PROSPECT after Fit·Buyer·Email PASS (T1 draft queued for HITL DISPATCH).`;
    await withProspectPoolTenant(async (tx, tenantId) => {
      await tx.ironboardCrmDeal.updateMany({
        where: { id: deal.id, tenantId },
        data: {
          stage: "PROSPECT",
          notes: deal.notes?.trim() ? `${deal.notes.trim()}\n${noteLine}` : noteLine,
        },
      });
      const nextMeta = {
        ...meta,
        preOutreachAutomation: {
          promotedAt: stamp,
          source: "research_auto_queue_touch1",
        },
      };
      await tx.ironboardCrmContact.updateMany({
        where: { id: row.id, tenantId },
        data: { metadata: nextMeta as Prisma.InputJsonValue },
      });
    });
    promoted = true;
    try {
      await pullPendingSuspectBatch(1);
    } catch {
      // Slot refill is best-effort; cron Research picks up new actives.
    }
  } else if (deal.stage !== "PROSPECT") {
    return {
      promoted: false,
      queuedDraftId: null,
      skippedReason: `Stage ${deal.stage} is not SUSPECT/PROSPECT`,
    };
  }

  const existing = await withProspectPoolTenant((tx, tenantId) =>
    tx.ironboardCrmInteraction.findFirst({
      where: {
        tenantId,
        dealId: deal.id,
        summary: { contains: PENDING_SALES_DRAFT_TAG },
      },
      select: { id: true },
    }),
  );
  if (existing) {
    return {
      promoted,
      queuedDraftId: existing.id,
      skippedReason: "PENDING draft already open",
    };
  }

  const draft = buildC1LockedEmailBody({
    company: row.company || "Unknown",
    fullName: namedName || row.fullName || "Team",
  });
  const submitted = await submitSalesteamOutreachDraft({
    tenantSlug: resolveSalesTeamCrmScopeSlug(),
    dealId: deal.id,
    contactId: row.id,
    channel: "EMAIL",
    subject: draft.subject,
    body: draft.body,
    industrySector: resolveSector(row.industrySector),
    lossExposureCents: deal.valueCents.toString(),
  });

  return {
    promoted,
    queuedDraftId: submitted.interactionId,
    skippedReason: null,
  };
}
