"use client";

import { useMemo } from "react";
import { CORE_WORKFORCE_AGENTS } from "@/app/config/agents";
import { useRiskStore } from "@/app/store/riskStore";
import {
  defaultCommandPostCellForIndex,
  useCommandPostStore,
  type CommandPostCell,
  type CommandPostRiskSignal,
} from "@/app/store/commandPostStore";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function useEffectiveCommandPostCells(): Record<number, CommandPostCell> {
  const partial = useCommandPostStore((s) => s.byAgentIndex);
  return useMemo(() => {
    const out: Record<number, CommandPostCell> = {};
    for (const a of CORE_WORKFORCE_AGENTS) {
      const saved = partial[a.index];
      out[a.index] = saved
        ? {
            colSpan: clamp(saved.colSpan, 1, 12),
            rowSpan: clamp(saved.rowSpan, 1, 8),
          }
        : defaultCommandPostCellForIndex(a.index);
    }
    return out;
  }, [partial]);
}

/**
 * Agent 5 (Ironscribe) risk plane → Command Post auto-layout.
 */
export function useCommandPostRiskSignal(): CommandPostRiskSignal {
  const activeThreats = useRiskStore((s) => s.activeThreats);
  const pipelineThreats = useRiskStore((s) => s.pipelineThreats);
  const constitutionalRebaselinePending = useRiskStore((s) => s.constitutionalRebaselinePending);
  const isConstitutionalEmergency = useRiskStore((s) => s.isConstitutionalEmergency);
  const isSustainabilityStaleLockdownBlocking = useRiskStore((s) => s.isSustainabilityStaleLockdownBlocking);

  return useMemo(() => {
    const active = activeThreats.length;
    const pipeline = pipelineThreats.length;
    const escalated = activeThreats.some((t) => (t.threatStatus ?? "").toUpperCase() === "ESCALATED");
    const underSiege = escalated || active + pipeline >= 12 || active >= 7;
    const freezeImminent =
      constitutionalRebaselinePending || isConstitutionalEmergency || isSustainabilityStaleLockdownBlocking;
    return {
      underSiege,
      freezeImminent,
      dominanceActive: underSiege || freezeImminent,
    };
  }, [
    activeThreats,
    pipelineThreats,
    constitutionalRebaselinePending,
    isConstitutionalEmergency,
    isSustainabilityStaleLockdownBlocking,
  ]);
}
