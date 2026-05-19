"use client";

import { create } from "zustand";

export type AgentRiskLevel = "low" | "medium" | "high";

export type AgentRiskPulse = {
  healthScore: number;
  riskLevel: AgentRiskLevel;
};

function mergeAcknowledgedOverlay(
  incoming: Record<number, AgentRiskPulse>,
  ack: ReadonlySet<number>,
): Record<number, AgentRiskPulse> {
  const merged: Record<number, AgentRiskPulse> = { ...incoming };
  for (const idx of ack) {
    const cur = merged[idx];
    if (!cur) continue;
    merged[idx] = {
      ...cur,
      riskLevel: "low",
      healthScore: Math.max(72, cur.healthScore),
    };
  }
  return merged;
}

function pruneAckSetForRecoveredAgents(
  incoming: Record<number, AgentRiskPulse>,
  ack: Set<number>,
): Set<number> {
  const next = new Set(ack);
  for (const idx of next) {
    const pulse = incoming[idx];
    if (pulse?.riskLevel === "low") next.delete(idx);
  }
  return next;
}

type AgentRiskState = {
  byIndex: Record<number, AgentRiskPulse>;
  /** Indices the operator cleared; overlay until Ironwatch reports natural low again. */
  anomalyAcknowledgedIndices: Set<number>;
  /** Ironlock Agent 6 — global autonomous state freeze; forces static red pulse on all tiles. */
  ironlockGlobalStateFreeze: boolean;
  /** Quarantine ledger hard ban targeting the active session tenant (Gavel). */
  quarantineHardBanActive: boolean;
  lastUpdatedAt: number | null;
  setIronwatchSnapshot: (payload: {
    byIndex: Record<number, AgentRiskPulse>;
    ironlockGlobalStateFreeze: boolean;
    quarantineHardBanActive: boolean;
  }) => void;
  /** Human Command Post: clear amber/red anomaly for one agent (`agentId` = `${CoreWorkforceAgent.index}`). */
  acknowledgeAnomaly: (agentId: string) => void;
};

export const useAgentRiskStore = create<AgentRiskState>((set) => ({
  byIndex: {},
  anomalyAcknowledgedIndices: new Set(),
  ironlockGlobalStateFreeze: false,
  quarantineHardBanActive: false,
  lastUpdatedAt: null,
  setIronwatchSnapshot: (payload) =>
    set((state) => {
      const pruned = pruneAckSetForRecoveredAgents(payload.byIndex, new Set(state.anomalyAcknowledgedIndices));
      const merged = mergeAcknowledgedOverlay(payload.byIndex, pruned);
      return {
        byIndex: merged,
        anomalyAcknowledgedIndices: pruned,
        ironlockGlobalStateFreeze: payload.ironlockGlobalStateFreeze,
        quarantineHardBanActive: payload.quarantineHardBanActive,
        lastUpdatedAt: Date.now(),
      };
    }),
  acknowledgeAnomaly: (agentId) =>
    set((state) => {
      const idx = Number(agentId);
      if (!Number.isInteger(idx) || idx < 1) return state;
      const nextAck = new Set(state.anomalyAcknowledgedIndices);
      nextAck.add(idx);
      const cur = state.byIndex[idx];
      const base = { ...state.byIndex };
      if (cur) {
        base[idx] = { ...cur, riskLevel: "low", healthScore: Math.max(72, cur.healthScore) };
      }
      return {
        anomalyAcknowledgedIndices: nextAck,
        byIndex: mergeAcknowledgedOverlay(base, nextAck),
      };
    }),
}));
