"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { ThreatState, DeAckReason } from "@prisma/client";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import type { Prisma } from "@prisma/client";
import { mergeIngestionDetailsPatch } from "@/app/utils/ingestionDetailsMerge";
import { parseIrongateScanFromIngestionDetails } from "@/app/utils/irongateScan";
import { resolveDispositionOperatorId } from "@/app/utils/serverAuth";
import { CLEARANCE_QUEUE_STATUSES } from "@/app/utils/clearanceQueue";
import { dispatchIronlockQuarantineAutoEscalation } from "@/app/utils/ironlockQuarantineAutoEscalation";

/**
 * Clearance queue uses the primary DB: ThreatEvent rows in PIPELINE for the active tenant's company.
 */

const DMZ_PROMOTE_GRC_JUSTIFICATION = "Cleared and Promoted via DMZ Quarantine";

const DMZ_REJECT_WORK_NOTE =
  "[DMZ QUARANTINE: REJECTED] Threat archived as False Positive.";

const DMZ_ESCALATE_WORK_NOTE =
  "[DMZ QUARANTINE: ESCALATED] Threat escalated directly to SecOps.";

async function getCompanyIdForActiveTenant(): Promise<bigint | null> {
  const tenantUuid = await getActiveTenantUuidFromCookies();
  const company = await prisma.company.findFirst({
    where: { tenantId: tenantUuid },
    select: { id: true },
  });
  return company?.id ?? null;
}

async function requirePipelineThreatForActiveTenant(threatId: string) {
  const tenantUuid = await getActiveTenantUuidFromCookies();
  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) {
    throw new Error("No company boundary for active tenant.");
  }
  const threat = await prisma.threatEvent.findFirst({
    where: {
      id: threatId,
      tenantCompanyId: companyId,
      status: { in: CLEARANCE_QUEUE_STATUSES },
    },
    select: {
      id: true,
      title: true,
      sourceAgent: true,
      ingestionDetails: true,
      tenantCompanyId: true,
      status: true,
    },
  });
  if (!threat) {
    throw new Error("Threat not found, not in clearance queue, or tenant isolation denied.");
  }
  return { threat, tenantUuid, companyId };
}

function computeIrongateVerdict(threat: {
  id: string;
  title: string;
  sourceAgent: string;
}): "CLEAN" | "MALICIOUS" {
  const haystack = `${threat.title} ${threat.sourceAgent}`.toUpperCase();
  if (
    /QUARANTINED|IRONLOCK|EXTERNAL_INJECTION|HOSTILE|MALICIOUS|EXTERNAL_INJECTION_ATTEMPT/i.test(
      haystack,
    )
  ) {
    return "MALICIOUS";
  }
  let sum = 0;
  for (let i = 0; i < threat.id.length; i++) {
    sum += threat.id.charCodeAt(i);
  }
  return sum % 3 === 0 ? "MALICIOUS" : "CLEAN";
}

export type IrongateScanPayload = {
  status: "CLEAN" | "MALICIOUS";
  scannedAt: string;
};

export type RunIrongateSanitizationResult =
  | { success: true; irongateScan: IrongateScanPayload }
  | { success: false; error: string };

/**
 * DMZ autonomous sanitization: merge `irongateScan` into `ingestionDetails` (no schema migration).
 */
export async function runIrongateSanitization(
  threatId: string,
): Promise<RunIrongateSanitizationResult> {
  try {
    const { threat, tenantUuid } = await requirePipelineThreatForActiveTenant(threatId);
    const existing = parseIrongateScanFromIngestionDetails(threat.ingestionDetails ?? null);
    if (existing?.status === "CLEAN" || existing?.status === "MALICIOUS") {
      return {
        success: true,
        irongateScan: {
          status: existing.status,
          scannedAt: existing.scannedAt ?? new Date().toISOString(),
        },
      };
    }
    const status = computeIrongateVerdict(threat);
    const scannedAt = new Date().toISOString();
    const irongateScanJson: Prisma.InputJsonValue = { status, scannedAt };
    const merged = mergeIngestionDetailsPatch(threat.ingestionDetails ?? null, {
      irongateScan: irongateScanJson,
    });
    const previousStatus = threat.status;
    const data: Prisma.ThreatEventUpdateInput = {
      ingestionDetails: merged,
      ...(status === "MALICIOUS" ? { status: ThreatState.QUARANTINED } : {}),
    };
    await prisma.threatEvent.update({
      where: { id: threatId },
      data,
      select: { id: true },
    });
    if (status === "MALICIOUS" && previousStatus !== ThreatState.QUARANTINED) {
      void dispatchIronlockQuarantineAutoEscalation({
        threatId,
        tenantUuid,
        previousStatus,
      });
    }
    revalidatePath("/admin/clearance");
    return { success: true, irongateScan: { status, scannedAt } };
  } catch (error) {
    console.error("[clearanceActions] runIrongateSanitization:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getPendingThreatActivityLogsForClearance() {
  try {
    const companyId = await getCompanyIdForActiveTenant();
    if (companyId == null) {
      return { success: true as const, logs: [] };
    }
    const logs = await prisma.threatEvent.findMany({
      where: {
        status: { in: CLEARANCE_QUEUE_STATUSES },
        tenantCompanyId: companyId,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        sourceAgent: true,
        createdAt: true,
        ingestionDetails: true,
        status: true,
        tenantCompanyId: true,
      },
    });
    return { success: true as const, logs };
  } catch (error) {
    console.error("[clearanceActions] getPendingThreatActivityLogsForClearance:", error);
    return { success: false as const, logs: [], error: String(error) };
  }
}

export type PromoteThreatResult =
  | { success: true; auditId: string; threatId: string }
  | { success: false; error: string };

export async function promoteThreatToSanctum(threatId: string): Promise<PromoteThreatResult> {
  try {
    const operatorId = await resolveDispositionOperatorId();
    const { threat } = await requirePipelineThreatForActiveTenant(threatId);
    const irongate = parseIrongateScanFromIngestionDetails(threat.ingestionDetails ?? null);
    if (irongate?.status !== "CLEAN") {
      return {
        success: false,
        error:
          irongate?.status === "MALICIOUS"
            ? "Irongate: malicious signature detected — promotion to ledger is blocked."
            : "Irongate: payload not sanitized or verdict missing — CLEAN required before promotion.",
      };
    }
    const promotedDetails = JSON.stringify({
      source_threat_id: threatId,
      sourceAgent: threat.sourceAgent,
      ingestion: threat.ingestionDetails,
    });
    const promoted = await prisma.auditLog.create({
      data: {
        action: `CLEARANCE_PROMOTED:${threat.sourceAgent}`,
        justification: promotedDetails,
        operatorId,
        threatId: threat.id,
        isSimulation: false,
      },
    });
    await prisma.auditLog.create({
      data: {
        action: "CHAIN_OF_CUSTODY_TRANSFER",
        justification: `Promoted pipeline threat ${threatId} from clearance to active ledger.`,
        operatorId,
        threatId: threat.id,
        isSimulation: false,
      },
    });
    const promotedIngestionDetails = mergeIngestionDetailsPatch(threat.ingestionDetails ?? null, {
      grcJustification: DMZ_PROMOTE_GRC_JUSTIFICATION,
    });
    await prisma.threatEvent.update({
      where: { id: threatId },
      data: {
        status: ThreatState.ACTIVE,
        ingestionDetails: promotedIngestionDetails,
      },
      select: { id: true },
    });
    const out = { success: true as const, auditId: promoted.id, threatId: threat.id };

    revalidatePath("/admin/clearance");
    revalidatePath("/");
    revalidatePath("/", "layout");

    return out;
  } catch (error) {
    console.error("[clearanceActions] promoteThreatToSanctum:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export type DispositionResult = { success: true } | { success: false; error: string };

export async function rejectAndArchiveThreat(threatId: string): Promise<DispositionResult> {
  try {
    const operatorId = await resolveDispositionOperatorId();
    const { threat } = await requirePipelineThreatForActiveTenant(threatId);
    const rejectedIngestionDetails = mergeIngestionDetailsPatch(threat.ingestionDetails ?? null, {
      grcJustification: DMZ_REJECT_WORK_NOTE,
    });
    await prisma.$transaction([
      prisma.workNote.create({
        data: {
          text: DMZ_REJECT_WORK_NOTE,
          operatorId,
          threatId,
        },
      }),
      prisma.threatEvent.update({
        where: { id: threatId },
        data: {
          status: ThreatState.DE_ACKNOWLEDGED,
          deAckReason: DeAckReason.FALSE_POSITIVE,
          ingestionDetails: rejectedIngestionDetails,
        },
        select: { id: true },
      }),
    ]);

    revalidatePath("/admin/clearance");
    revalidatePath("/");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("[clearanceActions] rejectAndArchiveThreat:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function escalateToSecOps(threatId: string): Promise<DispositionResult> {
  try {
    const operatorId = await resolveDispositionOperatorId();
    const { threat } = await requirePipelineThreatForActiveTenant(threatId);
    const escalatedIngestionDetails = mergeIngestionDetailsPatch(threat.ingestionDetails ?? null, {
      grcJustification: DMZ_ESCALATE_WORK_NOTE,
    });
    await prisma.$transaction([
      prisma.workNote.create({
        data: {
          text: DMZ_ESCALATE_WORK_NOTE,
          operatorId,
          threatId,
        },
      }),
      prisma.threatEvent.update({
        where: { id: threatId },
        data: {
          status: ThreatState.CONFIRMED,
          ingestionDetails: escalatedIngestionDetails,
        },
        select: { id: true },
      }),
    ]);

    revalidatePath("/admin/clearance");
    revalidatePath("/");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("[clearanceActions] escalateToSecOps:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
