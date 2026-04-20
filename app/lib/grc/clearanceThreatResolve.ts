import type { Prisma } from "@prisma/client";
import { ThreatState, type DeAckReason } from "@prisma/client";
import prisma from "@/lib/prisma";
import { readSimulationPlaneEnabled } from "@/app/lib/security/ingressGateway";
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
  ingestionDetails: string | null;
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
 * Canonical company for the active dashboard tenant. Stable across server actions:
 * prefer a non–test-record company, then lowest `id` (avoids non-deterministic `findFirst`
 * when multiple `Company` rows share the same `tenantId` — birth vs ack must match).
 */
export async function getCompanyIdForActiveTenant(): Promise<bigint | null> {
  const tenantUuid = await getActiveTenantUuidFromCookies();
  const primary = await prisma.company.findFirst({
    where: { tenantId: tenantUuid, isTestRecord: false },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (primary) return primary.id;
  const fallback = await prisma.company.findFirst({
    where: { tenantId: tenantUuid },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  return fallback?.id ?? null;
}

export async function resolveClearanceThreatForActiveTenant(
  threatId: string,
): Promise<ResolvedClearanceThreat> {
  const tenantUuid = await getActiveTenantUuidFromCookies();
  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) {
    throw new Error("No company boundary for active tenant.");
  }
  const sim = await readSimulationPlaneEnabled();
  const where = {
    id: threatId,
    tenantCompanyId: companyId,
    status: { in: CLEARANCE_QUEUE_STATUSES },
  };
  const threat = sim
    ? await prisma.simThreatEvent.findFirst({ where, select: clearanceThreatSelect })
    : await prisma.threatEvent.findFirst({ where, select: clearanceThreatSelect });
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
  if (companyId == null) {
    throw new Error("No company boundary for active tenant.");
  }
  const sim = await readSimulationPlaneEnabled();
  const where = { id: threatId, tenantCompanyId: companyId };
  const threat = sim
    ? await prisma.simThreatEvent.findFirst({ where, select: receiptThreatSelect })
    : await prisma.threatEvent.findFirst({ where, select: receiptThreatSelect });
  if (!threat) {
    throw new Error("Threat not found or tenant isolation denied.");
  }
  return { mode: sim ? "sim" : "prod", threat, tenantUuid, companyId };
}
