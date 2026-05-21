import "server-only";

import { randomUUID } from "crypto";
import type { Checkpoint } from "@langchain/langgraph-checkpoint";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import { logStructuredEvent } from "@/lib/structuredServerLog";
import {
  healthBarRequiresTriage,
  normalizeTriageIncidentZone,
  type TriageIncidentZone,
} from "@/app/config/tasHealthTriage";
import { getPostgresCheckpointer } from "@/src/services/orchestration/checkpointer";
import {
  evaluateSystemTriage,
  type SystemTriageResult,
} from "@/src/services/irontech/triageRouter";

const IRONTECH_OPERATOR = "SYSTEM_AGENT_12_IRONTECH";

export type HealthPostureTriageInput = {
  tenantId: string;
  threadId: string;
  healthBarPercent: number;
  incidentZone?: TriageIncidentZone | string;
};

export type HealthPostureTriageRunResult = {
  ok: true;
  outcome: SystemTriageResult;
  triageEngaged: boolean;
  auditIntelligenceLogged: boolean;
};

function defaultThreadIdForTenant(tenantId: string): string {
  return `tas-4.3-health-${tenantId}`;
}

/**
 * Ensures a LangGraph thread exists before Agent 12 freeze (PostgresSaver authority).
 */
export async function ensureTriageThreadCheckpoint(
  tenantId: string,
  threadId: string,
): Promise<void> {
  const cp = await getPostgresCheckpointer();
  const readConfig = {
    configurable: { thread_id: threadId.trim(), checkpoint_ns: "" },
  };
  const existing = await cp.getTuple(readConfig);
  if (existing?.checkpoint) return;

  const checkpoint: Checkpoint = {
    v: 4,
    id: randomUUID(),
    ts: new Date().toISOString(),
    channel_values: {
      tenant_id: tenantId.trim(),
      tas_health_posture_seed: true,
    },
    channel_versions: { __start__: 1 },
    versions_seen: { __input__: {} },
  };

  await cp.put(
    readConfig,
    checkpoint,
    { source: "input", step: -1, parents: {} },
    { __start__: 1 },
  );
}

async function logAutomatedSelfHealingToAuditIntelligence(input: {
  tenantId: string;
  threadId: string;
  healthBarPercent: number;
  outcome: Extract<SystemTriageResult, { status: "TRIAGED_AND_HEALED" }>;
}): Promise<boolean> {
  try {
    await auditLogCreateLoose({
      data: {
        action: "AUTOMATED_SELF_HEALING_ENGAGED",
        operatorId: IRONTECH_OPERATOR,
        governance_tenant_uuid: input.tenantId,
        threatId: input.threadId,
        isSimulation: false,
        justification: JSON.stringify({
          tasSection: "4.3",
          message: `CRITICAL RESILIENCE ENGAGED: Posture dropped to ${input.healthBarPercent}%. State frozen in Postgres. Caches purged.`,
          checkpointId: input.outcome.checkpointId,
          incidentZone: input.outcome.incidentZone,
          lockTimestamp: input.outcome.lockTimestamp,
          repairLog: input.outcome.repairLog,
        }),
      },
    });
    return true;
  } catch (e) {
    console.error("[healthPostureMonitor] Audit Intelligence mirror failed:", e);
    return false;
  }
}

/**
 * TAS §4.3 production edge — binds live health telemetry to Agent 12 freeze via `evaluateSystemTriage`.
 */
export async function runHealthPostureTriage(
  input: HealthPostureTriageInput,
): Promise<HealthPostureTriageRunResult> {
  const tenantId = input.tenantId?.trim();
  const threadId = (input.threadId?.trim() || defaultThreadIdForTenant(tenantId ?? "")).trim();
  const healthBarPercent = Number(input.healthBarPercent);
  const incidentZone = normalizeTriageIncidentZone(input.incidentZone);

  if (!tenantId) {
    throw new Error("MISSING_HEALTH_METRIC_BOUNDS: tenantId is required.");
  }
  if (!threadId) {
    throw new Error("MISSING_HEALTH_METRIC_BOUNDS: threadId is required.");
  }
  if (!Number.isFinite(healthBarPercent)) {
    throw new Error("MISSING_HEALTH_METRIC_BOUNDS: healthBarPercent must be a finite number.");
  }

  if (healthBarRequiresTriage(healthBarPercent) && process.env.DATABASE_URL?.trim()) {
    await ensureTriageThreadCheckpoint(tenantId, threadId);
  }

  const outcome = await evaluateSystemTriage({
    tenantId,
    threadId,
    healthBarPercent,
    incidentZone,
  });

  let auditIntelligenceLogged = false;
  if (outcome.status === "TRIAGED_AND_HEALED") {
    auditIntelligenceLogged = await logAutomatedSelfHealingToAuditIntelligence({
      tenantId,
      threadId,
      healthBarPercent,
      outcome,
    });
    console.warn(
      `[🛡️ GAVEL LOCKDOWN] Self-healing completed for tenant ${tenantId}. Relational snapshot sealed.`,
    );
    logStructuredEvent(
      "Irontech",
      "AUTOMATED_SELF_HEALING_ENGAGED",
      {
        tenantId,
        threadId,
        healthBarPercent,
        checkpointId: outcome.checkpointId,
        incidentZone: outcome.incidentZone,
      },
      "warn",
    );
  }

  return {
    ok: true,
    outcome,
    triageEngaged: outcome.status === "TRIAGED_AND_HEALED",
    auditIntelligenceLogged,
  };
}

/**
 * Maps Ironwatch consecutive API failures to a sub-50% health bar (telemetry drop).
 */
export function telemetryFailureHealthBarPercent(
  consecutiveFailures: number,
  thresholdFailures: number,
): number {
  if (!Number.isFinite(consecutiveFailures) || consecutiveFailures <= 0) return 50;
  const ratio = Math.min(1, consecutiveFailures / Math.max(1, thresholdFailures));
  return Math.max(5, Math.round(50 - ratio * 45));
}

export function ironwatchTelemetryThreadId(tenantId: string): string {
  return `ironwatch-telemetry-${tenantId.trim()}`;
}

/**
 * Invoked when live sustainability / telemetry feeds enter stale-degraded mode.
 */
export async function invokeTelemetryDropTriage(
  tenantId: string,
  consecutiveFailures: number,
  thresholdFailures: number,
): Promise<HealthPostureTriageRunResult | null> {
  const healthBarPercent = telemetryFailureHealthBarPercent(
    consecutiveFailures,
    thresholdFailures,
  );
  if (!healthBarRequiresTriage(healthBarPercent)) return null;

  try {
    return await runHealthPostureTriage({
      tenantId,
      threadId: ironwatchTelemetryThreadId(tenantId),
      healthBarPercent,
      incidentZone: "TELEMETRY_DROP",
    });
  } catch (e) {
    logStructuredEvent(
      "Ironwatch",
      "telemetry_triage_failed",
      { tenantId, detail: e instanceof Error ? e.message : String(e) },
      "error",
    );
    return null;
  }
}
