"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { ThreatState } from "@prisma/client";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

export type TeleportThreatResult =
  | { ok: true; productionId: string }
  | { ok: false; error: string };

/**
 * Moves a PIPELINE/QUARANTINED row from SimThreatEvent → ThreatEvent (new CUID), then deletes the shadow row.
 * Writes a golden-vault AuditLog entry on the new production threat id.
 */
export async function teleportThreatToProduction(simId: string): Promise<TeleportThreatResult> {
  const id = simId?.trim();
  if (!id) {
    return { ok: false, error: "Missing shadow threat id." };
  }

  const tenantUuid = await getActiveTenantUuidFromCookies();
  if (!tenantUuid) {
    return { ok: false, error: "No active tenant." };
  }

  const companies = await prisma.company.findMany({
    where: { tenantId: tenantUuid },
    select: { id: true },
  });
  const companyIds = new Set(companies.map((c) => c.id));

  const row = await prisma.simThreatEvent.findUnique({ where: { id } });
  if (!row) {
    return { ok: false, error: "Shadow threat not found." };
  }

  if (row.tenantCompanyId != null && !companyIds.has(row.tenantCompanyId)) {
    return { ok: false, error: "Threat is outside the active tenant boundary." };
  }

  try {
    const productionId = await prisma.$transaction(async (tx) => {
      const created = await tx.threatEvent.create({
        data: {
          title: row.title,
          sourceAgent: row.sourceAgent,
          score: row.score,
          targetEntity: row.targetEntity,
          financialRisk_cents: row.financialRisk_cents,
          tenantCompanyId: row.tenantCompanyId,
          status: ThreatState.PIPELINE,
          remoteTechId: null,
          isRemoteAccessAuthorized: row.isRemoteAccessAuthorized,
          ttlSeconds: row.ttlSeconds,
          deAckReason: null,
          assigneeId: null,
          aiReport: row.aiReport,
          ingestionDetails: row.ingestionDetails,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "TELEPORT",
          justification: "[TELEPORT] Card moved from Shadow Plane to Production Vault.",
          operatorId: "OPSUPPORT_TELEPORT",
          threatId: created.id,
          isSimulation: false,
        },
      });

      await tx.simThreatEvent.delete({ where: { id } });
      return created.id;
    });

    revalidatePath("/opsupport");
    revalidatePath("/");
    revalidatePath("/dashboard");

    return { ok: true, productionId };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

export type ClearShadowLogsResult =
  | {
      ok: true;
      deletedSimThreats: number;
      deletedAuditLogs: number;
      deletedSimulationDiagnosticLogs: number;
    }
  | { ok: false; error: string };

/**
 * Wipes tenant-scoped `SimulationDiagnosticLog`, shadow threats, and simulation-flagged audit rows.
 */
export async function clearShadowPlaneLogs(): Promise<ClearShadowLogsResult> {
  const tenantUuid = await getActiveTenantUuidFromCookies();
  if (!tenantUuid) {
    return { ok: false, error: "No active tenant." };
  }

  try {
    const companies = await prisma.company.findMany({
      where: { tenantId: tenantUuid },
      select: { id: true },
    });
    const companyIds = companies.map((c) => c.id);

    const { deletedSimThreats, deletedAuditLogs, deletedSimulationDiagnosticLogs } =
      await prisma.$transaction(async (tx) => {
        const diag = await tx.simulationDiagnosticLog.deleteMany({
          where: { tenantUuid },
        });
        if (companyIds.length === 0) {
          return { deletedSimThreats: 0, deletedAuditLogs: 0, deletedSimulationDiagnosticLogs: diag.count };
        }
        const sim = await tx.simThreatEvent.deleteMany({
          where: { tenantCompanyId: { in: companyIds } },
        });
        const audit = await tx.auditLog.deleteMany({
          where: {
            isSimulation: true,
            OR: [{ threatId: null }, { threat: { tenantCompanyId: { in: companyIds } } }],
          },
        });
        return {
          deletedSimThreats: sim.count,
          deletedAuditLogs: audit.count,
          deletedSimulationDiagnosticLogs: diag.count,
        };
      });

    revalidatePath("/opsupport");
    revalidatePath("/");
    revalidatePath("/dashboard");

    return { ok: true, deletedSimThreats, deletedAuditLogs, deletedSimulationDiagnosticLogs };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
