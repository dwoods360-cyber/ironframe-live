'use server';

import prisma from '@/lib/prisma';
import { getActiveTenantUuidFromCookies } from '@/app/utils/serverTenantContext';

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
  threatId: string | null,
  actionName: string,
  details: string,
  options?: { isSimulation?: boolean },
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: actionName,
        justification: details,
        operatorId: 'THREAT_ACTIVITY',
        threatId,
        isSimulation: options?.isSimulation ?? false,
      },
    });
  } catch (error) {
    console.error('[AUDIT_LOG_ERROR] Failed to record activity:', error);
  }
}
