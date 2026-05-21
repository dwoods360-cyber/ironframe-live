import "server-only";

import {
  GOVERNANCE_EXPOSURE_ENVELOPE_BILLIONS,
} from "@/app/utils/financialRisk";
import { CORE_WORKFORCE_AGENTS } from "@/app/config/agents";
import {
  ELECTRICITY_MAPS_PROVIDER,
  PROVIDER_DOWNSTREAM_AGENTS,
  type DependencyDownstreamAgent,
  type ExternalProviderKey,
} from "./dependencyRegistry";

/** LangGraph `agent_logs` token when Ironlock governance delay fires (see `graph.ts`). */
export const IRONMAP_THROTTLE_LOG_TOKEN = "SIG_THROTTLE:";
const WAITLIST_ATTESTATION = "ATTESTED_WAIT_CARBON_PRIMARY";

export type BlastRadiusContext = {
  providerKey: ExternalProviderKey;
  /** Wall-clock outage window (t_waiver − t_outage). */
  outageDeltaMs: number;
  tenantId: string;
  /**
   * Optional LangGraph `agent_logs` lines from a checkpoint slice (future: Postgres checkpointer).
   * When present, Ironmap marks nodes that recorded `SIG_THROTTLE` during the window.
   */
  langGraphAgentLogSample?: string[];
};

export type DownstreamImpactRow = {
  agent: string;
  graphNode: string;
  role: string;
  /** Synthetic classification: throttle signal vs attested carbon wait. */
  status: "THROTTLED" | "WAIT_LISTED" | "STALL_ATTRIBUTED";
  delayDebtMs: number;
  /** Time the agent could have run regulatory-parallel work without Electricity Maps (Idle Debt target → 0). */
  idleDebtMs: number;
};

export type BlastRadiusReport = {
  outageId: string;
  providerKey: ExternalProviderKey;
  downstreamRows: DownstreamImpactRow[];
  delayDebtTotalMs: number;
  delayDebtTotalHours: number;
  idleDebtTotalMs: number;
  idleDebtTotalHours: number;
  /** Share of constitutional roster that could stay productive under full decoupling (carbon-exclusive agents excluded). */
  decouplingDividendPct: number;
  strategicAdviceLines: string[];
  dependencyVolatilityScore: number;
  /** vs a hypothetical vendor touching one downstream agent (linear model). */
  volatilityMultiplierVsSingle: number;
  workforceTotalAgents: number;
  workforceImpactedCount: number;
  workforceImpactedPct: number;
  totalReportingLatencyHours: number;
  baselineBillionsUsd: number;
  mermaidBlock: string;
  markdownTable: string;
};

function classifyRow(
  d: DependencyDownstreamAgent,
  outageDeltaMs: number,
  logSample: string[] | undefined,
): DownstreamImpactRow {
  const throttleHit =
    logSample?.some(
      (line) =>
        line.includes(IRONMAP_THROTTLE_LOG_TOKEN) &&
        line.toLowerCase().includes(d.graphNodeId.toLowerCase()),
    ) ?? false;
  const status: DownstreamImpactRow["status"] = throttleHit
    ? "THROTTLED"
    : d.carbonGate
      ? "WAIT_LISTED"
      : "STALL_ATTRIBUTED";
  return {
    agent: d.agent,
    graphNode: d.graphNodeId,
    role: d.role,
    status,
    delayDebtMs: Math.max(0, outageDeltaMs),
    idleDebtMs: (d.parallelRegulatoryEligible ?? false) ? Math.max(0, outageDeltaMs) : 0,
  };
}

function buildMermaid(providerLabel: string, rows: DownstreamImpactRow[]): string {
  const head = `flowchart LR
  P["${providerLabel}"]
`;
  const body = rows
    .map((r, i) => {
      const id = `N${i}`;
      return `  P --> ${id}["${r.graphNode}<br/>${r.status.replace(/_/g, " ")}"]
`;
    })
    .join("");
  return ["```mermaid", head + body + "```"].join("\n");
}

function buildTable(rows: DownstreamImpactRow[]): string {
  const header = `| LangGraph node | Workforce agent | Role | Ironmap status | Delay debt | Idle debt (decoupling) |
| --- | --- | --- | --- | --- | --- |`;
  const lines = rows.map((r) => {
    const h = (r.delayDebtMs / 3_600_000).toFixed(2);
    const idh = (r.idleDebtMs / 3_600_000).toFixed(2);
    return `| \`${r.graphNode}\` | ${r.agent} | ${r.role} | ${r.status} | ${h} h | ${idh} h |`;
  });
  return [header, ...lines].join("\n");
}

function buildStrategicAdvice(rows: DownstreamImpactRow[]): string[] {
  const lines: string[] = [];
  for (const r of rows) {
    if (r.idleDebtMs <= 0) continue;
    const h = (r.idleDebtMs / 3_600_000).toFixed(1);
    if (r.agent === "Irontally") {
      lines.push(
        `STRATEGIC ADVICE: Irontally experienced ${h} hours of unnecessary idle time. Recommend further decoupling of the CSRD environmental module from the core SOC2 mapping logic.`,
      );
    } else {
      lines.push(
        `STRATEGIC ADVICE: ${r.agent} (\`${r.graphNode}\`) — ~${h} h Idle Debt: regulatory/framework sub-tasks could have run in parallel while **Sustainability_Mapping** was WAIT; harden parallel lanes in LangGraph + payload flags.`,
      );
    }
  }
  return lines;
}

function computeBlastRadiusSync(outageId: string, ctx: BlastRadiusContext): BlastRadiusReport {
  const registry = PROVIDER_DOWNSTREAM_AGENTS[ctx.providerKey];
  const downstreamRows = registry.map((d) => classifyRow(d, ctx.outageDeltaMs, ctx.langGraphAgentLogSample));
  const delayDebtTotalMs = downstreamRows.reduce((sum, r) => sum + r.delayDebtMs, 0);
  const delayDebtTotalHours = delayDebtTotalMs / 3_600_000;
  const idleDebtTotalMs = downstreamRows.reduce((sum, r) => sum + r.idleDebtMs, 0);
  const idleDebtTotalHours = idleDebtTotalMs / 3_600_000;
  const strategicAdviceLines = buildStrategicAdvice(downstreamRows);
  const downstreamCount = downstreamRows.length;
  const dependencyVolatilityScore = downstreamCount;
  const volatilityMultiplierVsSingle = downstreamCount / 1;
  const workforceTotalAgents = CORE_WORKFORCE_AGENTS.length;
  const rosterAgentNames = new Set(CORE_WORKFORCE_AGENTS.map((a) => a.name));
  const workforceImpactedCount = downstreamRows.filter((r) => rosterAgentNames.has(r.agent)).length;
  const workforceImpactedPct = (workforceImpactedCount / workforceTotalAgents) * 100;
  const totalReportingLatencyHours = delayDebtTotalHours;

  const carbonExclusiveOnRoster = registry.filter(
    (d) => (d.parallelRegulatoryEligible ?? false) === false && rosterAgentNames.has(d.agent),
  ).length;
  const decouplingDividendPct =
    ((workforceTotalAgents - carbonExclusiveOnRoster) / workforceTotalAgents) * 100;

  const providerLabel =
    ctx.providerKey === ELECTRICITY_MAPS_PROVIDER ? "Electricity Maps (live)" : ctx.providerKey;

  return {
    outageId,
    providerKey: ctx.providerKey,
    downstreamRows,
    delayDebtTotalMs,
    delayDebtTotalHours,
    idleDebtTotalMs,
    idleDebtTotalHours,
    decouplingDividendPct,
    strategicAdviceLines,
    dependencyVolatilityScore,
    volatilityMultiplierVsSingle,
    workforceTotalAgents,
    workforceImpactedCount,
    workforceImpactedPct,
    totalReportingLatencyHours,
    baselineBillionsUsd: GOVERNANCE_EXPOSURE_ENVELOPE_BILLIONS,
    mermaidBlock: buildMermaid(providerLabel, downstreamRows),
    markdownTable: buildTable(downstreamRows),
  };
}

/**
 * Agent 9 (Ironmap): dependency blast radius + delay debt for automated post-analysis.
 * `outageId` is a stable correlation id (e.g. derived from waiver witness hash).
 */
export const Ironmap = {
  async getBlastRadius(outageId: string, ctx: BlastRadiusContext): Promise<BlastRadiusReport> {
    return Promise.resolve(computeBlastRadiusSync(outageId, ctx));
  },
};

export const IRONMAP_LANGGRAPH_WAIT_ATTESTATION = WAITLIST_ATTESTATION;
