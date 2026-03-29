import { create } from "zustand";

export type AgentKey = "ironsight" | "coreintel" | "agentManager";

export type AgentStatus = "HEALTHY" | "PROCESSING" | "OFFLINE" | "WARNING" | "ACTIVE_DEFENSE";

type AgentState = {
  status: AgentStatus;
};

type AgentStore = {
  agents: Record<AgentKey, AgentState>;
  intelligenceStream: string[];
  /** DMZ / IRONWAVE poller — lines shown under RISK INGESTION (ThreatPipeline). */
  riskIngestionTerminalLines: string[];
  /** System latency in ms (e.g. from DB query); used for High Load warning when GRCBOT at 100 companies */
  systemLatencyMs: number | null;
  setAgentStatus: (agent: AgentKey, status: AgentStatus) => void;
  addStreamMessage: (msg: string) => void;
  appendRiskIngestionTerminalLine: (line: string) => void;
  setSystemLatencyMs: (ms: number | null) => void;
  runSentinelSweep: (instruction: string) => void;
};

const INITIAL_MESSAGES: string[] = [
  "> [SYSTEM] System Online. Core Vault synced.",
  "> [SYSTEM] Zero-trust Architecture enforced.",
];

export const useAgentStore = create<AgentStore>((set) => ({
  agents: {
    ironsight: { status: "HEALTHY" },
    coreintel: { status: "HEALTHY" },
    agentManager: { status: "HEALTHY" },
  },
  intelligenceStream: INITIAL_MESSAGES,
  riskIngestionTerminalLines: [],
  systemLatencyMs: null,
  setAgentStatus: (agent, status) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [agent]: { status },
      },
    })),
  addStreamMessage: (msg) =>
    set((state) => ({
      intelligenceStream: [msg, ...state.intelligenceStream].slice(0, 50),
    })),
  appendRiskIngestionTerminalLine: (line) =>
    set((state) => ({
      riskIngestionTerminalLines: [...state.riskIngestionTerminalLines, line].slice(-100),
    })),
  setSystemLatencyMs: (ms) => set({ systemLatencyMs: ms }),
  runSentinelSweep: (instruction: string) => {
    const now = new Date().toLocaleTimeString();
    const systemMsg = `> [SYSTEM] (${now}) Initializing Sentinel Sweep...`;
    const instrMsg = `> [INSTRUCTION] ${instruction}`;

    // IRONSIGHT begins processing; log messages
    set((state) => ({
      agents: {
        ...state.agents,
        ironsight: { status: "PROCESSING" },
      },
      intelligenceStream: [instrMsg, systemMsg, ...state.intelligenceStream].slice(0, 50),
    }));

    setTimeout(() => {
      const doneTime = new Date().toLocaleTimeString();
      const completeMsg = `> [IRONSIGHT] (${doneTime}) Sweep complete. No anomalies detected.`;
      set((state) => ({
        agents: {
          ...state.agents,
          ironsight: { status: "HEALTHY" },
        },
        intelligenceStream: [completeMsg, ...state.intelligenceStream].slice(0, 50),
      }));
    }, 3000);
  },
}));

