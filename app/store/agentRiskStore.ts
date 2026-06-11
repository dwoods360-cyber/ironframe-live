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
  /** Tenant switch / cold-boot — drop stale Ironwatch pulse overlay. */
  resetForTenantScopeChange: () => void;
  /** Simulation nav — clear Agent 11 (Ironintel) BURDENED strain without tenant-wide reset. */
  flushBurdenedExecutionBuffers: () => void;
};

/** Spotlight roster indices that surface BURDENED in the left-rail showcase. */
const SHOWCASE_BURDEN_INDICES = [1, 8, 11] as const;

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
  resetForTenantScopeChange: () =>
    set({
      byIndex: {},
      anomalyAcknowledgedIndices: new Set(),
      ironlockGlobalStateFreeze: false,
      quarantineHardBanActive: false,
      lastUpdatedAt: null,
    }),
  flushBurdenedExecutionBuffers: () =>
    set((state) => {
      const byIndex = { ...state.byIndex };
      let changed = false;
      for (const idx of SHOWCASE_BURDEN_INDICES) {
        const cur = byIndex[idx];
        if (!cur || cur.riskLevel === "low") continue;
        byIndex[idx] = {
          ...cur,
          riskLevel: "low",
          healthScore: Math.max(72, cur.healthScore),
        };
        changed = true;
      }
      if (!changed) return state;
      const nextAck = new Set(state.anomalyAcknowledgedIndices);
      for (const idx of SHOWCASE_BURDEN_INDICES) {
        nextAck.delete(idx);
      }
      return {
        byIndex,
        anomalyAcknowledgedIndices: nextAck,
        lastUpdatedAt: Date.now(),
      };
    }),
}));
