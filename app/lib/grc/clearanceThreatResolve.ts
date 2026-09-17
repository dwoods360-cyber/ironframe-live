import type { Prisma } from "@prisma/client";
import { ThreatState, type DeAckReason } from "@prisma/client";
import { readSimulationPlaneEnabled } from "@/app/lib/security/ingressGateway";
import { withIronguardTenant } from "@/app/lib/server/ironguardSessionTenant";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { CLEARANCE_QUEUE_STATUSES } from "@/app/utils/clearanceQueue";

export const clearanceThreatSelect = {
  id: true,
  title: true,
  sourceAgent: true,
  ingestionDetails: true,
  tenantCompanyId: true,
  status: true,
  isFalsePositive: true,
  dispositionStatus: true,
  receiptHash: true,
  deAckReason: true,
  updatedAt: true,
  score: true,
  targetEntity: true,
  financialRisk_cents: true,
  createdAt: true,
} satisfies Prisma.ThreatEventSelect;

export type ClearanceThreatRow = {
  id: string;
  title: string;
  sourceAgent: string;
  /** Production: string column; shadow sim: JSONB (`Json`). */
  ingestionDetails: string | Prisma.JsonValue | null;
  tenantCompanyId: bigint | null;
  status: ThreatState;
  isFalsePositive: boolean;
  dispositionStatus: string | null;
  receiptHash: string | null;
  deAckReason: DeAckReason | null;
  updatedAt: Date;
  score: number;
  targetEntity: string;
  financialRisk_cents: bigint;
  createdAt: Date;
};

export type ResolvedClearanceThreat = {
  mode: "sim" | "prod";
  threat: ClearanceThreatRow;
  tenantUuid: string;
  companyId: bigint;
};

/**
 * Canonical company for a tenant UUID. Stable across server actions:
 * prefer a non–test-record company, then lowest `id` (avoids non-deterministic `findFirst`
 * when multiple `Company` rows share the same `tenantId` — birth vs ack must match).
 */
export async function getCompanyIdForTenantUuid(
  tenantUuid: string | null | undefined,
): Promise<bigint | null> {
  const tid = tenantUuid?.trim();
  if (!tid) return null;
  return withIronguardTenant(tid, async (tx) => {
    const primary = await tx.company.findFirst({
      where: { tenantId: tid, isTestRecord: false },
      orderBy: { id: "asc" },
      select: { id: true },
    });
    if (primary) return primary.id;
    const fallback = await tx.company.findFirst({
      where: { tenantId: tid },
      orderBy: { id: "asc" },
      select: { id: true },
    });
    return fallback?.id ?? null;
  });
}

/** All company ids bound to a tenant (Active board reads may span bootstrap + prod rows). */
export async function getCompanyIdsForTenantUuid(
  tenantUuid: string | null | undefined,
): Promise<bigint[]> {
  const tid = tenantUuid?.trim();
  if (!tid) return [];
  const companies = await withIronguardTenant(tid, (tx) =>
    tx.company.findMany({
      where: { tenantId: tid },
      select: { id: true },
      orderBy: { id: "asc" },
    }),
  );
  return companies.map((c) => c.id);
}

/**
 * Canonical company for the active dashboard tenant. Stable across server actions:
 * prefer a non–test-record company, then lowest `id` (avoids non-deterministic `findFirst`
 * when multiple `Company` rows share the same `tenantId` — birth vs ack must match).
 */
export async function getCompanyIdForActiveTenant(): Promise<bigint | null> {
  const tenantUuid = await getActiveTenantUuidFromCookies();
  return getCompanyIdForTenantUuid(tenantUuid);
}

export async function resolveClearanceThreatForActiveTenant(
  threatId: string,
): Promise<ResolvedClearanceThreat> {
  const tenantUuid = await getActiveTenantUuidFromCookies();
  const companyId = await getCompanyIdForActiveTenant();
  if (!tenantUuid || companyId == null) {
    throw new Error("No company boundary for active tenant.");
  }
  const sim = await readSimulationPlaneEnabled();
  const where = {
    id: threatId,
    tenantCompanyId: companyId,
    status: { in: CLEARANCE_QUEUE_STATUSES },
  };
  const threat = await withIronguardTenant(tenantUuid, (tx) =>
    sim
      ? tx.riskEvent.findFirst({ where, select: clearanceThreatSelect })
      : tx.threatEvent.findFirst({ where, select: clearanceThreatSelect }),
  );
  if (!threat) {
    throw new Error("Threat not found, not in clearance queue, or tenant isolation denied.");
  }
  return { mode: sim ? "sim" : "prod", threat, tenantUuid, companyId };
}

const receiptThreatSelect = clearanceThreatSelect;

export type ReceiptThreatRow = ClearanceThreatRow;

export type ResolvedReceiptThreat = {
  mode: "sim" | "prod";
  threat: ReceiptThreatRow;
  tenantUuid: string;
  companyId: bigint;
};

/**
 * Any in-tenant threat row on the active ingress plane (production vs shadow), for digital receipts.
 */
export async function resolveThreatForReceiptForActiveTenant(
  threatId: string,
): Promise<ResolvedReceiptThreat> {
  const tenantUuid = await getActiveTenantUuidFromCookies();
  const companyId = await getCompanyIdForActiveTenant();
  if (!tenantUuid || companyId == null) {
    throw new Error("No company boundary for active tenant.");
  }
  const sim = await readSimulationPlaneEnabled();
  const where = { id: threatId, tenantCompanyId: companyId };
  const threat = await withIronguardTenant(tenantUuid, (tx) =>
    sim
      ? tx.riskEvent.findFirst({ where, select: receiptThreatSelect })
      : tx.threatEvent.findFirst({ where, select: receiptThreatSelect }),
  );
  if (!threat) {
    throw new Error("Threat not found or tenant isolation denied.");
  }
  return { mode: sim ? "sim" : "prod", threat, tenantUuid, companyId };
}
