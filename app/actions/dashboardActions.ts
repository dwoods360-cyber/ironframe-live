"use server";

import prisma from "@/lib/prisma";
import { ThreatState } from "@prisma/client";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { CLEARANCE_QUEUE_STATUSES } from "@/app/utils/clearanceQueue";

export type GlobalTelemetry = {
  activeExposureUsd: number;
  pipelineExposureUsd: number;
  mitigatedExposureUsd: number;
  activeCount: number;
  pipelineCount: number;
  /** DMZ pipeline threats with createdAt older than 4h (SLA breach). */
  slaBreachCount: number;
  /** Oldest PIPELINE threat `createdAt` for this tenant (DMZ queue head). */
  oldestPipelineThreatAt: Date | null;
};

const NULL_TELEMETRY: GlobalTelemetry = {
  activeExposureUsd: 0,
  pipelineExposureUsd: 0,
  mitigatedExposureUsd: 0,
  activeCount: 0,
  pipelineCount: 0,
  slaBreachCount: 0,
  oldestPipelineThreatAt: null,
};

async function getCompanyIdForActiveTenant(tenantUuidOverride?: string): Promise<bigint | null> {
  const tenantUuid = tenantUuidOverride ?? (await getActiveTenantUuidFromCookies());
  try {
    const company = await prisma.company.findFirst({
      where: { tenantId: tenantUuid },
      select: { id: true },
    });
    return company?.id ?? null;
  } catch (err) {
    // Control-first: tenant mismatch / DB errors should not crash the component tree.
    console.error("[dashboardActions] tenant_scope_error:", err);
    return null;
  }
}

/** BigInt cents → USD using `Number(cents) / 100` (serializable for JSON). */
function centsBigIntToUsd(value: bigint | null | undefined): number {
  const n = value ?? 0n;
  return Number(n) / 100;
}

const MITIGATED_STATUSES: ThreatState[] = [ThreatState.DE_ACKNOWLEDGED, ThreatState.RESOLVED];

/** Force-filter undefined/null for Prisma `in` strictness. */
const validClearanceStatuses = CLEARANCE_QUEUE_STATUSES.filter(
  (s): s is ThreatState => s !== undefined && s !== null,
);

/**
 * Tenant-scoped ThreatEvent aggregates: live financial exposure from `financialRisk_cents`
 * (not `Company.industry_avg_loss_cents`).
 */
export async function getGlobalTelemetry(tenantUuidOverride?: string): Promise<GlobalTelemetry> {
  const companyId = await getCompanyIdForActiveTenant(tenantUuidOverride);
  if (companyId == null) return NULL_TELEMETRY;

  const tenantWhere = { tenantCompanyId: companyId };
  const slaThreshold = new Date(Date.now() - 4 * 60 * 60 * 1000);

  try {
    const [
      activeAgg,
      pipelineAgg,
      mitigatedAgg,
      activeCount,
      pipelineCount,
      slaBreachCount,
      oldestThreat,
    ] = await Promise.all([
      prisma.threatEvent.aggregate({
        where: { ...tenantWhere, status: ThreatState.ACTIVE },
        _sum: { financialRisk_cents: true },
      }),
      prisma.threatEvent.aggregate({
        where: { ...tenantWhere, status: { in: validClearanceStatuses } },
        _sum: { financialRisk_cents: true },
      }),
      prisma.threatEvent.aggregate({
        where: {
          ...tenantWhere,
          status: {
            in: MITIGATED_STATUSES.filter((s): s is ThreatState => s != null),
          },
        },
        _sum: { financialRisk_cents: true },
      }),
      prisma.threatEvent.count({
        where: { ...tenantWhere, status: ThreatState.ACTIVE },
      }),
      prisma.threatEvent.count({
        where: { ...tenantWhere, status: { in: validClearanceStatuses } },
      }),
      prisma.threatEvent.count({
        where: {
          ...tenantWhere,
          status: { in: validClearanceStatuses },
          createdAt: { lt: slaThreshold },
        },
      }),
      // PIPELINE queue head for tenant company (`tenantCompanyId` — Prisma field for active-tenant company id).
      prisma.threatEvent.findFirst({
        where: { ...tenantWhere, status: { in: validClearanceStatuses } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
    ]);

    return {
      activeExposureUsd: centsBigIntToUsd(activeAgg._sum.financialRisk_cents),
      pipelineExposureUsd: centsBigIntToUsd(pipelineAgg._sum.financialRisk_cents),
      mitigatedExposureUsd: centsBigIntToUsd(mitigatedAgg._sum.financialRisk_cents),
      activeCount,
      pipelineCount,
      slaBreachCount,
      oldestPipelineThreatAt: oldestThreat?.createdAt ?? null,
    };
  } catch (err) {
    console.error("[dashboardActions] telemetry_query_error:", err);
    return NULL_TELEMETRY;
  }
}
