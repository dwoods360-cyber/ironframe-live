'use server';

import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { ThreatState, type UserRole } from '@prisma/client';
import { createHash, createSign, createVerify } from 'crypto';
import prisma from '@/lib/prisma';
import { auditLogCreateLoose, auditLogCreateLooseTx } from "@/lib/auditLogLoose";
import { getActiveTenantUuidFromCookies } from '@/app/utils/serverTenantContext';
import { getSupabaseSessionUser } from '@/app/utils/serverAuth';
import {
  resolveDevConstitutionalAuthorityUserId,
} from '@/app/lib/grc/devConstitutionalElevation';
import { transitionThreatStatus, updateThreatWithIntegrity } from "@/src/services/threatStateService";

/** Meta-audit / Integrity Hub — professional GRC roles only. */
const META_AUDIT_ELIGIBLE_ROLES: UserRole[] = [
  'INTERNAL_AUDITOR',
  'EXTERNAL_AUDITOR',
  'GLOBAL_ADMIN',
  'CISO',
  'DIRECTOR_OF_COMPLIANCE',
  'GRC_MANAGER',
];

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

/** Tenant-scoped ledger rows for Audit Intelligence (dashboard + `/api/audit/ledger-feed`). */
export type AuditLedgerFeedRow = RecentAuditLogRow;

export async function fetchTenantAuditLedgerRows(
  tenantUuid: string,
  take = 100,
): Promise<AuditLedgerFeedRow[]> {
  const tid = tenantUuid.trim();
  if (!tid) return [];
  const rows = await prisma.auditLog.findMany({
    where: { tenantId: tid },
    orderBy: { createdAt: "desc" },
    take: Math.min(200, Math.max(1, take)),
    select: {
      id: true,
      action: true,
      operatorId: true,
      createdAt: true,
      threatId: true,
      simThreatId: true,
      justification: true,
    },
  });
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    operatorId: row.operatorId,
    threatId: row.threatId ?? row.simThreatId ?? null,
    justification: row.justification,
    createdAt: row.createdAt.toISOString(),
  }));
}

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
  options?: {
    isSimulation?: boolean;
    operatorId?: string;
    /** When set, audit row links to `SimThreatEvent` (`threatId` cleared). */
    simThreatId?: string | null;
  },
): Promise<void> {
  try {
    const simId = options?.simThreatId?.trim() || null;
    const linkSim = Boolean(simId);
    await auditLogCreateLoose({
      data: {
        action: actionName,
        justification: details,
        operatorId: options?.operatorId?.trim() || 'THREAT_ACTIVITY',
        threatId: linkSim ? null : threatId,
        simThreatId: linkSim ? simId : null,
        isSimulation: linkSim ? true : (options?.isSimulation ?? false),
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
  const fallbackOperator = process.env.DMZ_DISPOSITION_OPERATOR_ID?.trim() || 'SYSTEM';
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
        await transitionThreatStatus<{ id: string }>({
          threatId,
          newStatus: ThreatState.RESOLVED,
          actorUserId: operator,
          eventType: "AUDIT_DISPOSITION_RESOLVED",
          tx,
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
  const operator = operatorId.trim() || process.env.DMZ_DISPOSITION_OPERATOR_ID?.trim() || 'SYSTEM';
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

      await auditLogCreateLooseTx(tx, {
        data: {
          action: 'ADMINISTRATIVE_VOID',
          justification: `Administrative void on receipt ${rid}: ${reason}`,
          operatorId: operator,
          threatId: tid,
          isSimulation: false,
        },
      });

      const updatedThreat = await updateThreatWithIntegrity<{
        id: string;
        title: string;
        sourceAgent: string;
        score: number | null;
        targetEntity: string | null;
        financialRisk_cents: bigint;
        createdAt: Date;
        assigneeId: string | null;
        ingestionDetails: Prisma.JsonValue | null;
        aiReport: string | null;
        ttlSeconds: number | null;
        status: ThreatState;
        remoteTechId: string | null;
        isRemoteAccessAuthorized: boolean | null;
      }>({
        threatId: tid,
        changes: { status: ThreatState.CONFIRMED },
        actorUserId: operator,
        eventType: "ADMINISTRATIVE_VOID_REACTIVATED",
        tx,
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
          score: updatedThreat.score ?? loss,
          industry: updatedThreat.targetEntity ?? undefined,
          source: updatedThreat.sourceAgent,
          description,
          createdAt: updatedThreat.createdAt.toISOString(),
          assignedTo: updatedThreat.assigneeId ?? undefined,
          ingestionDetails:
            typeof updatedThreat.ingestionDetails === "string"
              ? updatedThreat.ingestionDetails
              : updatedThreat.ingestionDetails != null
                ? JSON.stringify(updatedThreat.ingestionDetails)
                : undefined,
          aiReport: updatedThreat.aiReport ?? null,
          ttlSeconds: updatedThreat.ttlSeconds ?? null,
          threatStatus: String(updatedThreat.status),
          remoteTechId: updatedThreat.remoteTechId ?? null,
          isRemoteAccessAuthorized: updatedThreat.isRemoteAccessAuthorized ?? undefined,
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

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export type MetaAuditExportData = {
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  integrityEvents: Array<Record<string, JsonValue>>;
  threatApprovals: Array<Record<string, JsonValue>>;
  evidenceArtifacts: Array<Record<string, JsonValue>>;
};

export type MetaAuditExportBundle = {
  exportId: string;
  data: MetaAuditExportData;
  manifestHash: string;
  publicKeyId: string;
  signature: string;
};

function toJsonSafe(value: unknown): JsonValue {
  if (value == null) return null;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((v) => toJsonSafe(v));
  if (typeof value === 'object') {
    const out: Record<string, JsonValue> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = toJsonSafe(v);
    }
    return out;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return String(value);
}

function sortKeysDeep(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map((entry) => sortKeysDeep(entry));
  if (value && typeof value === 'object') {
    const sorted: Record<string, JsonValue> = {};
    for (const key of Object.keys(value as Record<string, JsonValue>).sort((a, b) => a.localeCompare(b))) {
      sorted[key] = sortKeysDeep((value as Record<string, JsonValue>)[key]);
    }
    return sorted;
  }
  return value;
}

function deterministicStringify(input: JsonValue): string {
  return JSON.stringify(sortKeysDeep(input));
}

function hashSha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function normalizePemValue(raw: string): string {
  return raw.replace(/\\n/g, '\n').trim();
}

function getActiveSigningKeyConfig():
  | { privateKeyPem: string; publicKeyId: string }
  | { error: string } {
  const privateKeyRaw = process.env.PRIVATE_KEY?.trim() ?? '';
  const publicKeyId = process.env.PUBLIC_KEY_ID?.trim() ?? '';
  if (!privateKeyRaw) return { error: 'Missing PRIVATE_KEY for export signing.' };
  if (!publicKeyId) return { error: 'Missing PUBLIC_KEY_ID for export signing.' };
  return {
    privateKeyPem: normalizePemValue(privateKeyRaw),
    publicKeyId,
  };
}

function resolvePublicKeyPemById(publicKeyId: string): string | null {
  const normalizedId = publicKeyId.trim();
  if (!normalizedId) return null;
  const upper = normalizedId.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  const dynamicEnvKey = `PUBLIC_KEY_${upper}`;
  const fromDynamic = process.env[dynamicEnvKey]?.trim();
  if (fromDynamic) return normalizePemValue(fromDynamic);
  const configuredId = process.env.PUBLIC_KEY_ID?.trim();
  const fallback = process.env.PUBLIC_KEY?.trim();
  if (configuredId === normalizedId && fallback) return normalizePemValue(fallback);
  return null;
}

function signManifest(manifestHash: string): string {
  const signingConfig = getActiveSigningKeyConfig();
  if ('error' in signingConfig) throw new Error(signingConfig.error);
  const signer = createSign('RSA-SHA256');
  signer.update(manifestHash);
  signer.end();
  return signer.sign(signingConfig.privateKeyPem, 'base64');
}

async function ensureAuditorOrAdminRole(tenantId: string): Promise<{ userId: string } | null> {
  const sessionUser = await getSupabaseSessionUser();
  const devUid = await resolveDevConstitutionalAuthorityUserId(sessionUser, tenantId);
  if (devUid) return { userId: devUid };

  const userId = sessionUser?.id?.trim() || sessionUser?.email?.trim() || "";
  if (!userId) return null;
  const assignment = await prisma.userRoleAssignment.findFirst({
    where: {
      userId,
      tenantId,
      role: { in: [...META_AUDIT_ELIGIBLE_ROLES] },
    },
    select: { id: true },
  });
  if (!assignment?.id) return null;
  return { userId };
}

export async function generateSignedExport(
  tenantId: string,
  periodStart: string,
  periodEnd: string,
): Promise<{ ok: true; bundle: MetaAuditExportBundle } | { ok: false; error: string }> {
  const tid = tenantId.trim();
  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);
  if (!tid) return { ok: false, error: 'tenantId is required.' };
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { ok: false, error: 'Invalid date range.' };
  }
  if (startDate > endDate) return { ok: false, error: 'periodStart must be before periodEnd.' };

  try {
    const role = await ensureAuditorOrAdminRole(tid);
    if (!role) return { ok: false, error: 'Auditor or global admin role required.' };

    const [integrityEvents, threatApprovals, evidenceArtifacts] = await Promise.all([
      (prisma as any).integrityEvent.findMany({
        where: { tenantId: tid, createdAt: { gte: startDate, lte: endDate } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
      (prisma as any).threatApproval.findMany({
        where: { tenantId: tid, createdAt: { gte: startDate, lte: endDate } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
      prisma.evidenceArtifact.findMany({
        where: { tenantId: tid, createdAt: { gte: startDate, lte: endDate } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
    ]);

    const data: MetaAuditExportData = {
      tenantId: tid,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      generatedAt: new Date().toISOString(),
      integrityEvents: toJsonSafe(integrityEvents) as Array<Record<string, JsonValue>>,
      threatApprovals: toJsonSafe(threatApprovals) as Array<Record<string, JsonValue>>,
      evidenceArtifacts: toJsonSafe(evidenceArtifacts) as Array<Record<string, JsonValue>>,
    };

    const canonicalJson = deterministicStringify(data);
    const manifestHash = hashSha256(canonicalJson);
    const signingConfig = getActiveSigningKeyConfig();
    if ('error' in signingConfig) {
      return { ok: false, error: signingConfig.error };
    }
    const signature = signManifest(manifestHash);

    const saved = await (prisma as any).integrityExport.create({
      data: {
        tenantId: tid,
        periodStart: startDate,
        periodEnd: endDate,
        manifestHash,
        publicKeyId: signingConfig.publicKeyId,
        signature,
        createdByUserId: role.userId,
      },
      select: { id: true },
    });

    return {
      ok: true,
      bundle: {
        exportId: saved.id as string,
        data,
        manifestHash,
        publicKeyId: signingConfig.publicKeyId,
        signature,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate export.';
    return { ok: false, error: message };
  }
}

export async function verifyExportManifest(
  exportBundle: MetaAuditExportBundle,
): Promise<{ isValid: boolean; message: string }> {
  try {
    const canonicalJson = deterministicStringify(toJsonSafe(exportBundle.data));
    const computedHash = hashSha256(canonicalJson);
    if (computedHash !== exportBundle.manifestHash) {
      return { isValid: false, message: 'Manifest hash mismatch: bundle data was modified.' };
    }
    const publicKeyPem = resolvePublicKeyPemById(exportBundle.publicKeyId);
    if (!publicKeyPem) {
      return { isValid: false, message: `Verification key not configured for key id: ${exportBundle.publicKeyId}` };
    }
    const verifier = createVerify('RSA-SHA256');
    verifier.update(exportBundle.manifestHash);
    verifier.end();
    const signatureOk = verifier.verify(publicKeyPem, exportBundle.signature, 'base64');
    if (!signatureOk) {
      return { isValid: false, message: 'Signature mismatch: invalid signing key or tampered hash.' };
    }
    return { isValid: true, message: 'Export is valid. Hash and signature verified.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verification failed.';
    return { isValid: false, message };
  }
}

export async function getMetaAuditConsoleAccess(): Promise<{
  canAccess: boolean;
  tenantId: string | null;
}> {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) return { canAccess: false, tenantId: null };
  const role = await ensureAuditorOrAdminRole(tenantId);
  return { canAccess: role != null, tenantId };
}

/** Bank Vault rows for Integrity Hub / audit page (hash chain metadata only — payloads are not persisted). */
export type IntegrityLedgerRow = {
  id: string;
  createdAt: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorUserId: string;
  source: string;
  payloadHash: string;
  prevEventHash: string | null;
  eventHash: string;
};

/**
 * Latest `IntegrityEvent` rows for the active tenant (Meta-Audit eligible roles only).
 */
export async function listIntegrityLedgerForMetaAudit(
  tenantId: string,
  limit = 75,
): Promise<IntegrityLedgerRow[]> {
  const tid = tenantId.trim();
  if (!tid) return [];
  const role = await ensureAuditorOrAdminRole(tid);
  if (!role) return [];

  const take = Math.min(200, Math.max(1, limit));
  const rows = await prisma.integrityEvent.findMany({
    where: { tenantId: tid },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
    select: {
      id: true,
      createdAt: true,
      eventType: true,
      entityType: true,
      entityId: true,
      actorUserId: true,
      source: true,
      payloadHash: true,
      prevEventHash: true,
      eventHash: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    eventType: r.eventType,
    entityType: r.entityType,
    entityId: r.entityId,
    actorUserId: r.actorUserId,
    source: r.source,
    payloadHash: r.payloadHash,
    prevEventHash: r.prevEventHash,
    eventHash: r.eventHash,
  }));
}
