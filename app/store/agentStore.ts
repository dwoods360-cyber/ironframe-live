import { create } from "zustand";
import type { PipelineThreat } from "@/app/store/riskStore";
import { routeTerminalLineToForensicAudit } from "@/app/utils/forensicTerminalRouting";
import { CORE_WORKFORCE_AGENTS } from "@/app/config/agents";
import { resolveDashboardTenantUuid } from "@/app/utils/clientTenantCookie";
import type { WorkforceAgentCanonicalName } from "@/app/utils/agentKillAttribution";
import {
  AGENT_TELEMETRY_PULSE_MS,
  parseWorkforceAgentsFromTelemetryText,
} from "@/app/utils/workforceTelemetryPulse";
import { dispatchIroncastNotificationFromStreamMessage } from "@/app/utils/ironcastNotificationBridge";

const AGENT_KILL_STORAGE_PREFIX = "ironframe-agent-kills-v1:";

function emptyKillLedger(): Record<WorkforceAgentCanonicalName, number> {
  const o = {} as Record<WorkforceAgentCanonicalName, number>;
  for (const a of CORE_WORKFORCE_AGENTS) {
    o[a.name as WorkforceAgentCanonicalName] = 0;
  }
  return o;
}

function tenantKeyForKills(): string {
  if (typeof document === "undefined") return "global";
  return resolveDashboardTenantUuid(null) ?? "global";
}

function loadKillLedger(): Record<WorkforceAgentCanonicalName, number> {
  const base = emptyKillLedger();
  if (typeof localStorage === "undefined") return base;
  try {
    const raw = localStorage.getItem(`${AGENT_KILL_STORAGE_PREFIX}${tenantKeyForKills()}`);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Record<string, number>;
    for (const a of CORE_WORKFORCE_AGENTS) {
      const v = parsed[a.name];
      if (typeof v === "number" && v >= 0) base[a.name as WorkforceAgentCanonicalName] = v;
    }
    return base;
  } catch {
    return base;
  }
}

function persistKillLedger(kills: Record<WorkforceAgentCanonicalName, number>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(`${AGENT_KILL_STORAGE_PREFIX}${tenantKeyForKills()}`, JSON.stringify(kills));
  } catch {
    /* ignore quota */
  }
}

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

export type ThreatTelemetryStatus = "ASSIGNED" | "PROCESSING" | "VERIFIED";

export type ThreatTelemetryEntry = {
  status: ThreatTelemetryStatus;
  /** Blue mitigation pulse should override amber heartbeat when true. */
  irontechMitigating?: boolean;
};

/** HUD flash when expert lifecycle emits AGENT_PIVOT (2s amber pulse on Active Risks card). */
export type AgentPivotFlashState = { threatId: string; until: number } | null;

type AgentStore = {
  agents: Record<AgentKey, AgentState>;
  /** Constitutional 19-agent fleet — increments when a threat card is resolved (tenant-scoped persistence). */
  agentKills: Record<WorkforceAgentCanonicalName, number>;
  hydrateAgentKillsFromStorage: () => void;
  incrementAgentKill: (agentName: WorkforceAgentCanonicalName) => void;
  /** Sum of per-agent kill counts (resolved threats attributed to the 19-agent roster). */
  getTotalKillCount: () => number;
  intelligenceStream: string[];
  /** Local optimistic active cards (simple list). */
  activeThreats: PipelineThreat[];
  /** DMZ / IRONWAVE poller — lines shown under RISK INGESTION (ThreatPipeline). */
  riskIngestionTerminalLines: string[];
  /** Dashboard / API scope — Ironwave telemetry applies only when aligned with card tenant. */
  telemetryTenantScope: string | null;
  ironwaveTelemetry: IronwaveTelemetry;
  /** Optional per-threat visual telemetry for selector narrowing in card components. */
  threatTelemetry: Record<string, ThreatTelemetryEntry | undefined>;
  /** System latency in ms (e.g. from DB query); used for High Load warning when GRCBOT at 100 companies */
  systemLatencyMs: number | null;
  /** Expert strategic pivot — drives amber border + overlay on matching ThreatCard until `until` epoch. */
  agentPivotFlash: AgentPivotFlashState;
  /** Real-time telemetry pulse — agent name → epoch ms when emerald indicator expires. */
  agentTelemetryPulseUntil: Record<string, number>;
  flashAgentPivot: (threatId: string, durationMs?: number) => void;
  clearAgentPivotFlash: () => void;
  setAgentStatus: (agent: AgentKey, status: AgentStatus) => void;
  addStreamMessage: (msg: string) => void;
  addActiveThreat: (threat: PipelineThreat) => void;
  setInitialThreats: (newThreats: PipelineThreat[]) => PipelineThreat[];
  /** Drop optimistic active-card scratch (tenant switch / strict board refetch). */
  clearActiveThreatScratch: () => void;
  clearActiveThreatById: (id: string) => void;
  appendRiskIngestionTerminalLine: (line: string) => void;
  /** Clear DMZ terminal scratch without resetting intelligence stream (e.g. L6 mock drill). */
  clearRiskIngestionTerminalLines: () => void;
  setTelemetryTenantScope: (uuid: string | null) => void;
  /** Advance phase when not locked (heartbeat). Returns false if Irongate lock is holding. */
  setIronwaveFromHeartbeat: (phase: IronwaveTelemetryPhase) => boolean;
  /** Force phase for lockMs (Irongate / Ironscribe terminal lines). */
  setIronwaveLocked: (phase: IronwaveTelemetryPhase, lockMs: number) => void;
  setThreatTelemetry: (threatId: string, telemetry: ThreatTelemetryEntry | null) => void;
  setSystemLatencyMs: (ms: number | null) => void;
  /** Flash roster indicators from Audit Intelligence / DMZ terminal actor tags. */
  pulseAgentsFromTelemetry: (agentNames: readonly string[], threadId?: string) => void;
  pulseAgentsFromTelemetryText: (text: string, threadId?: string) => void;
  runSentinelSweep: (instruction: string) => void;
  /** Master purge: intelligence stream, ingestion lines, DMZ telemetry scratch — back to cold-boot baseline. */
  resetAgentStreamsForPurge: () => void;
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
  agentKills: emptyKillLedger(),
  hydrateAgentKillsFromStorage: () => {
    set({ agentKills: loadKillLedger() });
  },
  incrementAgentKill: (agentName) => {
    const roster = new Set(CORE_WORKFORCE_AGENTS.map((a) => a.name));
    const key = roster.has(agentName) ? agentName : ("Irontech" as WorkforceAgentCanonicalName);
    set((state) => {
      const prev = state.agentKills[key] ?? 0;
      const next = { ...state.agentKills, [key]: prev + 1 };
      persistKillLedger(next);
      return { agentKills: next };
    });
  },
  getTotalKillCount: () =>
    Object.values(get().agentKills).reduce((sum, n) => sum + (typeof n === "number" ? n : 0), 0),
  intelligenceStream: INITIAL_MESSAGES,
  activeThreats: [],
  riskIngestionTerminalLines: [],
  telemetryTenantScope: null,
  ironwaveTelemetry: {
    phase: "ASSIGNED",
    tenantUuid: null,
    lockedUntil: 0,
  },
  threatTelemetry: {},
  systemLatencyMs: null,
  agentPivotFlash: null,
  agentTelemetryPulseUntil: {},
  flashAgentPivot: (threatId, durationMs = 2000) => {
    if (typeof window === "undefined") return;
    const tid = threatId.trim();
    if (!tid) return;
    const until = Date.now() + durationMs;
    set({ agentPivotFlash: { threatId: tid, until } });
    window.setTimeout(() => {
      const cur = get().agentPivotFlash;
      if (cur?.threatId === tid && cur.until === until) {
        set({ agentPivotFlash: null });
      }
    }, durationMs);
  },
  clearAgentPivotFlash: () => set({ agentPivotFlash: null }),
  setAgentStatus: (agent, status) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [agent]: { status },
      },
    })),
  addStreamMessage: (msg) => {
    const trimmed = msg.trim();
    if (trimmed) {
      get().pulseAgentsFromTelemetryText(trimmed);
      dispatchIroncastNotificationFromStreamMessage(trimmed);
    }
    set((state) => ({
      intelligenceStream: [msg, ...state.intelligenceStream].slice(0, 50),
    }));
  },
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
  /** Clear optimistic active-card scratch (tenant switch / board refetch). */
  clearActiveThreatScratch: () => set({ activeThreats: [] }),
  clearActiveThreatById: (id) =>
    set((state) => ({
      activeThreats: state.activeThreats.filter((t) => t.id !== id),
    })),
  clearRiskIngestionTerminalLines: () => set({ riskIngestionTerminalLines: [] }),
  appendRiskIngestionTerminalLine: (line) => {
    routeTerminalLineToForensicAudit(line);
    set((state) => {
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
      if (ironwaveTelemetry === state.ironwaveTelemetry) return state;
      return { ironwaveTelemetry };
    });
  },
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
  setThreatTelemetry: (threatId, telemetry) =>
    set((state) => {
      const id = threatId.trim();
      if (!id) return state;
      if (telemetry == null) {
        if (!(id in state.threatTelemetry)) return state;
        const next = { ...state.threatTelemetry };
        delete next[id];
        return { threatTelemetry: next };
      }
      const prev = state.threatTelemetry[id];
      if (
        prev?.status === telemetry.status &&
        Boolean(prev?.irontechMitigating) === Boolean(telemetry.irontechMitigating)
      ) {
        return state;
      }
      return {
        threatTelemetry: {
          ...state.threatTelemetry,
          [id]: telemetry,
        },
      };
    }),
  setSystemLatencyMs: (ms) => set({ systemLatencyMs: ms }),
  pulseAgentsFromTelemetry: (agentNames, threadId) => {
    if (typeof window === "undefined") return;
    const roster = new Set(CORE_WORKFORCE_AGENTS.map((a) => a.name));
    const until = Date.now() + AGENT_TELEMETRY_PULSE_MS;
    const matched = agentNames.filter((n) => roster.has(n.trim()));
    if (matched.length === 0) return;

    set((state) => {
      const next = { ...state.agentTelemetryPulseUntil };
      for (const name of matched) {
        next[name] = until;
      }
      return { agentTelemetryPulseUntil: next };
    });

    const tid = threadId?.trim();
    if (tid) {
      get().setThreatTelemetry(tid, { status: "PROCESSING" });
    }

    window.setTimeout(() => {
      set((state) => {
        let changed = false;
        const next = { ...state.agentTelemetryPulseUntil };
        for (const name of matched) {
          if (next[name] === until) {
            delete next[name];
            changed = true;
          }
        }
        return changed ? { agentTelemetryPulseUntil: next } : state;
      });
      if (tid) {
        get().setThreatTelemetry(tid, { status: "VERIFIED" });
      }
    }, AGENT_TELEMETRY_PULSE_MS);
  },
  pulseAgentsFromTelemetryText: (text, threadId) => {
    const agents = parseWorkforceAgentsFromTelemetryText(text);
    if (agents.length === 0) return;
    get().pulseAgentsFromTelemetry(agents, threadId);
  },
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
  resetAgentStreamsForPurge: () =>
    set({
      intelligenceStream: [...INITIAL_MESSAGES],
      riskIngestionTerminalLines: [],
      activeThreats: [],
      threatTelemetry: {},
      agentPivotFlash: null,
      agentTelemetryPulseUntil: {},
      ironwaveTelemetry: {
        phase: "ASSIGNED",
        tenantUuid: null,
        lockedUntil: 0,
      },
      systemLatencyMs: null,
      agents: {
        ironsight: { status: "HEALTHY" },
        coreintel: { status: "HEALTHY" },
        agentManager: { status: "HEALTHY" },
      },
    }),
}));

