import type { AgentKey, AgentStatus } from "@/app/store/agentStore";
import type { AgentRiskLevel } from "@/app/store/agentRiskStore";
import type { PipelineThreat } from "@/app/store/riskStore";
import {
  combineThreatPlanes,
  getAgentState,
  hasAnyOpenSimulationBotThreat,
  mergeInventoryAgentWithPulse,
  type AgentPulseState,
} from "@/app/utils/workforceAgentState";
import { parseWorkforceAgentsFromTelemetryText } from "@/app/utils/workforceTelemetryPulse";

export type WorkforceShowcaseStatus = "HEALTHY" | "BURDENED" | "HIGH THROUGHPUT";

export type ShowcaseAgentDef = {
  index: number;
  name: "Ironcore" | "Ironsight" | "Ironintel";
  role: string;
  icon: string;
  accentClass: string;
};

/** Canonical spotlight roster — Agents 01, 08, 11 per TAS workforce mandate. */
export const SHOWCASE_WORKFORCE_AGENTS: readonly ShowcaseAgentDef[] = [
  {
    index: 1,
    name: "Ironcore",
    role: "Orchestrator & Routing",
    icon: "\uD83D\uDEE1\uFE0F",
    accentClass: "text-blue-400",
  },
  {
    index: 8,
    name: "Ironsight",
    role: "CVE Polling & Blast-Radius Mapping",
    icon: "\u25CE",
    accentClass: "text-red-400",
  },
  {
    index: 11,
    name: "Ironintel",
    role: "Read-Only OSINT & Irongate Handoff",
    icon: "\uD83E\uDDE0",
    accentClass: "text-emerald-400",
  },
] as const;

/**
 * Presentation-layer workforce badges only — no ledger / BigInt baseline mutation.
 * Ironwatch may still oscillate in `agentRiskStore`; showcase status uses quiet production bands.
 */
/** Severe degradation only (Ironwatch score below 30) — ignores legacy medium tier at 40–71. */
export const SHOWCASE_HEALTH_SCORE_BURDENED_BELOW = 30;
/** Agent 01 queue lag — tolerates Prisma dev overhead before amber strain. */
export const IRONCORE_QUEUE_LAG_MS_BURDENED = 800;
/** Instrumented agent PROCESSING longer than this → showcase execution strain. */
export const SHOWCASE_STUCK_PROCESSING_MS = 12_000;
/** Min measured stream hits/sec before HIGH THROUGHPUT (real intelligence-stream traffic only). */
export const SHOWCASE_EVENTS_PER_SEC_HIGH_THROUGHPUT = 0.45;

const EPS_HIGH_THROUGHPUT = SHOWCASE_EVENTS_PER_SEC_HIGH_THROUGHPUT;
const EPS_WINDOW_SEC = 6;
const EPS_STREAM_WINDOW_LINES = 18;

const SHOWCASE_PROCESSING_AGENT_KEY: Record<
  ShowcaseAgentDef["name"],
  AgentKey | null
> = {
  Ironcore: "agentManager",
  Ironsight: "ironsight",
  Ironintel: "coreintel",
};

export type ShowcaseAgentTelemetry = {
  index: number;
  name: ShowcaseAgentDef["name"];
  role: string;
  icon: string;
  accentClass: string;
  status: WorkforceShowcaseStatus;
  eventsPerSec: number;
  healthScore: number | null;
  riskLevel: AgentRiskLevel;
  pulse: AgentPulseState;
  telemetryActive: boolean;
  tenantBound: boolean;
};

export function isShowcaseTelemetryTenantBound(
  activeTenantUuid: string | null | undefined,
  telemetryTenantScope: string | null | undefined,
): boolean {
  const active = activeTenantUuid?.trim() ?? "";
  if (!active) return false;
  const scope = telemetryTenantScope?.trim() ?? "";
  if (!scope) return true;
  return scope === active;
}

/** Map Ironwatch oscillator scores to quiet showcase risk labels (tooltip). */
export function mapHealthScoreToShowcaseRiskLevel(healthScore: number | null): AgentRiskLevel {
  if (healthScore == null) return "low";
  if (healthScore < SHOWCASE_HEALTH_SCORE_BURDENED_BELOW) return "high";
  return "low";
}

export function isShowcaseIronwatchSevereDegradation(healthScore: number | null): boolean {
  return healthScore != null && healthScore < SHOWCASE_HEALTH_SCORE_BURDENED_BELOW;
}

/** Events/sec from intelligence-stream hits only — no pulse floors or demo multipliers. */
export function estimateAgentEventsPerSec(
  intelligenceStream: readonly string[],
  agentName: string,
): number {
  const windowLines = intelligenceStream.slice(0, EPS_STREAM_WINDOW_LINES);
  let hits = 0;
  for (const line of windowLines) {
    if (parseWorkforceAgentsFromTelemetryText(line).includes(agentName)) {
      hits += 1;
    }
  }
  return hits / EPS_WINDOW_SEC;
}

function agentSimulationSpike(
  agentName: ShowcaseAgentDef["name"],
  combinedThreats: PipelineThreat[],
  opts: {
    isKimbotActive: boolean;
    isGrcbotActive: boolean;
    grcBotCompanyCount: number;
  },
): boolean {
  if (!hasAnyOpenSimulationBotThreat(combinedThreats)) {
    if (agentName === "Ironintel" && opts.isKimbotActive) return true;
    return false;
  }
  const pulse = getAgentState(agentName, combinedThreats);
  if (agentName === "Ironcore") {
    return opts.isGrcbotActive || pulse === "ALERT" || opts.grcBotCompanyCount >= 25;
  }
  if (agentName === "Ironsight") {
    return pulse === "ALERT" || pulse === "ACTIVE";
  }
  if (agentName === "Ironintel") {
    return opts.isKimbotActive || pulse === "ACTIVE";
  }
  return false;
}

export function isShowcaseAgentStuckProcessing(input: {
  agentName: ShowcaseAgentDef["name"];
  agentStatus: AgentStatus;
  agentProcessingSince: Partial<Record<AgentKey, number>>;
  nowMs: number;
}): boolean {
  const key = SHOWCASE_PROCESSING_AGENT_KEY[input.agentName];
  if (!key || input.agentStatus !== "PROCESSING") return false;
  const since = input.agentProcessingSince[key];
  if (typeof since !== "number") return false;
  return input.nowMs - since >= SHOWCASE_STUCK_PROCESSING_MS;
}

export function resolveShowcaseExecutionStrain(input: {
  agentIndex: number;
  agentName: ShowcaseAgentDef["name"];
  agentStatus: AgentStatus;
  executionStrainByIndex: Record<number, boolean>;
  agentProcessingSince: Partial<Record<AgentKey, number>>;
  nowMs: number;
}): boolean {
  if (input.executionStrainByIndex[input.agentIndex] === true) return true;
  return isShowcaseAgentStuckProcessing({
    agentName: input.agentName,
    agentStatus: input.agentStatus,
    agentProcessingSince: input.agentProcessingSince,
    nowMs: input.nowMs,
  });
}

export function computeShowcaseAgentStatus(input: {
  agentName: ShowcaseAgentDef["name"];
  pulse: AgentPulseState;
  healthScore: number | null;
  systemLatencyMs: number | null;
  eventsPerSec: number;
  simulationSpike: boolean;
  telemetryActive: boolean;
  executionStrain: boolean;
}): WorkforceShowcaseStatus {
  const measuredStreamLoad = input.eventsPerSec >= EPS_HIGH_THROUGHPUT;
  const highThroughput =
    input.simulationSpike || input.pulse === "ACTIVE" || measuredStreamLoad;

  if (highThroughput) return "HIGH THROUGHPUT";

  const ironwatchHighRisk = isShowcaseIronwatchSevereDegradation(input.healthScore);

  const burdened =
    input.executionStrain ||
    input.pulse === "ALERT" ||
    ironwatchHighRisk ||
    (input.agentName === "Ironcore" &&
      (input.systemLatencyMs ?? 0) > IRONCORE_QUEUE_LAG_MS_BURDENED);

  if (burdened) return "BURDENED";

  return "HEALTHY";
}

export function statusSurface(status: WorkforceShowcaseStatus): {
  label: string;
  dotClass: string;
  textClass: string;
  iconGlowClass: string;
  pulseDot: boolean;
} {
  switch (status) {
    case "HIGH THROUGHPUT":
      return {
        label: "HIGH THROUGHPUT",
        dotClass: "bg-cyan-400 shadow-[0_0_8px_#22d3ee]",
        textClass: "text-cyan-300",
        iconGlowClass: "drop-shadow-[0_0_10px_rgba(34,211,238,0.75)] animate-pulse",
        pulseDot: true,
      };
    case "BURDENED":
      return {
        label: "BURDENED",
        dotClass: "bg-amber-400 shadow-[0_0_8px_#fbbf24]",
        textClass: "text-amber-300",
        iconGlowClass: "drop-shadow-[0_0_6px_rgba(251,191,36,0.55)]",
        pulseDot: true,
      };
    default:
      return {
        label: "HEALTHY",
        dotClass: "bg-emerald-500 shadow-[0_0_4px_#10b981]",
        textClass: "text-emerald-500",
        iconGlowClass: "",
        pulseDot: false,
      };
  }
}

const SHOWCASE_INSTRUMENTED_STATUS: Record<
  ShowcaseAgentDef["name"],
  AgentKey
> = {
  Ironcore: "agentManager",
  Ironsight: "ironsight",
  Ironintel: "coreintel",
};

export function buildShowcaseAgentTelemetry(input: {
  activeTenantUuid: string | null | undefined;
  telemetryTenantScope: string | null | undefined;
  activeThreats: PipelineThreat[];
  pipelineThreats: PipelineThreat[];
  intelligenceStream: readonly string[];
  agentTelemetryPulseUntil: Record<string, number>;
  agentRiskByIndex: Record<number, { healthScore: number; riskLevel: AgentRiskLevel }>;
  executionStrainByIndex: Record<number, boolean>;
  agentProcessingSince: Partial<Record<AgentKey, number>>;
  instrumentedAgentStatus: Record<AgentKey, { status: AgentStatus }>;
  systemLatencyMs: number | null;
  isKimbotActive: boolean;
  isGrcbotActive: boolean;
  grcBotCompanyCount: number;
  nowMs?: number;
}): ShowcaseAgentTelemetry[] {
  const tenantBound = isShowcaseTelemetryTenantBound(
    input.activeTenantUuid,
    input.telemetryTenantScope,
  );
  const combinedThreats = combineThreatPlanes(input.activeThreats, input.pipelineThreats);
  const now = input.nowMs ?? Date.now();

  return SHOWCASE_WORKFORCE_AGENTS.map((agent) => {
    const pulse = mergeInventoryAgentWithPulse(
      agent.name,
      combinedThreats,
      input.agentTelemetryPulseUntil,
    );
    const risk = input.agentRiskByIndex[agent.index];
    const telemetryActive = (input.agentTelemetryPulseUntil[agent.name] ?? 0) > now;
    const eventsPerSec = tenantBound
      ? estimateAgentEventsPerSec(input.intelligenceStream, agent.name)
      : 0;
    const simulationSpike = tenantBound
      ? agentSimulationSpike(agent.name, combinedThreats, {
          isKimbotActive: input.isKimbotActive,
          isGrcbotActive: input.isGrcbotActive,
          grcBotCompanyCount: input.grcBotCompanyCount,
        })
      : false;

    const instrumentedKey = SHOWCASE_INSTRUMENTED_STATUS[agent.name];
    const agentStatus = input.instrumentedAgentStatus[instrumentedKey]?.status ?? "HEALTHY";
    const executionStrain = resolveShowcaseExecutionStrain({
      agentIndex: agent.index,
      agentName: agent.name,
      agentStatus,
      executionStrainByIndex: input.executionStrainByIndex,
      agentProcessingSince: input.agentProcessingSince,
      nowMs: now,
    });

    const status = tenantBound
      ? computeShowcaseAgentStatus({
          agentName: agent.name,
          pulse,
          healthScore: risk?.healthScore ?? null,
          systemLatencyMs: input.systemLatencyMs,
          eventsPerSec,
          simulationSpike,
          telemetryActive,
          executionStrain,
        })
      : "HEALTHY";

    return {
      index: agent.index,
      name: agent.name,
      role: agent.role,
      icon: agent.icon,
      accentClass: agent.accentClass,
      status,
      eventsPerSec,
      healthScore: risk?.healthScore ?? null,
      riskLevel: mapHealthScoreToShowcaseRiskLevel(risk?.healthScore ?? null),
      pulse,
      telemetryActive,
      tenantBound,
    };
  });
}
