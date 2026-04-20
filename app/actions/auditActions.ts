'use server';

import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { ThreatState } from '@prisma/client';
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

export type LogTestCompletionInput = {
  tenantId: string;
  operator: string;
  botType: 'KIMBOT' | 'GRCBOT' | 'ATTBOT' | 'IRONTECH';
  disposition: 'PASS' | 'FAIL';
  threatId?: string;
  metadata?: Record<string, unknown>;
};

export type BotAuditLogRow = {
  id: string;
  createdAt: string;
  botType: string;
  disposition: string;
  tenantId: string;
  operator: string;
  metadata: Record<string, unknown> | null;
};

export type VoidReceiptAndReopenResult =
  | {
      ok: true;
      restoredAleMillions: number;
      reactivatedThreat: {
        id: string;
        name: string;
        loss: number;
        score: number;
        industry?: string;
        source?: string;
        description: string;
        createdAt: string;
        assignedTo?: string;
        ingestionDetails?: string;
        aiReport?: string | null;
        ttlSeconds?: number | null;
        threatStatus: string;
        remoteTechId?: string | null;
        isRemoteAccessAuthorized?: boolean;
        lifecycleState: 'active';
      };
    }
  | { ok: false; error: string };

/**
 * Permanent, immutable bot test disposition ledger entry.
 */
export async function logTestCompletion(data: LogTestCompletionInput): Promise<{ ok: true }> {
  const tenantId = data.tenantId?.trim();
  const fallbackOperator = process.env.DMZ_DISPOSITION_OPERATOR_ID?.trim() || 'SYSTEM_OPERATOR';
  const operator = data.operator?.trim() || fallbackOperator;
  const botType = data.botType?.trim();
  const disposition = data.disposition?.trim();
  const threatId = data.threatId?.trim() || null;

  if (!tenantId) {
    throw new Error('Missing tenantId for bot audit log.');
  }
  if (!botType) {
    throw new Error('Missing botType for bot audit log.');
  }
  if (!disposition) {
    throw new Error('Missing disposition for bot audit log.');
  }

  const incomingMetadata = (data.metadata ?? {}) as Record<string, unknown>;
  const parseNumeric = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };
  const baselineCents = parseNumeric(incomingMetadata.aleBaselineBeforeCents) ?? 0;
  const outcomeCents = parseNumeric(incomingMetadata.aleOutcomeAfterCents) ?? baselineCents;
  const initialAle =
    parseNumeric(incomingMetadata.initialAle) ?? Number((baselineCents / 100_000_000).toFixed(2));
  const finalAle =
    parseNumeric(incomingMetadata.finalAle) ?? Number((outcomeCents / 100_000_000).toFixed(2));
  const aleMitigated =
    parseNumeric(incomingMetadata.aleMitigated) ?? Number((initialAle - finalAle).toFixed(2));
  const enrichedMetadata: Record<string, unknown> = {
    ...incomingMetadata,
    initialAle,
    finalAle,
    aleMitigated,
  };

  try {
    console.log('[AUDIT_WRITE_ATTEMPT]', data.botType, data.tenantId);
    if (threatId) {
      await prisma.$transaction(async (tx) => {
        const threatRow = await tx.threatEvent.findUnique({
          where: { id: threatId },
          select: {
            financialRisk_cents: true,
            tenantCompanyId: true,
            status: true,
            sourceAgent: true,
          },
        });
        const threatFinancialRiskCents = threatRow?.financialRisk_cents ?? 0n;
        const baselineBeforeCents =
          parseNumeric(enrichedMetadata.aleBaselineBeforeCents) ?? Number(threatFinancialRiskCents);
        const outcomeAfterCents = parseNumeric(enrichedMetadata.aleOutcomeAfterCents) ?? 0;
        const activeThreatCountBefore =
          threatRow?.tenantCompanyId != null
            ? await tx.threatEvent.count({
                where: {
                  tenantCompanyId: threatRow.tenantCompanyId,
                  status: { not: ThreatState.RESOLVED },
                },
              })
            : 1;
        const eventCountsFallback = {
          baseline: { activeThreats: Math.max(activeThreatCountBefore, 1), pipelineThreats: 0 },
          outcome: { activeThreats: Math.max(activeThreatCountBefore - 1, 0), pipelineThreats: 0 },
          delta: { activeThreats: -1, pipelineThreats: 0 },
        };
        const incomingTenantBreakdown =
          enrichedMetadata.tenantBreakdown &&
          typeof enrichedMetadata.tenantBreakdown === 'object' &&
          !Array.isArray(enrichedMetadata.tenantBreakdown)
            ? (enrichedMetadata.tenantBreakdown as Record<string, unknown>)
            : null;
        const tenantBreakdown =
          incomingTenantBreakdown ??
          ({
            [tenantId]: {
              before: baselineBeforeCents,
              after: outcomeAfterCents,
            },
          } as Record<string, unknown>);
        const metadataWithThreatFinancials = {
          ...enrichedMetadata,
          threatId,
          sourceAgent: threatRow?.sourceAgent ?? null,
          statusBeforeResolution: threatRow?.status ?? null,
          activeThreatCount: 1,
          tenantBreakdown,
          eventCounts:
            enrichedMetadata.eventCounts && typeof enrichedMetadata.eventCounts === 'object'
              ? enrichedMetadata.eventCounts
              : eventCountsFallback,
          aleBaselineBeforeCents:
            typeof enrichedMetadata.aleBaselineBeforeCents === 'string'
              ? enrichedMetadata.aleBaselineBeforeCents
              : baselineBeforeCents.toString(),
          aleOutcomeAfterCents:
            typeof enrichedMetadata.aleOutcomeAfterCents === 'string'
              ? enrichedMetadata.aleOutcomeAfterCents
              : outcomeAfterCents.toString(),
          financialRisk_cents:
            typeof enrichedMetadata.financialRisk_cents === 'string'
              ? enrichedMetadata.financialRisk_cents
              : threatFinancialRiskCents.toString(),
          mitigatedValueCents:
            typeof enrichedMetadata.mitigatedValueCents === 'string'
              ? enrichedMetadata.mitigatedValueCents
              : threatFinancialRiskCents.toString(),
          irontrustExposureSync: 'RECORDED',
        } as Record<string, unknown>;
        await tx.botAuditLog.create({
          data: {
            tenantId,
            operator,
            botType,
            disposition,
            metadata: metadataWithThreatFinancials as Prisma.InputJsonValue,
          },
        });
        await tx.threatEvent.update({
          where: { id: threatId },
          data: { status: ThreatState.RESOLVED },
          select: { id: true },
        });
      });
    } else {
      await prisma.botAuditLog.create({
        data: {
          tenantId,
          operator,
          botType,
          disposition,
          metadata: enrichedMetadata as Prisma.InputJsonValue,
        },
      });
    }
    console.log('[AUDIT_WRITE_SUCCESS]', data.botType);
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    if (raw.includes('BotAuditLog') && (raw.includes('does not exist') || raw.includes('relation'))) {
      const missingTableError =
        '[BOT_AUDIT_LOG] Missing Database Table `BotAuditLog`. Create/apply migration before completing test reviews.';
      console.error(missingTableError, error);
      throw new Error(missingTableError);
    }
    throw error;
  }

  revalidatePath('/');
  revalidatePath('/settings/config');
  revalidatePath('/api/threats/active');

  return { ok: true };
}

export async function getRecentBotAuditLogs(limit = 20): Promise<BotAuditLogRow[]> {
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  try {
    const rows = await prisma.botAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
      select: {
        id: true,
        createdAt: true,
        botType: true,
        disposition: true,
        tenantId: true,
        operator: true,
        metadata: true,
      },
    });
    return rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      botType: row.botType,
      disposition: row.disposition,
      tenantId: row.tenantId,
      operator: row.operator,
      metadata:
        row.metadata && typeof row.metadata === 'object'
          ? (row.metadata as Record<string, unknown>)
          : null,
    }));
  } catch (error) {
    console.warn('[BOT_AUDIT_LOG] Read failed; returning empty history.', error);
    return [];
  }
}

export async function voidReceiptAndReopen(
  receiptId: string,
  threatId: string,
  voidReason: string,
  operatorId: string,
): Promise<VoidReceiptAndReopenResult> {
  const rid = receiptId.trim();
  const tid = threatId.trim();
  const reason = voidReason.trim();
  const operator = operatorId.trim() || process.env.DMZ_DISPOSITION_OPERATOR_ID?.trim() || 'SYSTEM_OPERATOR';
  if (!rid || !tid || !reason) {
    return { ok: false, error: 'Missing required void fields (receiptId, threatId, reason).' };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const row = await tx.botAuditLog.findUnique({
        where: { id: rid },
        select: {
          id: true,
          tenantId: true,
          metadata: true,
        },
      });
      if (!row) {
        throw new Error('Receipt not found.');
      }

      const metadata =
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? ({ ...(row.metadata as Record<string, unknown>) } as Record<string, unknown>)
          : {};
      const parseNumeric = (value: unknown): number | null => {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string' && value.trim() !== '') {
          const parsed = Number(value);
          return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
      };
      const initialAle = parseNumeric(metadata.initialAle);
      const finalAle = parseNumeric(metadata.finalAle);
      const aleMitigated =
        parseNumeric(metadata.aleMitigated) ??
        (initialAle != null && finalAle != null ? Number((initialAle - finalAle).toFixed(2)) : 0);
      const existingVoidHistory = Array.isArray(metadata.voidHistory) ? metadata.voidHistory : [];
      const voidEntry = {
        at: new Date().toISOString(),
        operator,
        reason,
        threatId: tid,
      };
      const nextMetadata: Record<string, unknown> = {
        ...metadata,
        auditStatus: 'VOIDED',
        voidReason: reason,
        voidedAtIso: voidEntry.at,
        voidedBy: operator,
        voidHistory: [...existingVoidHistory, voidEntry],
      };

      await tx.botAuditLog.update({
        where: { id: rid },
        data: {
          metadata: nextMetadata as Prisma.InputJsonValue,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'ADMINISTRATIVE_VOID',
          justification: `Administrative void on receipt ${rid}: ${reason}`,
          operatorId: operator,
          threatId: tid,
          isSimulation: false,
        },
      });

      const updatedThreat = await tx.threatEvent.update({
        where: { id: tid },
        data: { status: ThreatState.ACTIVE },
        select: {
          id: true,
          title: true,
          sourceAgent: true,
          score: true,
          targetEntity: true,
          financialRisk_cents: true,
          createdAt: true,
          assigneeId: true,
          ingestionDetails: true,
          aiReport: true,
          ttlSeconds: true,
          status: true,
          remoteTechId: true,
          isRemoteAccessAuthorized: true,
        },
      });

      const loss = Number(updatedThreat.financialRisk_cents ?? BigInt(0)) / 100_000_000;
      const description =
        updatedThreat.aiReport?.trim() && updatedThreat.aiReport.trim().length > 0
          ? updatedThreat.aiReport
          : `Liability: $${loss.toFixed(1)}M · ${updatedThreat.sourceAgent}`;
      return {
        restoredAleMillions: Math.max(0, aleMitigated),
        reactivatedThreat: {
          id: updatedThreat.id,
          name: updatedThreat.title,
          loss,
          score: updatedThreat.score,
          industry: updatedThreat.targetEntity,
          source: updatedThreat.sourceAgent,
          description,
          createdAt: updatedThreat.createdAt.toISOString(),
          assignedTo: updatedThreat.assigneeId ?? undefined,
          ingestionDetails: updatedThreat.ingestionDetails ?? undefined,
          aiReport: updatedThreat.aiReport ?? null,
          ttlSeconds: updatedThreat.ttlSeconds ?? null,
          threatStatus: String(updatedThreat.status),
          remoteTechId: updatedThreat.remoteTechId ?? null,
          isRemoteAccessAuthorized: updatedThreat.isRemoteAccessAuthorized,
          lifecycleState: 'active' as const,
        },
      };
    });

    revalidatePath('/');
    revalidatePath('/api/threats/active');
    return {
      ok: true,
      restoredAleMillions: result.restoredAleMillions,
      reactivatedThreat: result.reactivatedThreat,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Administrative void failed.',
    };
  }
}
