import "server-only";

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { logStructuredEvent } from "@/lib/structuredServerLog";
import type { RiskLifecycleStatus, RiskRegistryRecord } from "@/app/types/riskLifecycle";
import { RISK_LIFECYCLE_ORDER } from "@/app/types/riskLifecycle";
import { deltaLabelForLifecycle } from "@/app/utils/riskRegistryCardMap";

/** ISO instant persisted in `ingestion_details` when the forensic gavel strikes (Supabase risk_registry). */
export const RISK_REGISTRY_RESOLVED_AT_JSON_KEY = "registryResolvedAt";

type RiskRegistryRow = {
  id: string;
  tenantId: string;
  title: string;
  telemetryValue: string;
  deltaLabel: string;
  sourceAgent: string;
  lifecycleStatus: RiskLifecycleStatus;
  riskEventId: string | null;
  ingestionDetails: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type RiskRegistryPrismaDelegate = {
  create: (args: unknown) => Promise<RiskRegistryRow>;
  findFirst: (args: unknown) => Promise<RiskRegistryRow | null>;
  findMany: (args: unknown) => Promise<RiskRegistryRow[]>;
  update: (args: unknown) => Promise<RiskRegistryRow>;
};

const LIFECYCLE_STATUS_FILTER: RiskLifecycleStatus[] = [...RISK_LIFECYCLE_ORDER];

let missingClientWarned = false;

/** Stringify Prisma `Json` objects before UI / scoring pipelines (prevents `.trim()` on objects). */
export function sanitizeIngestionDetailsForUi(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof raw === "object") {
    try {
      return JSON.stringify(raw);
    } catch {
      return null;
    }
  }
  const scalar = String(raw).trim();
  return scalar.length > 0 ? scalar : null;
}

function isMissingRiskRegistryTable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  return (
    e.code === "P2021" ||
    String(e.message ?? "").includes("risk_registry") ||
    String(e.message ?? "").includes("RiskRegistry")
  );
}

function isStaleDelegateError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("findMany") && msg.includes("undefined");
}

function riskRegistryDelegate(): RiskRegistryPrismaDelegate | null {
  const candidate = (prisma as unknown as { riskRegistry?: RiskRegistryPrismaDelegate }).riskRegistry;
  if (!candidate || typeof candidate.findMany !== "function") return null;
  return candidate;
}

function warnMissingRiskRegistryClient(): void {
  if (process.env.NODE_ENV === "production" || missingClientWarned) return;
  missingClientWarned = true;
  logStructuredEvent(
    "risk_registry",
    "prisma_delegate_missing",
    {
      hint: "Stop the dev server, run `npx prisma generate`, delete `.next`, then restart.",
    },
    "warn",
  );
}

function readRegistryResolvedAtFromIngestion(ingestionDetails: unknown): string | null {
  if (ingestionDetails == null) return null;
  try {
    const raw =
      typeof ingestionDetails === "string"
        ? (JSON.parse(ingestionDetails) as Record<string, unknown>)
        : (ingestionDetails as Record<string, unknown>);
    const v = raw[RISK_REGISTRY_RESOLVED_AT_JSON_KEY];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

function sanitizeRecord(row: RiskRegistryRow): RiskRegistryRecord {
  const ingestionResolvedAt = readRegistryResolvedAtFromIngestion(row.ingestionDetails);
  return {
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    telemetryValue: row.telemetryValue,
    deltaLabel: row.deltaLabel,
    sourceAgent: row.sourceAgent,
    lifecycleStatus: row.lifecycleStatus,
    riskEventId: row.riskEventId,
    ingestionDetails: sanitizeIngestionDetailsForUi(row.ingestionDetails),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    resolvedAt:
      row.lifecycleStatus === "RESOLVED"
        ? ingestionResolvedAt ?? row.updatedAt.toISOString()
        : null,
  };
}

function mapRawRow(row: {
  id: string;
  tenant_id: string;
  title: string;
  telemetry_value: string;
  delta_label: string;
  source_agent: string;
  lifecycle_status: string;
  risk_event_id: string | null;
  ingestion_details: unknown;
  created_at: Date;
  updated_at: Date;
}): RiskRegistryRecord {
  return sanitizeRecord({
    id: row.id,
    tenantId: row.tenant_id,
    title: row.title,
    telemetryValue: row.telemetry_value,
    deltaLabel: row.delta_label,
    sourceAgent: row.source_agent,
    lifecycleStatus: row.lifecycle_status as RiskLifecycleStatus,
    riskEventId: row.risk_event_id,
    ingestionDetails: row.ingestion_details,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

async function listRiskRegistryRawSql(
  tenantId: string,
  limit: number,
): Promise<RiskRegistryRecord[]> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        tenant_id: string;
        title: string;
        telemetry_value: string;
        delta_label: string;
        source_agent: string;
        lifecycle_status: string;
        risk_event_id: string | null;
        ingestion_details: unknown;
        created_at: Date;
        updated_at: Date;
      }>
    >(Prisma.sql`
      SELECT
        id,
        tenant_id,
        title,
        telemetry_value,
        delta_label,
        source_agent,
        lifecycle_status::text AS lifecycle_status,
        risk_event_id,
        ingestion_details,
        created_at,
        updated_at
      FROM risk_registry
      WHERE tenant_id = CAST(${tenantId} AS uuid)
        AND lifecycle_status::text IN ('INGESTED', 'REGISTERED', 'ACTIVE', 'RESOLVED')
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);
    return rows.map(mapRawRow);
  } catch (err) {
    if (isMissingRiskRegistryTable(err)) return [];
    throw err;
  }
}

export async function insertRiskRegistryIngested(input: {
  tenantId: string;
  title: string;
  telemetryValue: string;
  sourceAgent: string;
  ingestionDetails?: unknown;
  deltaLabel?: string;
}): Promise<RiskRegistryRecord | null> {
  const registry = riskRegistryDelegate();
  if (!registry) {
    warnMissingRiskRegistryClient();
    return null;
  }
  try {
    const row = await registry.create({
      data: {
        tenantId: input.tenantId,
        title: input.title.slice(0, 240),
        telemetryValue: input.telemetryValue.slice(0, 120),
        sourceAgent: input.sourceAgent.slice(0, 64),
        lifecycleStatus: "INGESTED",
        deltaLabel: input.deltaLabel ?? "Sensing…",
        ingestionDetails:
          input.ingestionDetails === undefined
            ? undefined
            : (input.ingestionDetails as Prisma.InputJsonValue),
      },
    });
    return sanitizeRecord(row);
  } catch (err) {
    if (isMissingRiskRegistryTable(err) || isStaleDelegateError(err)) return null;
    throw err;
  }
}

export async function findRiskRegistryById(
  riskId: string,
  tenantId: string,
): Promise<RiskRegistryRecord | null> {
  const registry = riskRegistryDelegate();
  if (!registry) {
    warnMissingRiskRegistryClient();
    return null;
  }
  try {
    const row = await registry.findFirst({
      where: { id: riskId, tenantId },
    });
    return row ? sanitizeRecord(row) : null;
  } catch (err) {
    if (isMissingRiskRegistryTable(err) || isStaleDelegateError(err)) return null;
    throw err;
  }
}

/** Link ThreatEvent / chaos row → registry queue RESOLVED + immutable `registryResolvedAt` stamp. */
export async function resolveRiskRegistryForThreatEvent(input: {
  threatEventId: string;
  tenantId: string;
  resolvedAtIso: string;
}): Promise<RiskRegistryRecord[]> {
  const threatEventId = input.threatEventId.trim();
  const tenantId = input.tenantId.trim();
  if (!threatEventId || !tenantId) return [];

  const registry = riskRegistryDelegate();
  if (!registry) {
    warnMissingRiskRegistryClient();
    return [];
  }

  const resolvedAtIso = input.resolvedAtIso.trim();
  const updated: RiskRegistryRecord[] = [];

  try {
    const rows = await registry.findMany({
      where: { tenantId, riskEventId: threatEventId },
    });
    for (const row of rows) {
      let ingestionPatch: Record<string, unknown> = {};
      try {
        const prev =
          row.ingestionDetails == null
            ? {}
            : typeof row.ingestionDetails === "string"
              ? (JSON.parse(row.ingestionDetails) as Record<string, unknown>)
              : (row.ingestionDetails as Record<string, unknown>);
        ingestionPatch = {
          ...prev,
          [RISK_REGISTRY_RESOLVED_AT_JSON_KEY]: resolvedAtIso,
        };
      } catch {
        ingestionPatch = { [RISK_REGISTRY_RESOLVED_AT_JSON_KEY]: resolvedAtIso };
      }

      const next = await registry.update({
        where: { id: row.id },
        data: {
          lifecycleStatus: "RESOLVED",
          deltaLabel: deltaLabelForLifecycle("RESOLVED"),
          ingestionDetails: ingestionPatch as Prisma.InputJsonValue,
        },
      });
      if (next.tenantId === tenantId) {
        updated.push(sanitizeRecord(next));
      }
    }
  } catch (err) {
    if (isMissingRiskRegistryTable(err) || isStaleDelegateError(err)) return [];
    throw err;
  }

  return updated;
}

export async function updateRiskRegistry(
  riskId: string,
  tenantId: string,
  patch: {
    lifecycleStatus?: RiskLifecycleStatus;
    telemetryValue?: string;
    deltaLabel?: string;
    riskEventId?: string | null;
    ingestionDetails?: unknown;
  },
): Promise<RiskRegistryRecord | null> {
  const registry = riskRegistryDelegate();
  if (!registry) {
    warnMissingRiskRegistryClient();
    return null;
  }
  try {
    const row = await registry.update({
      where: { id: riskId },
      data: {
        ...(patch.lifecycleStatus ? { lifecycleStatus: patch.lifecycleStatus } : {}),
        ...(patch.telemetryValue !== undefined ? { telemetryValue: patch.telemetryValue } : {}),
        ...(patch.deltaLabel !== undefined ? { deltaLabel: patch.deltaLabel } : {}),
        ...(patch.riskEventId !== undefined ? { riskEventId: patch.riskEventId } : {}),
        ...(patch.ingestionDetails !== undefined
          ? { ingestionDetails: patch.ingestionDetails as Prisma.InputJsonValue }
          : {}),
      },
    });
    if (row.tenantId !== tenantId) return null;
    return sanitizeRecord(row);
  } catch (err) {
    if (isMissingRiskRegistryTable(err) || isStaleDelegateError(err)) return null;
    throw err;
  }
}

/**
 * Unified 4-stage lifecycle queue — all statuses, sanitized for UI/scoring.
 * Returns `[]` when the Prisma delegate is missing (never throws on undefined `.findMany`).
 */
export async function listRiskRegistryForTenant(
  tenantId: string,
  limit = 24,
): Promise<RiskRegistryRecord[]> {
  const prismaRiskRegistry = (prisma as unknown as { riskRegistry?: RiskRegistryPrismaDelegate })
    .riskRegistry;
  if (!prismaRiskRegistry) {
    warnMissingRiskRegistryClient();
    return [];
  }

  const registry = riskRegistryDelegate();
  if (!registry) {
    warnMissingRiskRegistryClient();
    try {
      return await listRiskRegistryRawSql(tenantId, limit);
    } catch {
      return [];
    }
  }

  try {
    const rows = await registry.findMany({
      where: {
        tenantId,
        lifecycleStatus: { in: LIFECYCLE_STATUS_FILTER },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(sanitizeRecord);
  } catch (err) {
    if (!isMissingRiskRegistryTable(err) && !isStaleDelegateError(err)) throw err;
    try {
      return await listRiskRegistryRawSql(tenantId, limit);
    } catch {
      return [];
    }
  }
}
