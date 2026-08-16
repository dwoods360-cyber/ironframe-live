import "server-only";

import { CORE_BEACHHEAD_SECTORS } from "@/lib/crm/leadPrioritization";
import {
  PENDING_SALES_DRAFT_TAG,
  PURGED_DRAFT_TAG,
} from "@/app/lib/server/approvalQueueCore";
import {
  buildC1LockedEmailBody,
  buildC1LockedSmsBody,
} from "@/app/lib/server/salesteamC1LockedCopy";
import {
  buildSalesTeamPendingDraftSummary,
  listSalesteamProspectQueue,
  submitSalesteamOutreachDraft,
  type SalesteamProspectWire,
} from "@/app/lib/server/salesteamIngressCore";
import { resolveSalesTeamCrmScopeSlug } from "@/app/lib/server/operationsApiRedaction";
import { resolveRequeueChannel } from "@/app/lib/server/salesteamDraftRequeueChannel";
import prisma from "@/lib/prisma";

export type RequeueDraftResult = {
  ok: boolean;
  tenantSlug: string;
  prospectsSeen: number;
  queued: Array<{
    company: string;
    dealId: string;
    channel: "EMAIL" | "SMS";
    interactionId: string;
    email: string;
    refreshed?: boolean;
  }>;
  skipped: Array<{ company: string; dealId: string; reason: string }>;
  errors: Array<{ company: string; dealId: string; message: string }>;
};

function resolveSector(raw: string | null): (typeof CORE_BEACHHEAD_SECTORS)[number] {
  const sector = (raw ?? "REGIONAL_BHC").trim().toUpperCase();
  if ((CORE_BEACHHEAD_SECTORS as readonly string[]).includes(sector)) {
    return sector as (typeof CORE_BEACHHEAD_SECTORS)[number];
  }
  return "REGIONAL_BHC";
}

/** Re-export C1-locked EMAIL for callers that previously imported from this module. */
export { buildC1LockedEmailBody } from "@/app/lib/server/salesteamC1LockedCopy";

async function findOpenPendingDraft(
  dealId: string,
  tenantId: string,
): Promise<{ id: string } | null> {
  return prisma.ironboardCrmInteraction.findFirst({
    where: {
      tenantId,
      dealId,
      summary: { contains: PENDING_SALES_DRAFT_TAG },
      NOT: {
        OR: [
          { summary: { contains: PURGED_DRAFT_TAG } },
          { summary: { startsWith: "[PURGED DRAFT]" } },
        ],
      },
    },
    orderBy: { occurredAt: "desc" },
    select: { id: true },
  });
}

/**
 * Control-plane re-queue: create or refresh PENDING SALES DRAFT rows for prospect-pool PROSPECTs.
 * Bypasses SalesTeam worker processedDeal. Never sends — HITL Approvals only.
 */
export async function requeueSalesteamApprovalDrafts(options?: {
  companyIncludes?: string;
  /** When true, overwrite an existing PENDING draft with C1-locked copy. */
  force?: boolean;
}): Promise<RequeueDraftResult> {
  const tenantSlug = resolveSalesTeamCrmScopeSlug();
  const filter = options?.companyIncludes?.trim().toLowerCase();
  const force = Boolean(options?.force);
  const { tenantId, prospects } = await listSalesteamProspectQueue(tenantSlug, 50);

  const result: RequeueDraftResult = {
    ok: true,
    tenantSlug,
    prospectsSeen: prospects.length,
    queued: [],
    skipped: [],
    errors: [],
  };

  const targets = filter
    ? prospects.filter((p) => p.company.toLowerCase().includes(filter))
    : prospects;

  if (targets.length === 0) {
    result.ok = false;
    return result;
  }

  for (const prospect of targets) {
    const existing = await findOpenPendingDraft(prospect.dealId, tenantId);
    if (existing && !force) {
      result.skipped.push({
        company: prospect.company,
        dealId: prospect.dealId,
        reason: "PENDING draft already open",
      });
      continue;
    }

    const channel = resolveRequeueChannel(prospect);
    if (!channel) {
      result.skipped.push({
        company: prospect.company,
        dealId: prospect.dealId,
        reason: "No usable EMAIL or phone for DISPATCH",
      });
      continue;
    }

    const draft =
      channel === "EMAIL" ? buildC1LockedEmailBody(prospect) : buildC1LockedSmsBody(prospect);
    const sector = resolveSector(prospect.industrySector);

    try {
      if (existing && force) {
        const summary = buildSalesTeamPendingDraftSummary({
          subject: draft.subject,
          body: draft.body,
          channel,
          industrySector: sector,
          lossExposureCents: prospect.valueCents,
        });
        await prisma.ironboardCrmInteraction.update({
          where: { id: existing.id },
          data: { summary: summary.slice(0, 12_000), occurredAt: new Date() },
        });
        result.queued.push({
          company: prospect.company,
          dealId: prospect.dealId,
          channel,
          interactionId: existing.id,
          email: prospect.email,
          refreshed: true,
        });
        continue;
      }

      const submitted = await submitSalesteamOutreachDraft({
        tenantSlug,
        dealId: prospect.dealId,
        contactId: prospect.contactId,
        channel,
        subject: draft.subject,
        body: draft.body,
        industrySector: sector,
        lossExposureCents: prospect.valueCents,
      });
      result.queued.push({
        company: prospect.company,
        dealId: prospect.dealId,
        channel,
        interactionId: submitted.interactionId,
        email: prospect.email,
      });
    } catch (err) {
      result.errors.push({
        company: prospect.company,
        dealId: prospect.dealId,
        message: err instanceof Error ? err.message : "requeue failed",
      });
    }
  }

  result.ok = result.errors.length === 0 && result.queued.length > 0;
  return result;
}
