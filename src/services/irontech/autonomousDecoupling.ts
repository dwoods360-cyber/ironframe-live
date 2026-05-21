import "server-only";

import { createHash, randomUUID } from "crypto";

import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import prisma from "@/lib/prisma";
import { logStructuredEvent } from "@/lib/structuredServerLog";
import { CORE_WORKFORCE_AGENTS } from "@/app/config/agents";
import { ELECTRICITY_MAPS_PROVIDER, PROVIDER_DOWNSTREAM_AGENTS } from "@/src/services/ironmap/dependencyRegistry";

/** Concurrent distinct agent failures within this window trigger constitutional gate (>3 agents). */
const CONSTITUTIONAL_EMERGENCY_WINDOW_MS = 120_000;

/** Tier 2/3: FAILED node quarantine + LKG respawn after this dwell time. */
export const IRONTECH_LKG_RESPAWN_DWELL_MS = 5 * 60 * 1000;

const TIER1_LOG = "IRONTECH_TIER1:BLOCK_AND_BYPASS";

type FailureWindowEntry = { at: number; agent: string };
const failureWindow: FailureWindowEntry[] = [];

function pruneFailureWindow(now: number): void {
  while (failureWindow.length && now - failureWindow[0].at > CONSTITUTIONAL_EMERGENCY_WINDOW_MS) {
    failureWindow.shift();
  }
}

/**
 * Register a failed agent for constitutional emergency detection.
 * Returns `emergency: true` when **more than 3** distinct agents fail within the window (requires 3-key / human).
 */
export function registerConcurrentAgentFailure(agentNode: string): {
  emergency: boolean;
  distinctAgents: number;
} {
  const now = Date.now();
  pruneFailureWindow(now);
  failureWindow.push({ at: now, agent: agentNode.toLowerCase() });
  const distinct = new Set(failureWindow.map((f) => f.agent));
  return { emergency: distinct.size > 3, distinctAgents: distinct.size };
}

export function isConstitutionalEmergencyActive(): boolean {
  const now = Date.now();
  pruneFailureWindow(now);
  const distinct = new Set(failureWindow.map((f) => f.agent));
  return distinct.size > 3;
}

export function blastRadiusWorkforcePctForProvider(): number {
  const roster = new Set(CORE_WORKFORCE_AGENTS.map((a) => a.name));
  const rows = PROVIDER_DOWNSTREAM_AGENTS[ELECTRICITY_MAPS_PROVIDER];
  let n = 0;
  for (const r of rows) {
    if (roster.has(r.agent)) n += 1;
  }
  return (n / CORE_WORKFORCE_AGENTS.length) * 100;
}

export type SelfHealingInterventionKind = "TIER1_DECOUPLE" | "LKG_RESPAWN";

export async function logSelfHealingIntervention(args: {
  tenantId: string;
  kind: SelfHealingInterventionKind;
  agentX: string;
  decoupledAtIso: string;
  lkgInstanceId?: string | null;
  respawnedAtIso?: string | null;
  blastRadiusWorkforcePct: number;
  constitutionalEmergencyGate: boolean;
  manualIntervention?: boolean;
}): Promise<void> {
  const detail =
    args.kind === "TIER1_DECOUPLE"
      ? `Agent ${args.agentX} decoupled at ${args.decoupledAtIso}. Blast Radius limited to ${args.blastRadiusWorkforcePct.toFixed(1)}% of workforce.`
      : `Agent ${args.agentX} decoupled at ${args.decoupledAtIso}. LKG Instance ${args.lkgInstanceId ?? "n/a"} spawned and reintegrated at ${args.respawnedAtIso ?? "n/a"}. Blast Radius limited to ${args.blastRadiusWorkforcePct.toFixed(1)}% of workforce.`;

  try {
    await auditLogCreateLoose({
      data: {
        action: "SELF_HEALING_INTERVENTION",
        justification: JSON.stringify({
          kind: args.kind,
          agent: args.agentX,
          decoupledAt: args.decoupledAtIso,
          lkgInstanceId: args.lkgInstanceId ?? null,
          respawnedAt: args.respawnedAtIso ?? null,
          blastRadiusWorkforcePct: args.blastRadiusWorkforcePct,
          constitutionalEmergencyGate: args.constitutionalEmergencyGate,
          manualIntervention: args.manualIntervention === true,
          detail,
          irontechAgent: "IRONTECH_AGENT_12",
        }),
        operatorId: "IRONTECH_AGENT_12",
        threatId: null,
        isSimulation: false,
      },
    });
  } catch (e) {
    logStructuredEvent(
      "Irontech",
      "self_healing_audit_failed",
      { detail: e instanceof Error ? e.message : String(e) },
      "error",
    );
  }
}

export async function recordHealthyAgentCheckpoint(args: {
  agentName: string;
  tenantId: string;
  snapshot: Record<string, unknown>;
}): Promise<string | null> {
  try {
    const canonical = JSON.stringify({ agent: args.agentName, tenant: args.tenantId, snap: args.snapshot });
    const stateHashSha256 = createHash("sha256").update(canonical, "utf8").digest("hex");
    const row = await prisma.agentStateCheckpoint.create({
      data: {
        agentName: args.agentName,
        tenantId: args.tenantId,
        stateHashSha256,
        snapshot: args.snapshot as object,
        verifiedHealthy: true,
      },
    });
    return row.id;
  } catch (e) {
    logStructuredEvent(
      "Irontech",
      "lkg_checkpoint_write_skipped",
      { detail: e instanceof Error ? e.message : String(e) },
      "warn",
    );
    return null;
  }
}

export async function getLatestHealthyLkgForAgent(
  agentName: string,
  tenantId: string,
): Promise<{ id: string; stateHashSha256: string; snapshot: unknown } | null> {
  try {
    const row = await prisma.agentStateCheckpoint.findFirst({
      where: {
        agentName,
        tenantId,
        verifiedHealthy: true,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, stateHashSha256: true, snapshot: true },
    });
    return row;
  } catch {
    return null;
  }
}

/**
 * Tier 2 & 3: FAILED agent operations older than 5 minutes → quarantine semantics + respawn from LKG.
 * Skipped when constitutional emergency (>3 concurrent agents) is active.
 */
export async function runIrontechLkgSpawnProtocol(tenantId: string): Promise<{
  respawned: number;
  skippedEmergency: boolean;
}> {
  if (isConstitutionalEmergencyActive()) {
    return { respawned: 0, skippedEmergency: true };
  }

  const cutoff = new Date(Date.now() - IRONTECH_LKG_RESPAWN_DWELL_MS);
  let respawned = 0;

  try {
    const stale = await prisma.agentOperation.findMany({
      where: {
        status: "FAILED",
        updatedAt: { lte: cutoff },
      },
      take: 25,
      select: { id: true, agentName: true, threatId: true, snapshot: true, updatedAt: true },
    });

    for (const op of stale) {
      const lkg = await getLatestHealthyLkgForAgent(op.agentName, tenantId);
      if (!lkg) continue;

      await prisma.agentOperation.update({
        where: { id: op.id },
        data: {
          status: "PENDING",
          attemptCount: 0,
          lastError: null,
          snapshot: (lkg.snapshot as object) ?? op.snapshot ?? undefined,
        },
      });

      const nowIso = new Date().toISOString();
      await logSelfHealingIntervention({
        tenantId,
        kind: "LKG_RESPAWN",
        agentX: op.agentName,
        decoupledAtIso: op.updatedAt.toISOString(),
        lkgInstanceId: lkg.id,
        respawnedAtIso: nowIso,
        blastRadiusWorkforcePct: blastRadiusWorkforcePctForProvider(),
        constitutionalEmergencyGate: false,
        manualIntervention: false,
      });
      respawned += 1;
    }
  } catch (e) {
    logStructuredEvent(
      "Irontech",
      "lkg_spawn_protocol_error",
      { detail: e instanceof Error ? e.message : String(e) },
      "error",
    );
  }

  return { respawned, skippedEmergency: false };
}

/** Log token Ironcore / graph nodes append for Tier-1 routing. */
export function formatTier1BlockBypassLog(agentNode: string): string {
  return `${TIER1_LOG}:${agentNode.toLowerCase()}`;
}

export function newLkgCorrelationId(): string {
  return randomUUID();
}
