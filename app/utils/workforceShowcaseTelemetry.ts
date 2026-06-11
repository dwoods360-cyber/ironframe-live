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

const QUEUE_LAG_MS_BURDENED = 350;
const EPS_HIGH_THROUGHPUT = 0.45;
const EPS_WINDOW_SEC = 6;

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

/** Estimate events/sec from newest intelligence-stream lines referencing the agent. */
export function estimateAgentEventsPerSec(
  intelligenceStream: readonly string[],
  agentName: string,
  telemetryPulseActive: boolean,
): number {
  const windowLines = intelligenceStream.slice(0, 18);
  let hits = 0;
  for (const line of windowLines) {
    if (parseWorkforceAgentsFromTelemetryText(line).includes(agentName)) {
      hits += 1;
    }
  }
  const base = hits / EPS_WINDOW_SEC;
  if (telemetryPulseActive) {
    return Math.max(base, 0.35);
  }
  return base;
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

export function computeShowcaseAgentStatus(input: {
  agentName: ShowcaseAgentDef["name"];
  pulse: AgentPulseState;
  riskLevel: AgentRiskLevel;
  systemLatencyMs: number | null;
  eventsPerSec: number;
  simulationSpike: boolean;
  telemetryActive: boolean;
}): WorkforceShowcaseStatus {
  const highThroughput =
    input.simulationSpike ||
    input.pulse === "ACTIVE" ||
    (input.telemetryActive && input.eventsPerSec >= EPS_HIGH_THROUGHPUT) ||
    (input.pulse === "TELEMETRY" && input.eventsPerSec >= 0.3);

  if (highThroughput) return "HIGH THROUGHPUT";

  const burdened =
    input.riskLevel === "medium" ||
    input.riskLevel === "high" ||
    input.pulse === "ALERT" ||
    (input.agentName === "Ironcore" && (input.systemLatencyMs ?? 0) > QUEUE_LAG_MS_BURDENED);

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

export function buildShowcaseAgentTelemetry(input: {
  activeTenantUuid: string | null | undefined;
  telemetryTenantScope: string | null | undefined;
  activeThreats: PipelineThreat[];
  pipelineThreats: PipelineThreat[];
  intelligenceStream: readonly string[];
  agentTelemetryPulseUntil: Record<string, number>;
  agentRiskByIndex: Record<number, { healthScore: number; riskLevel: AgentRiskLevel }>;
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
      ? estimateAgentEventsPerSec(input.intelligenceStream, agent.name, telemetryActive)
      : 0;
    const simulationSpike = tenantBound
      ? agentSimulationSpike(agent.name, combinedThreats, {
          isKimbotActive: input.isKimbotActive,
          isGrcbotActive: input.isGrcbotActive,
          grcBotCompanyCount: input.grcBotCompanyCount,
        })
      : false;

    const status = tenantBound
      ? computeShowcaseAgentStatus({
          agentName: agent.name,
          pulse,
          riskLevel: risk?.riskLevel ?? "low",
          systemLatencyMs: input.systemLatencyMs,
          eventsPerSec,
          simulationSpike,
          telemetryActive,
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
      riskLevel: risk?.riskLevel ?? "low",
      pulse,
      telemetryActive,
      tenantBound,
    };
  });
}
