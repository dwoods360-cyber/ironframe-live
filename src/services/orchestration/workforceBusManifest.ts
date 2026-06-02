import { CORE_WORKFORCE_AGENTS, type CoreWorkforceAgent } from "@/app/config/agents";

/** Agents with dedicated LangGraph nodes on the sovereign workforce hot path. */
export const SOVEREIGN_BUS_ACTIVE_AGENT_INDICES: ReadonlySet<number> = new Set([
  1, // Ironcore
  4, // Irontech (triage inside Ironlock branch)
  5, // Ironscribe
  6, // Ironlock
  7, // Ironcast
  8, // Ironsight
  15, // Ironquery
  19, // Irontally
]);

export const SOVEREIGN_BUS_ROSTER_SIZE = CORE_WORKFORCE_AGENTS.length;

export type WorkforceBusAgentCoverage = CoreWorkforceAgent & {
  participation: "active" | "sidecar";
};

export function getSovereignBusWorkforceCoverage(): WorkforceBusAgentCoverage[] {
  return CORE_WORKFORCE_AGENTS.map((agent) => ({
    ...agent,
    participation: SOVEREIGN_BUS_ACTIVE_AGENT_INDICES.has(agent.index) ? "active" : "sidecar",
  }));
}

/** Sidecar telemetry lines for agents not on the hot path (Epic 10 roster completion). */
export function buildWorkforceSidecarLogs(): string[] {
  return CORE_WORKFORCE_AGENTS.filter((a) => !SOVEREIGN_BUS_ACTIVE_AGENT_INDICES.has(a.index)).map(
    (agent) =>
      `[Agent ${String(agent.index).padStart(2, "0")} — ${agent.name}] SIDECAR: ${agent.dataSource} telemetry bound.`,
  );
}

export function sovereignBusRosterDigest(): string {
  return CORE_WORKFORCE_AGENTS.map((a) => a.index).join(",");
}
