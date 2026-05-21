import { create } from "zustand";
import { GRC_GOLD_AGENTIC_MONITOR_AGENT13 } from "@/lib/constants/grcGold";

export type AgenticComputeSample = {
  id: string;
  tenantLabel: string;
  agentLabel: string;
  durationMs: number;
  tokensEstimate?: number;
  at: string;
};

type State = {
  samples: AgenticComputeSample[];
  recordSample: (input: {
    tenantLabel: string;
    durationMs: number;
    tokensEstimate?: number;
    agentLabel?: string;
  }) => void;
  clear: () => void;
};

const MAX = 24;

export const useAgenticComputeStore = create<State>((set) => ({
  samples: [],
  recordSample: (input) =>
    set((s) => {
      const row: AgenticComputeSample = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        tenantLabel: input.tenantLabel.slice(0, 80),
        agentLabel: (input.agentLabel ?? GRC_GOLD_AGENTIC_MONITOR_AGENT13).slice(0, 80),
        durationMs: Math.max(0, Math.round(input.durationMs)),
        tokensEstimate: input.tokensEstimate,
        at: new Date().toISOString(),
      };
      return { samples: [row, ...s.samples].slice(0, MAX) };
    }),
  clear: () => set({ samples: [] }),
}));
