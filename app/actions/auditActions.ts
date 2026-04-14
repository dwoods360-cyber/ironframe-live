'use server';

import prisma from '@/lib/prisma';
import { SIMULATION_SIGNATURES } from '@/app/config/constants';
import { getActiveTenantUuidFromCookies } from '@/app/utils/serverTenantContext';

function isSimulationSourceOrTitle(source?: string | null, title?: string | null): boolean {
  const s = (source ?? "").toLowerCase();
  const t = (title ?? "").toLowerCase();
  return SIMULATION_SIGNATURES.some((sig) => s.includes(sig) || t.includes(sig));
}

async function getCompanyIdForActiveTenant(): Promise<bigint | null> {
  const tenantUuid = await getActiveTenantUuidFromCookies();
  const company = await prisma.company.findFirst({
    where: { tenantId: tenantUuid },
    select: { id: true },
  });
  return company?.id ?? null;
}

/** Serializable audit row for Client Components (RSC / server actions). */
export type RecentAuditLogRow = {
  id: string;
  action: string;
  createdAt: string;
  operatorId: string;
  threatId: string | null;
  justification: string | null;
};

/** Bot audit ledger row consumed by dashboard client components. */
export type BotAuditLogRow = {
  id: string;
  botType: string;
  disposition: string;
  operator: string;
  tenantId: string;
  createdAt: string | Date;
  metadata: Record<string, unknown> | null;
};

/**
 * Latest AuditLog rows for the active tenant (via linked ThreatEvent.tenantCompanyId).
 */
export async function getRecentAuditLogs(limit = 5): Promise<RecentAuditLogRow[]> {
  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) {
    return [];
  }

  const rows = await prisma.auditLog.findMany({
    where: {
      threat: { tenantCompanyId: companyId },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      action: true,
      createdAt: true,
      operatorId: true,
      threatId: true,
      justification: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    createdAt: r.createdAt.toISOString(),
    operatorId: r.operatorId,
    threatId: r.threatId,
    justification: r.justification,
  }));
}

/**
 * Universal audit logger: records every action taken on a threat card for the Audit Intelligence stream.
 * Does not throw; logs errors to console.
 */
export async function logThreatActivity(
  threatId: string,
  actionName: string,
  details: string,
): Promise<void> {
  try {
    const threat = await prisma.threatEvent.findUnique({
      where: { id: threatId },
      select: { sourceAgent: true, title: true },
    });
    const isSimulation = isSimulationSourceOrTitle(threat?.sourceAgent ?? null, threat?.title ?? null);
    await prisma.auditLog.create({
      data: {
        action: actionName,
        justification: details,
        operatorId: 'THREAT_ACTIVITY',
        threatId,
        isSimulation,
      },
    });
  } catch (error) {
    console.error('[AUDIT_LOG_ERROR] Failed to record activity:', error);
  }
}
