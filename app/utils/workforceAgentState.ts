import type { PipelineThreat } from "@/app/store/riskStore";

export type AgentPulseState = "IDLE" | "ALERT" | "ACTIVE" | "TELEMETRY";

export function combineThreatPlanes(
  activeThreats: PipelineThreat[],
  pipelineThreats: PipelineThreat[],
): PipelineThreat[] {
  const map = new Map<string, PipelineThreat>();
  for (const t of pipelineThreats) map.set(t.id, t);
  for (const t of activeThreats) map.set(t.id, t);
  return Array.from(map.values());
}

function isOpenOperationalThreat(t: PipelineThreat): boolean {
  const status = (t.threatStatus ?? "").toUpperCase();
  if (status === "RESOLVED") return false;
  if (t.lifecycleState === "resolved") return false;
  return true;
}

function titleUpper(t: PipelineThreat): string {
  return (t.name ?? "").toUpperCase();
}

function hasActiveAttbot(threats: PipelineThreat[]): boolean {
  return threats.some(
    (t) =>
      isOpenOperationalThreat(t) &&
      (titleUpper(t).includes("ATTBOT") ||
        (t.source ?? "").toUpperCase().includes("ATTACK_BOT") ||
        (t.source ?? "").toUpperCase().includes("ATTBOT")),
  );
}

function hasActiveKimbot(threats: PipelineThreat[]): boolean {
  return threats.some(
    (t) =>
      isOpenOperationalThreat(t) &&
      (titleUpper(t).includes("KIMBOT") || (t.source ?? "").toUpperCase().includes("KIMBOT")),
  );
}

function hasActiveGrcbot(threats: PipelineThreat[]): boolean {
  return threats.some(
    (t) =>
      isOpenOperationalThreat(t) &&
      (titleUpper(t).includes("GRCBOT") ||
        (t.source ?? "").toUpperCase().includes("GRC_BOT") ||
        (t.source ?? "").toUpperCase().includes("GRCBOT")),
  );
}

/** True when any ATT/KIM/GRC bot drill threat is open (ingress signal bar). */
export function hasAnyOpenSimulationBotThreat(threats: PipelineThreat[]): boolean {
  return hasActiveAttbot(threats) || hasActiveKimbot(threats) || hasActiveGrcbot(threats);
}

/** Defensive front roster when ATTBOT drill is open — Control Room ALERT + inventory orange state. */
export const ATTBOT_ALERT_AGENT_NAMES = [
  "Ironcore",
  "Ironsight",
  "Ironlock",
  "Irontech",
  "Irongate",
] as const;

function isAttbotAlertAgent(name: string): boolean {
  const n = name.trim();
  return (ATTBOT_ALERT_AGENT_NAMES as readonly string[]).includes(n);
}

/**
 * Drill-driven agents for sustained inventory highlighting (union of open ATT/KIM/GRC bots).
 */
export function getWorkforceInventoryDrillActiveAgents(threats: PipelineThreat[]): Set<string> {
  const s = new Set<string>();
  if (hasActiveAttbot(threats)) {
    for (const n of ATTBOT_ALERT_AGENT_NAMES) s.add(n);
  }
  if (hasActiveKimbot(threats)) {
    s.add("Irontrust");
    s.add("Ironwatch");
  }
  if (hasActiveGrcbot(threats)) {
    s.add("Irontally");
    s.add("Ironscribe");
  }
  return s;
}

/**
 * Shared Control Room + Integrity Hub mapping: open Full Spectrum drill threats → agent pulse.
 * ATTBOT → defensive front (ALERT). KIM/GRC → paired ACTIVE agents.
 */
export function getAgentState(agentName: string, activeThreats: PipelineThreat[]): AgentPulseState {
  const att = hasActiveAttbot(activeThreats);
  const kim = hasActiveKimbot(activeThreats);
  const grc = hasActiveGrcbot(activeThreats);
  const name = agentName.trim();
  if (att && isAttbotAlertAgent(name)) {
    return "ALERT";
  }
  if (kim && (name === "Irontrust" || name === "Ironwatch")) {
    return "ACTIVE";
  }
  if (grc && (name === "Irontally" || name === "Ironscribe")) {
    return "ACTIVE";
  }
  return "IDLE";
}

/**
 * Short CLAIM/SUBMIT pulses (workforce dispatch) layer ACTIVE on top; ALERT from drills wins.
 */
export function mergeInventoryAgentWithPulse(
  agentName: string,
  threats: PipelineThreat[],
  pulseUntil: Record<string, number>,
): AgentPulseState {
  const base = getAgentState(agentName, threats);
  if (base === "ALERT") return "ALERT";
  const telemetryLive = (pulseUntil[agentName] ?? 0) > Date.now();
  if (telemetryLive) {
    return base === "IDLE" ? "TELEMETRY" : base;
  }
  return base;
}
