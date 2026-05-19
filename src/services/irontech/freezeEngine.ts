import "server-only";

import prisma from "@/lib/prisma";
import { computeSustainabilityStaleLockdown } from "@/app/config/sustainabilityStaleLockdown";
import { findRiskRegistryByThreatEventId } from "@/app/lib/riskRegistryDb";
import { parseIngestionDetailsObject } from "@/app/utils/riskCardEnrichment";
import {
  executeAutonomousStateFreeze,
  getSovereignCheckpointChannelValues,
  getTenantBoundCheckpointTuple,
  type OperationalStateFreezeResult,
} from "@/src/services/orchestration/checkpointer";

export type IrontechFreezeEngineSnapshot = {
  /** True when sustainability live API degraded ≥24h and no tripartite stale-data waiver. */
  isSystemFrozen: boolean;
  staleDataLockdownWindow: boolean;
  hoursDegraded: number | null;
  degradedSinceIso: string | null;
  /** Wall-clock ms since `sustainabilityApiDegradedSince`, when degraded. */
  degradedDurationMs: number | null;
  /** Ironlock global mutation freeze (`SystemConfig.stateFreezeActive`). */
  globalSecurityFreezeActive: boolean;
};

export type PersistedHaltState = {
  tenantId: string;
  threadId: string | null;
  langGraphChannelValues: Record<string, unknown> | null;
  langGraphCheckpointId: string | null;
  riskRegistry: {
    id: string;
    lifecycleStatus: string;
    financialImpactCents: string | null;
    rawAuditMarkdown: string | null;
    ironscribeSealedAt: string | null;
  } | null;
};

export type SystemHaltResult = {
  snapshot: IrontechFreezeEngineSnapshot;
  persisted: PersistedHaltState;
  operationalFreeze: OperationalStateFreezeResult | null;
  /** True when any halt path is active (stale lockdown, global freeze, or thread checkpoint sealed). */
  haltActive: boolean;
};

/**
 * Irontech (Agent 12) freeze engine — central read for middleware + internal gates.
 * All halt evaluation uses Postgres (`PostgresSaver`) and `risk_registry`, not in-memory maps.
 */
export async function getIrontechFreezeEngineSnapshot(
  nowMs: number = Date.now(),
): Promise<IrontechFreezeEngineSnapshot> {
  const row = await prisma.systemConfig.findUnique({
    where: { id: "global" },
    select: {
      sustainabilityLiveApiDegraded: true,
      sustainabilityApiDegradedSince: true,
      sustainabilityStaleLockdownWaived: true,
      stateFreezeActive: true,
    },
  });
  const lock = computeSustainabilityStaleLockdown(row, nowMs);
  const since = row?.sustainabilityApiDegradedSince;
  const degradedDurationMs =
    row?.sustainabilityLiveApiDegraded === true && since ? nowMs - since.getTime() : null;
  return {
    isSystemFrozen: lock.blockingMutations,
    staleDataLockdownWindow: lock.staleDataLockdownWindow,
    hoursDegraded: lock.hoursDegraded,
    degradedSinceIso: since?.toISOString() ?? null,
    degradedDurationMs,
    globalSecurityFreezeActive: row?.stateFreezeActive === true,
  };
}

function registryForensicSlice(
  tenantId: string,
  threadId: string | null,
): Promise<PersistedHaltState["riskRegistry"]> {
  if (!threadId) return Promise.resolve(null);
  return findRiskRegistryByThreatEventId(threadId, tenantId).then((row) => {
    if (!row) return null;
    const ingestion = parseIngestionDetailsObject(row.ingestionDetails);
    const cents =
      typeof ingestion.financialImpactCents === "string"
        ? ingestion.financialImpactCents
        : row.telemetryValue?.trim() || null;
    const rawAuditMarkdown =
      typeof ingestion.rawAuditMarkdown === "string" ? ingestion.rawAuditMarkdown : null;
    const ironscribeSealedAt =
      typeof ingestion.ironscribeSealedAt === "string" ? ingestion.ironscribeSealedAt : null;
    return {
      id: row.id,
      lifecycleStatus: row.lifecycleStatus,
      financialImpactCents: cents,
      rawAuditMarkdown,
      ironscribeSealedAt,
    };
  });
}

/**
 * Hydrate halt context from Postgres LangGraph checkpoints + tenant-scoped risk_registry.
 */
export async function loadPersistedHaltState(input: {
  tenantId: string;
  threadId?: string | null;
}): Promise<PersistedHaltState> {
  const tenantId = input.tenantId.trim();
  const threadId = input.threadId?.trim() || null;

  let langGraphChannelValues: Record<string, unknown> | null = null;
  let langGraphCheckpointId: string | null = null;

  if (tenantId && threadId) {
    langGraphChannelValues = await getSovereignCheckpointChannelValues(threadId, tenantId);
    const tuple = await getTenantBoundCheckpointTuple(threadId, tenantId);
    langGraphCheckpointId = tuple?.checkpoint?.id ?? null;
  }

  const riskRegistry = await registryForensicSlice(tenantId, threadId);

  return {
    tenantId,
    threadId,
    langGraphChannelValues,
    langGraphCheckpointId,
    riskRegistry,
  };
}

/**
 * Execute a system halt: reads global sustainability/global freeze flags, then seals
 * LangGraph state in Postgres and loads forensic registry rows for the tenant thread.
 */
export async function executeSystemHalt(input: {
  tenantId: string;
  threadId?: string | null;
}): Promise<SystemHaltResult> {
  const snapshot = await getIrontechFreezeEngineSnapshot();
  const tenantId = input.tenantId.trim();
  const threadId = input.threadId?.trim() || null;

  let operationalFreeze: OperationalStateFreezeResult | null = null;
  if (tenantId && threadId) {
    operationalFreeze = await executeAutonomousStateFreeze(threadId, tenantId);
  }

  const persisted = await loadPersistedHaltState({ tenantId, threadId });
  if (operationalFreeze) {
    persisted.langGraphCheckpointId = operationalFreeze.checkpointId;
  }

  const haltActive =
    snapshot.isSystemFrozen ||
    snapshot.globalSecurityFreezeActive ||
    operationalFreeze != null;

  return {
    snapshot,
    persisted,
    operationalFreeze,
    haltActive,
  };
}
