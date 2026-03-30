import { create } from "zustand";
import type { PipelineThreat } from "@/app/store/riskStore";

export type AgentKey = "ironsight" | "coreintel" | "agentManager";

export type AgentStatus = "HEALTHY" | "PROCESSING" | "OFFLINE" | "WARNING" | "ACTIVE_DEFENSE";

type AgentState = {
  status: AgentStatus;
};

type AgentStore = {
  agents: Record<AgentKey, AgentState>;
  intelligenceStream: string[];
  /** Optimistic active cards pushed before realtime/db sync catches up. */
  activeThreats: Array<PipelineThreat & { isLocalOnly?: boolean; localCreatedAt?: string }>;
  /** IDs pinned across stale syncs until realtime INSERT confirms handoff. */
  persistentIds: Set<string>;
  /** DMZ / IRONWAVE poller — lines shown under RISK INGESTION (ThreatPipeline). */
  riskIngestionTerminalLines: string[];
  /** System latency in ms (e.g. from DB query); used for High Load warning when GRCBOT at 100 companies */
  systemLatencyMs: number | null;
  setAgentStatus: (agent: AgentKey, status: AgentStatus) => void;
  addStreamMessage: (msg: string) => void;
  addActiveThreat: (threat: PipelineThreat) => void;
  /** Sync helper: merge server list without dropping persistent optimistic IDs. */
  setInitialThreats: (newThreats: PipelineThreat[]) => PipelineThreat[];
  mergeActiveThreatsWithPersistence: (serverThreats: PipelineThreat[]) => PipelineThreat[];
  removePersistentId: (id: string) => void;
  markActiveThreatConfirmed: (id: string) => void;
  clearActiveThreatById: (id: string) => void;
  appendRiskIngestionTerminalLine: (line: string) => void;
  setSystemLatencyMs: (ms: number | null) => void;
  runSentinelSweep: (instruction: string) => void;
};

const INITIAL_MESSAGES: string[] = [
  "> [SYSTEM] System Online. Core Vault synced.",
  "> [SYSTEM] Zero-trust Architecture enforced.",
];

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: {
    ironsight: { status: "HEALTHY" },
    coreintel: { status: "HEALTHY" },
    agentManager: { status: "HEALTHY" },
  },
  intelligenceStream: INITIAL_MESSAGES,
  activeThreats: [],
  persistentIds: new Set<string>(),
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
  addActiveThreat: (threat) =>
    set((state) => {
      const tid = threat.id?.trim();
      if (!tid) return state;
      if (state.activeThreats.some((t) => t.id === tid)) return state;
      const nextPersistent = new Set(state.persistentIds);
      nextPersistent.add(tid);
      const nowIso = new Date().toISOString();
      const createdAtIso =
        typeof threat.createdAt === "string" && !Number.isNaN(Date.parse(threat.createdAt))
          ? threat.createdAt
          : nowIso;
      return {
        persistentIds: nextPersistent,
        activeThreats: [
          {
            ...threat,
            id: tid,
            createdAt: createdAtIso,
            isLocalOnly: true,
            localCreatedAt: createdAtIso,
          },
          ...state.activeThreats,
        ].slice(0, 200),
      };
    }),
  setInitialThreats: (newThreats) => {
    const state = get();
    const serverById = new Map(newThreats.map((t) => [t.id, t]));
    const pinnedLocal = state.activeThreats.filter(
      (t) => state.persistentIds.has(t.id) && !serverById.has(t.id),
    );
    return [...newThreats, ...pinnedLocal];
  },
  mergeActiveThreatsWithPersistence: (serverThreats) => {
    const state = get();
    const serverById = new Map(serverThreats.map((t) => [t.id, t]));
    const pinnedLocal = state.activeThreats.filter(
      (t) => state.persistentIds.has(t.id) && !serverById.has(t.id),
    );
    return [...serverThreats, ...pinnedLocal];
  },
  removePersistentId: (id) =>
    set((state) => ({
      persistentIds: new Set([...state.persistentIds].filter((x) => x !== id)),
    })),
  markActiveThreatConfirmed: (id) =>
    set((state) => ({
      persistentIds: new Set([...state.persistentIds].filter((x) => x !== id)),
      activeThreats: state.activeThreats.map((t) =>
        t.id === id ? { ...t, isLocalOnly: false } : t,
      ),
    })),
  clearActiveThreatById: (id) =>
    set((state) => ({
      activeThreats: state.activeThreats.filter((t) => t.id !== id),
    })),
  appendRiskIngestionTerminalLine: (line) =>
    set((state) => {
      const prev = state.riskIngestionTerminalLines;
      if (prev.length > 0 && prev[prev.length - 1] === line) return state;
      return {
        riskIngestionTerminalLines: [...prev, line].slice(-100),
      };
    }),
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

