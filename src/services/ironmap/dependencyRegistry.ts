/**
 * Agent 9 (Ironmap) — external supply-chain → specialist blast-radius registry.
 * Maps vendors / live APIs to LangGraph-visible nodes and constitutional workforce agents.
 */

export type ExternalProviderKey = "ELECTRICITY_MAPS";

export type DependencyDownstreamAgent = {
  /** Canonical specialist name (matches CORE_WORKFORCE_AGENTS / TAS roster). */
  agent: string;
  /** `StateGraph` node id (`graph.ts`). */
  graphNodeId: string;
  /** Consumer role for post-mortems. */
  role: string;
  /**
   * True when missing provider primarily blocks this node (carbon / grid-truth path).
   * Used for “wait-listed / throttled” attestation language.
   */
  /**
   * True when this specialist could execute **regulatory / framework** sub-tasks without live
   * Electricity Maps (SOC2 mapping, vault controls, etc.). Used for Idle Debt + decoupling dividend.
   */
  parallelRegulatoryEligible?: boolean;
};

/** Primary live carbon-intensity vendor (Ironwatch `ELECTRICITY_MAPS_LIVE`). */
export const ELECTRICITY_MAPS_PROVIDER: ExternalProviderKey = "ELECTRICITY_MAPS";

/**
 * Downstream blast radius for Electricity Maps outages.
 * Aligns with sovereign graph: ironbloom → irontrust → ironsight → ironquery → irontally;
 * Ironscribe + warden on alternate routes still listed when carbon routing stalls platform truth.
 */
export const PROVIDER_DOWNSTREAM_AGENTS: Record<ExternalProviderKey, DependencyDownstreamAgent[]> = {
  ELECTRICITY_MAPS: [
    { agent: "Ironbloom", graphNodeId: "ironbloom", role: "Carbon / sustainability ALE & Gridcore seals", carbonGate: true, parallelRegulatoryEligible: false },
    { agent: "Irontrust", graphNodeId: "irontrust", role: "Compliance risk analysis (post-carbon path)", carbonGate: true, parallelRegulatoryEligible: true },
    { agent: "Ironscribe", graphNodeId: "ironscribe", role: "Deep-doc / ledger path when Ironcore routes via IRONSCRIBE", carbonGate: false, parallelRegulatoryEligible: true },
    { agent: "Warden", graphNodeId: "warden", role: "Mathematical guardrail (post-Ironscribe)", carbonGate: false, parallelRegulatoryEligible: true },
    { agent: "Ironsight", graphNodeId: "ironsight", role: "Regulatory horizon / scout chain (Ironlock-delay sensitive)", carbonGate: true, parallelRegulatoryEligible: true },
    { agent: "Ironquery", graphNodeId: "ironquery", role: "Structured query / evidence chain", carbonGate: true, parallelRegulatoryEligible: true },
    { agent: "Irontally", graphNodeId: "irontally", role: "Control mapping & GRC tally terminus", carbonGate: true, parallelRegulatoryEligible: true },
  ],
};

export function listGraphNodesForProvider(key: ExternalProviderKey): string[] {
  return PROVIDER_DOWNSTREAM_AGENTS[key].map((d) => d.graphNodeId);
}

export function listWorkforceAgentsForProvider(key: ExternalProviderKey): string[] {
  return PROVIDER_DOWNSTREAM_AGENTS[key].map((d) => d.agent);
}
