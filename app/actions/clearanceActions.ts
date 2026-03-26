"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { ThreatState, DeAckReason } from "@prisma/client";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

/**
 * Clearance queue uses the primary DB: ThreatEvent rows in PIPELINE for the active tenant's company.
 */

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
      status: ThreatState.PIPELINE,
    },
  });
  if (!threat) {
    throw new Error("Threat not found, not in clearance queue, or tenant isolation denied.");
  }
  return { threat, tenantUuid, companyId };
}

export async function getPendingThreatActivityLogsForClearance() {
  try {
    const companyId = await getCompanyIdForActiveTenant();
    if (companyId == null) {
      return { success: true as const, logs: [] };
    }
    const logs = await prisma.threatEvent.findMany({
      where: {
        status: ThreatState.PIPELINE,
        tenantCompanyId: companyId,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
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

export async function promoteThreatToAuditLog(threatId: string): Promise<PromoteThreatResult> {
  try {
    const { threat } = await requirePipelineThreatForActiveTenant(threatId);
    const audit = await prisma.auditLog.create({
      data: {
        action: `CLEARANCE_PROMOTED:${threat.sourceAgent}`,
        justification: threat.ingestionDetails ?? threat.title,
        operatorId: "CLEARANCE_BRIDGE",
        threatId: threat.id,
        isSimulation: false,
      },
    });
    return { success: true as const, auditId: audit.id, threatId: threat.id };
  } catch (error) {
    console.error("[clearanceActions] promoteThreatToAuditLog:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function promoteThreatToSanctum(threatId: string): Promise<PromoteThreatResult> {
  try {
    const { threat } = await requirePipelineThreatForActiveTenant(threatId);
    const promotedDetails = JSON.stringify({
      source_threat_id: threatId,
      sourceAgent: threat.sourceAgent,
      ingestion: threat.ingestionDetails,
    });
    const promoted = await prisma.auditLog.create({
      data: {
        action: `CLEARANCE_PROMOTED:${threat.sourceAgent}`,
        justification: promotedDetails,
        operatorId: "CLEARANCE_BRIDGE",
        threatId: threat.id,
        isSimulation: false,
      },
    });
    await prisma.auditLog.create({
      data: {
        action: "CHAIN_OF_CUSTODY_TRANSFER",
        justification: `Promoted pipeline threat ${threatId} from clearance to active ledger.`,
        operatorId: "CLEARANCE_BRIDGE",
        threatId: threat.id,
        isSimulation: false,
      },
    });
    await prisma.threatEvent.update({
      where: { id: threatId },
      data: { status: ThreatState.ACTIVE },
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
    await requirePipelineThreatForActiveTenant(threatId);
    await prisma.threatEvent.update({
      where: { id: threatId },
      data: {
        status: ThreatState.DE_ACKNOWLEDGED,
        deAckReason: DeAckReason.FALSE_POSITIVE,
      },
    });

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
    await requirePipelineThreatForActiveTenant(threatId);
    await prisma.threatEvent.update({
      where: { id: threatId },
      data: { status: ThreatState.CONFIRMED },
    });

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
