import { create } from 'zustand';
import {
  acknowledgeThreatAction,
  confirmThreatAction,
  resolveThreatAction,
  deAcknowledgeThreatAction,
  revertThreatToPipelineAction,
  addWorkNoteAction,
} from '@/app/actions/threatActions';
import type { CurrencyMagnitude } from "@/app/utils/riskFormatting";
import { appendAuditLog } from "@/app/utils/auditLogger";

/**
 * useRiskStore — GRC pipeline, selectedThreatId (drawer), industry/tenant.
 * Naming convention (do not rename in refactors):
 * - analystNotes / notes: threat.notes from API; analystNoteDraft in drawer; analystNotes prop to panel (full-text).
 * - auditLogs: not in riskStore; use useAuditLoggerStore for audit log array.
 */

export type ThreatWorkNote = {
  timestamp: string;
  text: string;
  user: string;
};

export type LifecycleState = "pipeline" | "active" | "confirmed" | "resolved";

export type PipelineThreat = {
  id: string;
  name: string;
  loss: number;
  industry?: string;
  /** Optional description/details for richer triage context */
  description?: string;
  source?: string;
  /** Editable score in $M; when set, used for liability/preview instead of loss */
  score?: number;
  likelihood?: number;
  impact?: number;
  calculatedRiskScore?: number;
  userNotes?: string;
  /** Editable target (e.g. entity or custom label) */
  target?: string;
  /** Free-form notes captured during triage */
  notes?: string[];
  /** Structured work notes for lifecycle tracking */
  workNotes?: ThreatWorkNote[];
  /** Last triage action applied in the pipeline */
  lastTriageAction?: "ACKNOWLEDGE" | "DEACKNOWLEDGE";
  /** Lifecycle state across pipeline/active/confirmed/resolved */
  lifecycleState?: LifecycleState;
  /** Optional de-acknowledgement reason selected during triage */
  deackReason?: string;
};

type ThreatIndexById = Record<string, PipelineThreat>;
type HistoricalThreatNames = Record<string, string>;
const pendingHistoricalThreatLookups = new Set<string>();

function buildThreatIndexById(
  pipelineThreats: PipelineThreat[],
  activeThreats: PipelineThreat[],
): ThreatIndexById {
  const index: ThreatIndexById = {};
  for (const threat of pipelineThreats) {
    index[threat.id] = threat;
  }
  for (const threat of activeThreats) {
    index[threat.id] = threat;
  }
  return index;
}

interface RiskState {
  // Sidebar Top Threats (Ransomware, Breach, etc.) — accepted threats that count toward risk
  activeSidebarThreats: string[];
  toggleSidebarThreat: (id: string) => void;
  clearActiveSidebarThreats: () => void;

  // GRC Pipeline: threats pending triage (Accept → active + remediation; Reject → remove)
  pipelineThreats: PipelineThreat[];
  activeThreats: PipelineThreat[];
  threatIndexById: ThreatIndexById;
  historicalThreatNames: HistoricalThreatNames;
  resolveHistoricalThreatName: (id: string) => Promise<void>;
  /** Authoritative DB sync replacement (kills stale/ghost pipeline cards). */
  replacePipelineThreats: (threats: PipelineThreat[]) => void;
  /** Incremental bot/client upsert (add/update one threat without dropping others). */
  upsertPipelineThreat: (threat: PipelineThreat) => void;
  /** Authoritative DB sync replacement for active threats. */
  replaceActiveThreats: (threats: PipelineThreat[]) => void;
  addThreatToPipeline: (threat: PipelineThreat) => void;
  setPipelineThreats: (threats: PipelineThreat[]) => void;
  removeThreatFromPipeline: (id: string) => void;
  updatePipelineThreat: (
    id: string,
    payload: {
      score?: number;
      target?: string;
      notes?: string[];
      workNotes?: ThreatWorkNote[];
      lastTriageAction?: "ACKNOWLEDGE" | "DEACKNOWLEDGE";
      lifecycleState?: LifecycleState;
      deackReason?: string;
      userNotes?: string;
      likelihood?: number;
      impact?: number;
      calculatedRiskScore?: number;
    }
  ) => void;
  acceptPipelineThreat: (id: string) => void;

  // GRC lifecycle actions (server-backed)
  acknowledgeThreat: (id: string, operatorId: string, justification: string | undefined, tenantId: string) => Promise<void>;
  confirmThreat: (id: string, operatorId: string) => Promise<void>;
  resolveThreat: (id: string, operatorId: string) => Promise<void>;
  deAcknowledgeThreat: (
    id: string,
    tenantId: string,
    reason: string,
    justification: string,
    operatorId: string,
  ) => Promise<{ success: true } | { success: false; error: string }>;
  /** Re-escalate: move threat from Active back to Attack Velocity pipeline (requires tenantId). */
  revertThreatToPipeline: (id: string, tenantId: string, operatorId: string) => Promise<void>;
  addWorkNote: (threatId: string, text: string, operatorId: string) => Promise<void>;

  // Accepted threat impacts ($M) for header/left sidebar sync (id -> impact in millions)
  acceptedThreatImpacts: Record<string, number>;

  // Main Dashboard Active Risks (Azure API, Palo Alto, etc.)
  dashboardLiabilities: Record<string, number>;
  setDashboardLiability: (id: string, liabilityInMillions: number) => void;
  removeDashboardLiability: (id: string) => void;

  // Scenario 3: Risk Reduction (AI Remediation lowers global risk in real-time)
  riskOffset: number;
  riskReductionFlash: boolean;
  applyRiskReduction: (amountInMillions: number) => void;
  clearRiskReductionFlash: () => void;

  // Global industry profile (synced from StrategicIntel)
  selectedIndustry: string;
  setSelectedIndustry: (industry: string) => void;

  // Selected tenant/company view (Consultant / Enterprise mode)
  selectedTenantName: string | null;
  setSelectedTenantName: (tenantName: string | null) => void;

  // Accepted threat industry (id -> sector) for industry-filtered liability
  acceptedThreatIndustries: Record<string, string>;

  // High-liability alert (toast): set when a >$10M agent signal is un-ingested >15 min
  liabilityAlert: { active: boolean; message?: string; signalId?: string };
  setLiabilityAlert: (alert: { active: boolean; message?: string; signalId?: string }) => void;

  // Live monitoring pulse: rawSignals + high-priority alerts count (set by ThreatPipeline, read by TopNav)
  liveMonitoringCount: number;
  setLiveMonitoringCount: (n: number) => void;

  /** Remove simulation-sourced threats from activeThreats (grcbot-*, kimbot-*). Used on purge. */
  clearSimulationFromActiveThreats: () => void;

  /** Full reset for purg: pipeline, active, accepted impacts, dashboard liabilities, risk offset. Call after purgeSimulation(). */
  clearAllRiskStateForPurge: () => void;

  /** Sync & Reconcile: remove ghost cards (ids missing from DB) and show toast. */
  removeGhostThreats: (ids: string[]) => void;

  /** Toast: "Record Expired" when ghost cards were removed (count = number removed). */
  recordExpiredToast: { active: boolean; count: number };
  setRecordExpiredToast: (v: { active: boolean; count: number }) => void;

  /** Toast: error from acknowledge/confirm/resolve/deAcknowledge when server action fails. */
  threatActionError: { active: boolean; message: string };
  setThreatActionError: (v: { active: boolean; message: string }) => void;

  /** Threat detail drawer (dashboard): when set, open slide-over for this threat id */
  selectedThreatId: string | null;
  setSelectedThreatId: (id: string | null) => void;

  /** Global currency magnitude selector for risk exposure (AUTO, K, M, B, T). */
  currencyMagnitude: CurrencyMagnitude;
  setCurrencyMagnitude: (scale: CurrencyMagnitude) => void;
  /** Alias for magnitude — external API uses currencyScale to match spec. */
  currencyScale: CurrencyMagnitude;
  setCurrencyScale: (scale: CurrencyMagnitude) => void;

  /** Live financial aggregation: total current risk in cents (exact string for BigInt-safe display). */
  getTotalCurrentRiskCents: () => string;
  /** Live financial aggregation: GRC gap (potential − current) in cents (exact string). */
  getGrcGapCents: () => string;
}

export const useRiskStore = create<RiskState>((set, get) => ({
  // Sidebar State
  activeSidebarThreats: [],
  toggleSidebarThreat: (id) => set((state) => ({
    activeSidebarThreats: state.activeSidebarThreats.includes(id)
      ? state.activeSidebarThreats.filter(t => t !== id)
      : [...state.activeSidebarThreats, id]
  })),
  clearActiveSidebarThreats: () =>
    set((state) => ({
      activeSidebarThreats: [],
      acceptedThreatImpacts: {},
      acceptedThreatIndustries: {},
      activeThreats: [],
      threatIndexById: buildThreatIndexById(state.pipelineThreats, []),
    })),

  pipelineThreats: [],
  activeThreats: [],
  threatIndexById: {},
  historicalThreatNames: {},
  acceptedThreatImpacts: {},
  replacePipelineThreats: (threats) =>
    set((state) => {
      const normalized = threats.map((threat) => ({
        ...threat,
        lifecycleState: threat.lifecycleState ?? "pipeline",
        workNotes: threat.workNotes ?? [],
      }));
      return {
        pipelineThreats: normalized,
        threatIndexById: buildThreatIndexById(normalized, state.activeThreats),
      };
    }),
  upsertPipelineThreat: (threat) =>
    set((state) => {
      const normalized: PipelineThreat = {
        ...threat,
        lifecycleState: threat.lifecycleState ?? "pipeline",
        workNotes: threat.workNotes ?? [],
      };
      const idx = state.pipelineThreats.findIndex((t) => t.id === normalized.id);
      const nextPipelineThreats =
        idx === -1
          ? [normalized, ...state.pipelineThreats]
          : state.pipelineThreats.map((t, i) => (i === idx ? { ...t, ...normalized } : t));
      return {
        pipelineThreats: nextPipelineThreats,
        threatIndexById: buildThreatIndexById(nextPipelineThreats, state.activeThreats),
      };
    }),
  replaceActiveThreats: (threats) =>
    set((state) => {
      const normalized = threats.map((threat) => ({
        ...threat,
        lifecycleState: threat.lifecycleState ?? "active",
        workNotes: threat.workNotes ?? [],
      }));
      return {
        activeThreats: normalized,
        threatIndexById: buildThreatIndexById(state.pipelineThreats, normalized),
      };
    }),
  addThreatToPipeline: (threat) => set((state) => {
    const nextPipelineThreats = state.pipelineThreats.some((t) => t.id === threat.id)
      ? state.pipelineThreats
      : [
          {
            ...threat,
            lifecycleState: threat.lifecycleState ?? "pipeline",
            workNotes: threat.workNotes ?? [],
          },
          ...state.pipelineThreats,
        ];
    return {
      pipelineThreats: nextPipelineThreats,
      threatIndexById: buildThreatIndexById(nextPipelineThreats, state.activeThreats),
    };
  }),
  removeThreatFromPipeline: (id) => set((state) => ({
    pipelineThreats: state.pipelineThreats.filter((t) => t.id !== id),
    threatIndexById: buildThreatIndexById(
      state.pipelineThreats.filter((t) => t.id !== id),
      state.activeThreats,
    ),
  })),
  setPipelineThreats: (threats) =>
    set((state) => {
      const normalized = threats.map((threat) => ({
        ...threat,
        lifecycleState: threat.lifecycleState ?? "pipeline",
        workNotes: threat.workNotes ?? [],
      }));
      return {
        pipelineThreats: normalized,
        threatIndexById: buildThreatIndexById(normalized, state.activeThreats),
      };
    }),
  updatePipelineThreat: (id, payload) => set((state) => ({
    pipelineThreats: state.pipelineThreats.map((t) =>
      t.id !== id ? t : { ...t, ...payload }
    ),
    threatIndexById: buildThreatIndexById(
      state.pipelineThreats.map((t) =>
        t.id !== id ? t : { ...t, ...payload }
      ),
      state.activeThreats,
    ),
  })),
  acceptPipelineThreat: (id) => set((state) => {
    const threat = state.pipelineThreats.find((t) => t.id === id);
    // Use loss (liability in millions) for $M impact; score is severity 1–10 and would truncate decimals (e.g. 7.8 → 8).
    const impactM = threat ? (threat.loss ?? threat.score) : 0;
    const impactRounded = typeof impactM === 'number' ? Number(impactM.toFixed(1)) : 0;
    const newActive = threat && !state.activeSidebarThreats.includes(id)
      ? [...state.activeSidebarThreats, id]
      : state.activeSidebarThreats;
    const newImpacts = threat
      ? { ...state.acceptedThreatImpacts, [id]: impactRounded }
      : state.acceptedThreatImpacts;
    const newIndustries = threat
      ? { ...state.acceptedThreatIndustries, [id]: threat.industry ?? "Healthcare" }
      : state.acceptedThreatIndustries;
    return {
      threatIndexById: buildThreatIndexById(
        state.pipelineThreats.filter((t) => t.id !== id),
        threat && !state.activeThreats.some((t) => t.id === id)
          ? [...state.activeThreats, { ...threat, lifecycleState: "active" }]
          : state.activeThreats,
      ),
      activeSidebarThreats: newActive,
      pipelineThreats: state.pipelineThreats.filter((t) => t.id !== id),
      acceptedThreatImpacts: newImpacts,
      acceptedThreatIndustries: newIndustries,
      activeThreats:
        threat && !state.activeThreats.some((t) => t.id === id)
          ? [...state.activeThreats, { ...threat, lifecycleState: "active" }]
          : state.activeThreats,
    };
  }),
  acknowledgeThreat: async (id, operatorId, justification, tenantId) => {
    try {
      const result = await acknowledgeThreatAction(id, tenantId, operatorId, justification);
      if (result && typeof result === "object" && "success" in result && result.success === false) {
        set({
          threatActionError: {
            active: true,
            message: result.error || "Acknowledge failed due to invalid tenant mapping.",
          },
        });
        throw new Error(result.error);
      }
      const stateAtAck = get();
      const ackedThreat = stateAtAck.threatIndexById[id] ?? stateAtAck.pipelineThreats.find((t) => t.id === id);
      appendAuditLog({
        action_type: "GRC_ACKNOWLEDGE_CLICK",
        log_type: "GRC",
        description: `Threat acknowledged: ${ackedThreat?.name ?? id}`,
        user_id: operatorId,
        metadata_tag: `industry:${ackedThreat?.industry ?? stateAtAck.selectedIndustry}|tenant:${stateAtAck.selectedTenantName ?? "GLOBAL"}|threatId:${id}`,
      });
      set((state) => {
        const threat = state.pipelineThreats.find((t) => t.id === id);
        // Use loss (liability in millions) for $M impact; score is severity 1–10 and would truncate decimals.
        const impactM = threat ? (threat.loss ?? threat.score) : 0;
        const impactRounded = typeof impactM === 'number' ? Number(impactM.toFixed(1)) : 0;
        const newActive = threat && !state.activeSidebarThreats.includes(id)
          ? [...state.activeSidebarThreats, id]
          : state.activeSidebarThreats;
        const newImpacts = threat
          ? { ...state.acceptedThreatImpacts, [id]: impactRounded }
          : state.acceptedThreatImpacts;
        const newIndustries = threat
          ? { ...state.acceptedThreatIndustries, [id]: threat.industry ?? "Healthcare" }
          : state.acceptedThreatIndustries;
        return {
          threatIndexById: buildThreatIndexById(
            state.pipelineThreats.filter((t) => t.id !== id),
            threat && !state.activeThreats.some((t) => t.id === id)
              ? [...state.activeThreats, { ...threat, lifecycleState: "active" }]
              : state.activeThreats,
          ),
          activeSidebarThreats: newActive,
          pipelineThreats: state.pipelineThreats.filter((t) => t.id !== id),
          acceptedThreatImpacts: newImpacts,
          acceptedThreatIndustries: newIndustries,
          activeThreats:
            threat && !state.activeThreats.some((t) => t.id === id)
              ? [...state.activeThreats, { ...threat, lifecycleState: "active" }]
              : state.activeThreats,
        };
      });
    } catch (error) {
      console.error("acknowledgeThreatAction failed", error);
      const msg = error instanceof Error ? error.message : String(error);
      set({
        threatActionError: {
          active: true,
          message: msg.includes("AUDIT_LOG_FAILURE") ? "Threat record not found or already processed." : msg,
        },
      });
      throw error;
    }
  },
  confirmThreat: async (id, operatorId) => {
    try {
      await confirmThreatAction(id, operatorId);
      set((state) => ({
        activeThreats: state.activeThreats.map((t) =>
          t.id === id ? { ...t, lifecycleState: "confirmed" } : t
        ),
        threatIndexById: buildThreatIndexById(
          state.pipelineThreats,
          state.activeThreats.map((t) =>
            t.id === id ? { ...t, lifecycleState: "confirmed" } : t
          ),
        ),
      }));
    } catch (error) {
      console.error("confirmThreatAction failed", error);
      const msg = error instanceof Error ? error.message : String(error);
      set({
        threatActionError: {
          active: true,
          message: msg.includes("AUDIT_LOG_FAILURE") ? "Threat record not found or already processed." : msg,
        },
      });
      throw error;
    }
  },
  resolveThreat: async (id, operatorId) => {
    try {
      const result = await resolveThreatAction(id, operatorId);
      if (!result.success) {
        set({
          threatActionError: { active: true, message: "Threat record not found or could not be resolved." },
        });
        throw new Error("Resolve failed");
      }
      const reductionM = (result.financialRisk_cents ?? 0) / 100_000_000;
      set((state) => {
        const nextImpacts = { ...state.acceptedThreatImpacts };
        delete nextImpacts[id];
        const nextIndustries = { ...state.acceptedThreatIndustries };
        delete nextIndustries[id];
        return {
          riskOffset: state.riskOffset + reductionM,
          activeThreats: state.activeThreats.filter((t) => t.id !== id),
          activeSidebarThreats: state.activeSidebarThreats.filter((tid) => tid !== id),
          acceptedThreatImpacts: nextImpacts,
          acceptedThreatIndustries: nextIndustries,
          threatIndexById: buildThreatIndexById(
            state.pipelineThreats,
            state.activeThreats.filter((t) => t.id !== id),
          ),
        };
      });
    } catch (error) {
      console.error("resolveThreatAction failed", error);
      const msg = error instanceof Error ? error.message : String(error);
      set({
        threatActionError: {
          active: true,
          message: msg.includes("AUDIT_LOG_FAILURE") ? "Threat record not found or already processed." : msg,
        },
      });
      throw error;
    }
  },
  deAcknowledgeThreat: async (id, tenantId, reason, justification, operatorId) => {
    try {
      const result = await deAcknowledgeThreatAction(id, tenantId, reason, justification, operatorId);
      if (result && typeof result === "object" && "success" in result && result.success === false) {
        set({
          threatActionError: {
            active: true,
            message: "Action failed: Record no longer exists.",
          },
        });
        return { success: false, error: result.error };
      }
      set((state) => {
        const nextImpacts = { ...state.acceptedThreatImpacts };
        delete nextImpacts[id];
        const nextIndustries = { ...state.acceptedThreatIndustries };
        delete nextIndustries[id];
        return {
          pipelineThreats: state.pipelineThreats.filter((t) => t.id !== id),
          activeThreats: state.activeThreats.filter((t) => t.id !== id),
          acceptedThreatImpacts: nextImpacts,
          acceptedThreatIndustries: nextIndustries,
          threatIndexById: buildThreatIndexById(
            state.pipelineThreats.filter((t) => t.id !== id),
            state.activeThreats.filter((t) => t.id !== id),
          ),
        };
      });
      return { success: true };
    } catch (error) {
      console.error("deAcknowledgeThreatAction failed", error);
      const msg = error instanceof Error ? error.message : String(error);
      set({
        threatActionError: {
          active: true,
          message: msg.includes("AUDIT_LOG_FAILURE") ? "Threat record not found or already processed." : msg,
        },
      });
      return { success: false, error: msg };
    }
  },
  revertThreatToPipeline: async (id, tenantId, operatorId) => {
    try {
      const result = await revertThreatToPipelineAction(id, tenantId, operatorId);
      if (result && typeof result === "object" && "success" in result && result.success === false) {
        set({
          threatActionError: {
            active: true,
            message: "Revert failed: Record no longer exists.",
          },
        });
        throw new Error((result as { error?: string }).error);
      }
      set((state) => {
        const threat = state.activeThreats.find((t) => t.id === id);
        if (!threat) return state;
        const asPipeline = { ...threat, lifecycleState: "pipeline" as const };
        const nextPipeline = [asPipeline, ...state.pipelineThreats.filter((t) => t.id !== id)];
        const nextActive = state.activeThreats.filter((t) => t.id !== id);
        const nextImpacts = { ...state.acceptedThreatImpacts };
        delete nextImpacts[id];
        const nextIndustries = { ...state.acceptedThreatIndustries };
        delete nextIndustries[id];
        return {
          pipelineThreats: nextPipeline,
          activeThreats: nextActive,
          acceptedThreatImpacts: nextImpacts,
          acceptedThreatIndustries: nextIndustries,
          activeSidebarThreats: state.activeSidebarThreats.filter((tid) => tid !== id),
          threatIndexById: buildThreatIndexById(nextPipeline, nextActive),
        };
      });
    } catch (error) {
      console.error("revertThreatToPipelineAction failed", error);
      const msg = error instanceof Error ? error.message : String(error);
      set({
        threatActionError: {
          active: true,
          message: msg.includes("Irongate") ? msg : "Revert to pipeline failed.",
        },
      });
      throw error;
    }
  },
  addWorkNote: async (threatId, text, operatorId) => {
    try {
      await addWorkNoteAction(threatId, text, operatorId);
    } catch (error) {
      console.error('addWorkNoteAction failed', error);
    }
  },

  // Dashboard State
  dashboardLiabilities: {},
  setDashboardLiability: (id, liability) => set((state) => ({
    dashboardLiabilities: { ...state.dashboardLiabilities, [id]: liability }
  })),
  removeDashboardLiability: (id) => set((state) => {
    const newLiabilities = { ...state.dashboardLiabilities };
    delete newLiabilities[id];
    return { dashboardLiabilities: newLiabilities };
  }),

  riskOffset: 0,
  riskReductionFlash: false,
  applyRiskReduction: (amountInMillions) => set((state) => ({
    riskOffset: state.riskOffset + amountInMillions,
    riskReductionFlash: true,
  })),
  clearRiskReductionFlash: () => set({ riskReductionFlash: false }),

  selectedIndustry: "Healthcare",
  setSelectedIndustry: (industry) => set({ selectedIndustry: industry }),

  selectedTenantName: null,
  setSelectedTenantName: (tenantName) => set({ selectedTenantName: tenantName }),

  acceptedThreatIndustries: {},
  // Set industry when acknowledging/accepting so liability can be filtered by industry
  liabilityAlert: { active: false },
  setLiabilityAlert: (alert) => set({ liabilityAlert: alert }),

  liveMonitoringCount: 0,
  setLiveMonitoringCount: (n) => set({ liveMonitoringCount: n }),

  clearSimulationFromActiveThreats: () =>
    set((state) => ({
      activeThreats: state.activeThreats.filter(
        (t) => !t.id.startsWith("grcbot-") && !t.id.startsWith("kimbot-")
      ),
      threatIndexById: buildThreatIndexById(
        state.pipelineThreats,
        state.activeThreats.filter(
          (t) => !t.id.startsWith("grcbot-") && !t.id.startsWith("kimbot-")
        ),
      ),
    })),

  clearAllRiskStateForPurge: () =>
    set({
      pipelineThreats: [],
      activeThreats: [],
      activeSidebarThreats: [],
      acceptedThreatImpacts: {},
      acceptedThreatIndustries: {},
      dashboardLiabilities: {},
      riskOffset: 0,
      threatIndexById: {},
    }),

  removeGhostThreats: (ids) =>
    set((state) => {
      const set = new Set(ids);
      const newPipeline = state.pipelineThreats.filter((t) => !set.has(t.id));
      const newActive = state.activeThreats.filter((t) => !set.has(t.id));
      const newSidebar = state.activeSidebarThreats.filter((id) => !set.has(id));
      const newImpacts = { ...state.acceptedThreatImpacts };
      const newIndustries = { ...state.acceptedThreatIndustries };
      ids.forEach((id) => {
        delete newImpacts[id];
        delete newIndustries[id];
      });
      return {
        pipelineThreats: newPipeline,
        activeThreats: newActive,
        activeSidebarThreats: newSidebar,
        acceptedThreatImpacts: newImpacts,
        acceptedThreatIndustries: newIndustries,
        threatIndexById: buildThreatIndexById(newPipeline, newActive),
      };
    }),

  recordExpiredToast: { active: false, count: 0 },
  setRecordExpiredToast: (v) => set({ recordExpiredToast: v }),

  threatActionError: { active: false, message: "" },
  setThreatActionError: (v) => set({ threatActionError: v }),

  selectedThreatId: null,
  setSelectedThreatId: (id) => set({ selectedThreatId: id }),

  currencyMagnitude: "AUTO",
  currencyScale: "AUTO",
  setCurrencyMagnitude: (scale) => set({ currencyMagnitude: scale, currencyScale: scale }),
  setCurrencyScale: (scale) => set({ currencyMagnitude: scale, currencyScale: scale }),

  getTotalCurrentRiskCents: () => {
    const state = get();
    const sumAcceptedM = Object.values(state.acceptedThreatImpacts).reduce((a, b) => a + b, 0);
    const sumDashboardM = Object.values(state.dashboardLiabilities).reduce((a, b) => a + b, 0);
    const offsetM = state.riskOffset;
    const totalM = Math.max(0, sumAcceptedM + sumDashboardM - offsetM);
    const cents = BigInt(Math.round(totalM * 100_000_000));
    return cents.toString();
  },

  getGrcGapCents: () => {
    const state = get();
    const industry = state.selectedIndustry ?? "Healthcare";
    const baseImpactByIndustry: Record<string, number> = {
      Healthcare: 15.2,
      Finance: 18.0,
      Energy: 17.0,
      Technology: 12.0,
      Defense: 16.0,
    };
    const baseImpactM = baseImpactByIndustry[industry] ?? 15.2;
    const sumAcceptedM = Object.values(state.acceptedThreatImpacts).reduce((a, b) => a + b, 0);
    const sumDashboardM = Object.values(state.dashboardLiabilities).reduce((a, b) => a + b, 0);
    const pipelinePendingM = state.pipelineThreats.reduce(
      (sum, t) => sum + (t.score ?? t.loss ?? 0),
      0
    );
    const offsetM = state.riskOffset;
    const currentM = Math.max(0, sumAcceptedM + sumDashboardM - offsetM);
    const potentialM = Math.max(0, baseImpactM + sumAcceptedM + pipelinePendingM - offsetM);
    const gapM = Math.max(0, potentialM - currentM);
    const cents = BigInt(Math.round(gapM * 100_000_000));
    return cents.toString();
  },

  resolveHistoricalThreatName: async (id) => {
    if (!id || id === "SYSTEM_EVENT") return;
    const state = get();
    if (state.historicalThreatNames[id]) return;
    if (state.threatIndexById[id]) return;
    if (pendingHistoricalThreatLookups.has(id)) return;
    if (typeof window === "undefined") return;
    pendingHistoricalThreatLookups.add(id);
    try {
      const res = await fetch(`/api/threats/${id}`);
      if (!res.ok) return;
      const data = (await res.json()) as { title?: string; name?: string };
      const resolvedName = (data.title ?? data.name ?? "").trim();
      if (!resolvedName) return;
      set((current) => ({
        historicalThreatNames: {
          ...current.historicalThreatNames,
          [id]: resolvedName,
        },
      }));
    } catch {
      // Intentionally swallow network errors; UI can continue with fallback labels.
    } finally {
      pendingHistoricalThreatLookups.delete(id);
    }
  },
}));
