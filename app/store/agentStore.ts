import { create } from "zustand";
import type { PipelineThreat } from "@/app/store/riskStore";

/** Ironwave (DMZ) visual telemetry — v1.0 state machine (tenant-scoped). */
export type IronwaveTelemetryPhase = "ASSIGNED" | "SCANNING" | "VERIFIED";

export type AgentKey = "ironsight" | "coreintel" | "agentManager";

export type AgentStatus = "HEALTHY" | "PROCESSING" | "OFFLINE" | "WARNING" | "ACTIVE_DEFENSE";

type AgentState = {
  status: AgentStatus;
};

type IronwaveTelemetry = {
  phase: IronwaveTelemetryPhase;
  tenantUuid: string | null;
  /** Epoch ms — while active, heartbeat must not overwrite Irongate / Ironscribe pulses. */
  lockedUntil: number;
};

type AgentStore = {
  agents: Record<AgentKey, AgentState>;
  intelligenceStream: string[];
  /** Local optimistic active cards (simple list). */
  activeThreats: PipelineThreat[];
  /** DMZ / IRONWAVE poller — lines shown under RISK INGESTION (ThreatPipeline). */
  riskIngestionTerminalLines: string[];
  /** Dashboard / API scope — Ironwave telemetry applies only when aligned with card tenant. */
  telemetryTenantScope: string | null;
  ironwaveTelemetry: IronwaveTelemetry;
  /** System latency in ms (e.g. from DB query); used for High Load warning when GRCBOT at 100 companies */
  systemLatencyMs: number | null;
  setAgentStatus: (agent: AgentKey, status: AgentStatus) => void;
  addStreamMessage: (msg: string) => void;
  addActiveThreat: (threat: PipelineThreat) => void;
  setInitialThreats: (newThreats: PipelineThreat[]) => PipelineThreat[];
  clearActiveThreatById: (id: string) => void;
  appendRiskIngestionTerminalLine: (line: string) => void;
  setTelemetryTenantScope: (uuid: string | null) => void;
  /** Advance phase when not locked (heartbeat). Returns false if Irongate lock is holding. */
  setIronwaveFromHeartbeat: (phase: IronwaveTelemetryPhase) => boolean;
  /** Force phase for lockMs (Irongate / Ironscribe terminal lines). */
  setIronwaveLocked: (phase: IronwaveTelemetryPhase, lockMs: number) => void;
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
  riskIngestionTerminalLines: [],
  telemetryTenantScope: null,
  ironwaveTelemetry: {
    phase: "ASSIGNED",
    tenantUuid: null,
    lockedUntil: 0,
  },
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
      return {
        activeThreats: [{ ...threat, id: tid }, ...state.activeThreats].slice(0, 200),
      };
    }),
  setInitialThreats: (newThreats) => newThreats,
  clearActiveThreatById: (id) =>
    set((state) => ({
      activeThreats: state.activeThreats.filter((t) => t.id !== id),
    })),
  appendRiskIngestionTerminalLine: (line) =>
    set((state) => {
      const prev = state.riskIngestionTerminalLines;
      if (prev.length > 0 && prev[prev.length - 1] === line) return state;
      const tenant = state.telemetryTenantScope;
      let ironwaveTelemetry = state.ironwaveTelemetry;
      if (tenant) {
        const u = line.toUpperCase();
        if (/\[?IRONLOCK|IRONGATE/.test(u)) {
          ironwaveTelemetry = {
            phase: "SCANNING",
            tenantUuid: tenant,
            lockedUntil: Date.now() + 2800,
          };
        } else if (/IRONSCRIBE|IRONTRUST/.test(u)) {
          ironwaveTelemetry = {
            phase: "VERIFIED",
            tenantUuid: tenant,
            lockedUntil: Date.now() + 2400,
          };
        }
      }
      return {
        riskIngestionTerminalLines: [...prev, line].slice(-100),
        ironwaveTelemetry,
      };
    }),
  setTelemetryTenantScope: (uuid) => set({ telemetryTenantScope: uuid }),
  setIronwaveFromHeartbeat: (phase) => {
    const state = get();
    if (Date.now() < state.ironwaveTelemetry.lockedUntil) {
      return false;
    }
    set({
      ironwaveTelemetry: {
        phase,
        tenantUuid: state.telemetryTenantScope,
        lockedUntil: 0,
      },
    });
    return true;
  },
  setIronwaveLocked: (phase, lockMs) =>
    set((s) => ({
      ironwaveTelemetry: {
        phase,
        tenantUuid: s.telemetryTenantScope,
        lockedUntil: Date.now() + lockMs,
      },
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

