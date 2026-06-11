"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Megaphone, Radio, ShieldCheck } from "lucide-react";
import {
  clearAllThreatsAction,
  standDownAllSystemIntegrityDrillsAction,
  triggerSystemIntegrityDrillAction,
  type SystemIntegrityDrillId,
} from "@/app/actions/chaosActions";
import { getIrontechActiveLogDive } from "@/app/actions/irontechUiActions";
import { fetchNotificationAuditSummary } from "@/app/actions/notificationAuditActions";
import { getMetaAuditConsoleAccess } from "@/app/actions/auditActions";
import {
  approveThreatResolution,
  getThreatResolutionReviewEligibility,
  rejectThreatResolution,
  type PendingThreatResolutionItem,
} from "@/app/actions/threatActions";
import MetaAuditConsole from "@/app/components/MetaAuditConsole";
import { formatAgentIntelLine } from "@/app/utils/intelligenceStreamFormat";
import { useRiskStore } from "@/app/store/riskStore";
import { useComplianceOverlayStore } from "@/app/store/complianceOverlayStore";
import { useSimulationConfigStore } from "@/app/store/simulationConfigStore";
import { useSystemConfigStore } from "@/app/store/systemConfigStore";
import { useAgentStore } from "@/app/store/agentStore";
import { useAgentRiskStore } from "@/app/store/agentRiskStore";
import NotificationEndpointsModal from "@/app/components/NotificationEndpointsModal";
import ConfigChangeWidget from "@/app/components/ConfigChangeWidget";
import type { NotificationAuditSummary } from "@/app/utils/notificationAuditSummary";
import { fetchChaosLedgerClientAttribution } from "@/app/utils/chaosClientAttribution";
import { syncThreatBoardsClient } from "@/app/utils/syncThreatBoardsClient";
import { dispatchSimulationDispatchNotice } from "@/app/utils/simulationDispatchOutcome";
import { GRC_RESOLUTION_GATE_ADMIN_BYPASS_DETAIL } from "@/src/constants/grcManualPurge";
import { applyManualSimulationStandDownResumeFeed } from "@/app/utils/manualSimulationStandDownFeed";
import { useShadowHandshakeRoleStore } from "@/app/store/shadowHandshakeRoleStore";
import { syncHandshakeRoleCookie } from "@/app/utils/handshakeRoleCookie";
import { isCisoBreachAttestationPendingInSets } from "@/app/utils/cisoBreachSignal";
import type { PipelineThreat } from "@/app/store/riskStore";
import {
  combineThreatPlanes,
  getAgentState,
  type AgentPulseState,
} from "@/app/utils/workforceAgentState";
import ContextualHelpTrigger from "@/app/components/HelpSystem/ContextualHelpTrigger";
import {
  LeftPanelFeatureIndex,
  LeftPanelFeatureTitle,
} from "@/app/components/leftPanel/LeftPanelFeatureIndex";
import { LP_FEATURE } from "@/app/config/leftPanelFeatureIndex";
import AgentStatusPulseList from "@/app/components/grc/AgentStatusPulseList";
import AgentStatusPulse, { AgentKillsInlineTag } from "@/app/components/grc/AgentStatusPulse";
import AgentLogs from "@/app/components/panes/AgentLogs";
import { isBenignRuntimeEmissionError, safeRuntimeAsyncEmission } from "@/app/utils/safeRuntimeEmission";
import { useTenantContext } from "@/app/context/TenantProvider";
import { devTenantHandshakeLabel } from "@/app/constants/devTenantRoster";
import { maturationHitlReviewEventId } from "@/app/utils/analystMaturation";
import {
  SIM_NAV_FOCUS_EVENT,
  scrollSimNavTargetIntoView,
  type SimNavFocusTarget,
} from "@/app/utils/simulationNavFocus";
import { createSimulationFetchScope } from "@/app/hooks/useSimulationFetchAbort";
import { fetchIronsightReviewQueue } from "@/app/lib/client/simulationAgentFetch";
import {
  isSimulationFetchAborted,
  runSimulationGuardedAsync,
} from "@/app/utils/simulationNavAbort";

/** Delay single-click overlay toggle so double-click flush does not flip panel state. */
const PULSE_OVERLAY_TOGGLE_GATE_MS = 200;

export type { AgentPulseState };
export { getAgentState };

const SIMULATION_BOT_INTEGRITY_DRILLS = ["attbot", "kimbot", "grcbot"] as const satisfies readonly SystemIntegrityDrillId[];

type SimulationBotIntegrityDrillId = (typeof SIMULATION_BOT_INTEGRITY_DRILLS)[number];

function isOpenSimulationBotThreat(
  t: PipelineThreat,
  drillId: SimulationBotIntegrityDrillId,
): boolean {
  const tag = drillId.toUpperCase();
  const title = (t.name ?? "").trim().toUpperCase();
  if (!title.includes("SYSTEM INTEGRITY") || !title.includes(tag)) return false;
  const st = (t.threatStatus ?? "").trim().toUpperCase();
  return st !== "RESOLVED" && st !== "CLOSED_ARCHIVED";
}

function countOpenSimulationBotDrills(
  threats: PipelineThreat[],
  drillId: SimulationBotIntegrityDrillId,
): number {
  return threats.filter((t) => isOpenSimulationBotThreat(t, drillId)).length;
}

const INITIAL_SIMULATION_BOT_ARMED: Record<SimulationBotIntegrityDrillId, boolean> = {
  attbot: false,
  kimbot: false,
  grcbot: false,
};

/**
 * Left-pane Irontech enclave: compliance overlay + chaos controls.
 * Solid zinc frame only — no dashed “cage”, no redundant chrome (parent section owns “CONTROL ROOM”).
 */
export default function ControlRoom({ children }: { children?: ReactNode }) {
  const router = useRouter();
  const handshakeRole = useShadowHandshakeRoleStore((s) => s.handshakeRole);
  const setHandshakeRole = useShadowHandshakeRoleStore((s) => s.setHandshakeRole);
  const [logDive, setLogDive] = useState(false);
  const selectedThreatId = useRiskStore((s) => s.selectedThreatId);
  const showCompliance = useComplianceOverlayStore((s) => s.showCompliance);
  const setShowCompliance = useComplianceOverlayStore((s) => s.setShowCompliance);
  const lastLogDiveFetchRef = useRef<{ at: number; threatId: string | null }>({
    at: 0,
    threatId: null,
  });
  const sessionStartedAtRef = useRef(Date.now());
  const [auditSummary, setAuditSummary] = useState<NotificationAuditSummary | null>(null);
  const [boardPrepRefresh, setBoardPrepRefresh] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState<PendingThreatResolutionItem[]>([]);
  const [reviewQueueLoading, setReviewQueueLoading] = useState(true);
  const [reviewQueueTenantId, setReviewQueueTenantId] = useState<string | null>(null);
  const [reviewEligible, setReviewEligible] = useState(false);
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [metaAuditTenantId, setMetaAuditTenantId] = useState<string | null>(null);
  const [metaAuditAccess, setMetaAuditAccess] = useState(false);
  const [drillBusyKey, setDrillBusyKey] = useState<string | null>(null);
  const [purgeBusy, setPurgeBusy] = useState(false);
  const [drillError, setDrillError] = useState<string | null>(null);
  const [drillRunCount, setDrillRunCount] = useState(0);
  const [drillDefeatedCount, setDrillDefeatedCount] = useState(0);
  const [feedTelemetryActiveAt, setFeedTelemetryActiveAt] = useState<number>(Date.now());
  const [isMounted, setIsMounted] = useState(false);
  const [irongateClaimFlash, setIrongateClaimFlash] = useState(false);
  /** Armed = bot channel ON; each click while armed fires another attack wave (stack on Attack Velocity). */
  const [simulationBotsArmed, setSimulationBotsArmed] = useState(INITIAL_SIMULATION_BOT_ARMED);
  const isSimulationActive = useSystemConfigStore().isSimulationMode;
  const { activeTenantUuid, activeTenantKey } = useTenantContext();
  const pipelineThreats = useRiskStore((s) => s.pipelineThreats);
  const activeThreats = useRiskStore((s) => s.activeThreats);
  const intelligenceStream = useAgentStore((s) => s.intelligenceStream);
  const agentTelemetryPulseUntil = useAgentStore((s) => s.agentTelemetryPulseUntil);
  const flushAgentTelemetryCache = useAgentStore((s) => s.flushAgentTelemetryCache);
  const addStreamMessage = useAgentStore((s) => s.addStreamMessage);
  const [telemetryPulseTick, setTelemetryPulseTick] = useState(0);
  const [workforceOverlayOpen, setWorkforceOverlayOpen] = useState(false);
  const [agentLogInspectorOpen, setAgentLogInspectorOpen] = useState(false);
  const clickTimeoutRef = useRef<number | null>(null);

  const handlePulseSingleClick = useCallback(() => {
    if (clickTimeoutRef.current != null) {
      window.clearTimeout(clickTimeoutRef.current);
    }
    clickTimeoutRef.current = window.setTimeout(() => {
      clickTimeoutRef.current = null;
      setWorkforceOverlayOpen((open) => !open);
    }, PULSE_OVERLAY_TOGGLE_GATE_MS);
  }, []);

  const handlePulseDoubleClick = useCallback(() => {
    if (clickTimeoutRef.current != null) {
      window.clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    flushAgentTelemetryCache();
    setTelemetryPulseTick((t) => t + 1);
    addStreamMessage("> [PULSE-002] Telemetry cache flush — roster pulses and DMZ scratch cleared.");
  }, [addStreamMessage, flushAgentTelemetryCache]);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current != null) {
        window.clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  const cisoBreachSignalActive = useMemo(
    () => isCisoBreachAttestationPendingInSets(pipelineThreats, activeThreats),
    [pipelineThreats, activeThreats],
  );

  const automatedUpdatesEnabled = useSimulationConfigStore((s) => s.automatedUpdatesEnabled);
  const activeEndpointCount = useSimulationConfigStore((s) => s.activeEndpointCount);
  const hydrateSimulationConfig = useSimulationConfigStore((s) => s.hydrate);
  const refreshActiveEndpointCount = useSimulationConfigStore((s) => s.refreshActiveEndpointCount);
  const toggleAutomatedUpdates = useSimulationConfigStore((s) => s.toggleAutomatedUpdates);
  const [endpointsModalOpen, setEndpointsModalOpen] = useState(false);

  useEffect(() => {
    const all = [...pipelineThreats, ...activeThreats];
    const drills = all.filter((t) => {
      const source = (t.source ?? "").toUpperCase();
      return (
        source.includes("ATTACK_BOT") ||
        source.includes("KIMBOT") ||
        source.includes("GRC_BOT") ||
        source.includes("INFILBOT_SIMULATION") ||
        source.includes("PHISHBOT_SIMULATION") ||
        source.includes("IRONCHAOS")
      );
    });
    const defeatedFromThreats = drills.filter(
      (t) => (t.threatStatus ?? "").toUpperCase() === "RESOLVED" || t.lifecycleState === "resolved",
    ).length;
    const defeatedFromFeed = intelligenceStream.filter((line) => /resolved|neutralized|defeated/i.test(line)).length;
    setDrillRunCount(drills.length);
    setDrillDefeatedCount(Math.max(defeatedFromThreats, Math.min(drills.length, defeatedFromFeed)));
  }, [activeThreats, pipelineThreats, intelligenceStream]);

  useEffect(() => {
    void hydrateSimulationConfig();
  }, [hydrateSimulationConfig]);

  useEffect(() => {
    const scope = createSimulationFetchScope();
    const { signal } = scope;
    void runSimulationGuardedAsync(
      signal,
      () => safeRuntimeAsyncEmission(() => fetchNotificationAuditSummary(), null),
      null,
    ).then((s) => {
      if (!isSimulationFetchAborted(signal) && s) setAuditSummary(s);
    });
    return () => scope.dispose();
  }, [automatedUpdatesEnabled, endpointsModalOpen, boardPrepRefresh]);

  const auditVerified =
    auditSummary?.lastModified != null &&
    new Date(auditSummary.lastModified).getTime() >= sessionStartedAtRef.current;

  useEffect(() => {
    const scope = createSimulationFetchScope();
    const { signal } = scope;
    const tick = () => {
      if (signal.aborted) return;
      const now = Date.now();
      const tid = selectedThreatId ?? null;
      const last = lastLogDiveFetchRef.current;
      const threatChanged = tid !== last.threatId;
      const stale = now - last.at >= 5000;
      if (!threatChanged && !stale) return;
      lastLogDiveFetchRef.current = { at: now, threatId: tid };
      void runSimulationGuardedAsync(
        signal,
        () => safeRuntimeAsyncEmission(() => getIrontechActiveLogDive(), false),
        false,
      ).then((on) => {
        if (isSimulationFetchAborted(signal)) return;
        setLogDive((prev) => (prev === on ? prev : on));
      });
    };
    tick();
    const id = setInterval(tick, 500);
    return () => {
      scope.dispose();
      clearInterval(id);
    };
  }, [selectedThreatId]);

  useEffect(() => {
    const onHitlRefresh = () => setBoardPrepRefresh((n) => n + 1);
    window.addEventListener("ironframe:hitl-review-queue-refresh", onHitlRefresh);
    return () => window.removeEventListener("ironframe:hitl-review-queue-refresh", onHitlRefresh);
  }, []);

  useEffect(() => {
    const scope = createSimulationFetchScope();
    const { signal } = scope;
    const load = async () => {
      setReviewQueueLoading(true);
      try {
        const tenantScope = activeTenantUuid?.trim() || null;
        const [eligibility, pending] = await Promise.all([
          runSimulationGuardedAsync(
            signal,
            () =>
              safeRuntimeAsyncEmission(
                () => getThreatResolutionReviewEligibility(),
                { eligible: false },
              ),
            { eligible: false },
          ),
          runSimulationGuardedAsync(
            signal,
            () => fetchIronsightReviewQueue(signal, tenantScope),
            { ok: false as const, error: "", items: [], aborted: true },
          ),
        ]);
        if (isSimulationFetchAborted(signal)) return;
        setReviewEligible(eligibility.eligible);
        if (pending.aborted) return;
        const setShowcaseStrain = useAgentRiskStore.getState().setShowcaseExecutionStrain;
        if (pending.ok) {
          setPendingApprovals(pending.items);
          setReviewQueueTenantId(pending.tenantId);
          setReviewError(null);
          setShowcaseStrain(8, false);
        } else {
          const benignAbort =
            pending.aborted ||
            !pending.error ||
            isBenignRuntimeEmissionError(pending.error);
          if (!benignAbort) {
            setPendingApprovals([]);
            setReviewQueueTenantId(null);
            setReviewError(pending.error);
            setShowcaseStrain(8, true);
          } else if (!pending.aborted) {
            setShowcaseStrain(8, false);
          }
        }
      } catch (error) {
        if (isSimulationFetchAborted(signal, error)) return;
        if (!isBenignRuntimeEmissionError(error)) {
          setReviewError(error instanceof Error ? error.message : "Review queue unavailable.");
          useAgentRiskStore.getState().setShowcaseExecutionStrain(8, true);
        }
      } finally {
        if (!signal.aborted) setReviewQueueLoading(false);
      }
    };
    void load();
    return () => scope.dispose();
  }, [boardPrepRefresh, activeTenantUuid]);

  useEffect(() => {
    const onSimNavFocus = (event: Event) => {
      const target = (event as CustomEvent<{ target?: SimNavFocusTarget }>).detail?.target;
      if (target === "drill-metrics" || target === "chaos-validator") {
        window.requestAnimationFrame(() => {
          scrollSimNavTargetIntoView(target);
        });
      }
    };
    window.addEventListener(SIM_NAV_FOCUS_EVENT, onSimNavFocus);
    return () => window.removeEventListener(SIM_NAV_FOCUS_EVENT, onSimNavFocus);
  }, []);

  useEffect(() => {
    const scope = createSimulationFetchScope();
    const { signal } = scope;
    void runSimulationGuardedAsync(
      signal,
      () =>
        safeRuntimeAsyncEmission(
          () => getMetaAuditConsoleAccess(),
          { canAccess: false, tenantId: null },
        ),
      { canAccess: false, tenantId: null },
    ).then((res) => {
      if (isSimulationFetchAborted(signal)) return;
      setMetaAuditAccess(res.canAccess);
      setMetaAuditTenantId(res.tenantId);
    });
    return () => scope.dispose();
  }, []);

  useEffect(() => {
    const onClaim = () => {
      setIrongateClaimFlash(true);
      window.setTimeout(() => setIrongateClaimFlash(false), 2000);
    };
    window.addEventListener("ironframe:irongate-claim-attestation", onClaim);
    return () => window.removeEventListener("ironframe:irongate-claim-attestation", onClaim);
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formattedResubscribeTime = useMemo(() => {
    if (!isMounted) return null;
    return new Date(feedTelemetryActiveAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [isMounted, feedTelemetryActiveAt]);

  async function handleReviewAction(approvalId: string, decision: "APPROVE" | "REJECT") {
    setReviewBusyId(approvalId);
    setReviewError(null);
    try {
      const result =
        decision === "APPROVE"
          ? await approveThreatResolution(approvalId)
          : await rejectThreatResolution(approvalId, "Rejected in Control Room review queue.");
      if (!result.success) {
        setReviewError(result.error);
        return;
      }
      addStreamMessage(
        formatAgentIntelLine(
          "AGENT-01",
          "IRONCORE",
          `HITL review queue — ${decision === "APPROVE" ? "approved" : "rejected"} attestation ${approvalId.slice(0, 8)}.`,
        ),
      );
      const tenantScope = activeTenantUuid?.trim() || null;
      if (tenantScope) {
        useRiskStore
          .getState()
          .recordAnalystMaturationEvent(tenantScope, maturationHitlReviewEventId(approvalId));
      }
      const refreshScope = createSimulationFetchScope();
      try {
        const pending = await fetchIronsightReviewQueue(refreshScope.signal, tenantScope);
        if (pending.aborted) return;
        if (pending.ok) {
          setPendingApprovals(pending.items);
          setReviewQueueTenantId(pending.tenantId);
        } else if (pending.error) {
          setReviewError(pending.error);
        }
      } finally {
        refreshScope.dispose();
      }
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Review action failed.");
    } finally {
      setReviewBusyId(null);
    }
  }

  const chaosPercent = drillRunCount > 0 ? Math.round((drillDefeatedCount / drillRunCount) * 100) : 100;

  const combinedThreats = useMemo(
    () => combineThreatPlanes(activeThreats, pipelineThreats),
    [activeThreats, pipelineThreats],
  );

  useEffect(() => {
    const hasLivePulse = Object.values(agentTelemetryPulseUntil).some((until) => until > Date.now());
    if (!hasLivePulse) return;
    const id = window.setInterval(() => setTelemetryPulseTick((t) => t + 1), 300);
    return () => window.clearInterval(id);
  }, [agentTelemetryPulseUntil, telemetryPulseTick]);

  async function syncBoardsAfterIntegrityDrillChange() {
    applyManualSimulationStandDownResumeFeed();
    void useRiskStore.getState().pulseThreatBoardsFromDb().catch(() => undefined);
    const replacePipeline = useRiskStore.getState().replacePipelineThreats;
    const replaceActive = useRiskStore.getState().replaceActiveThreats;
    await syncThreatBoardsClient(replacePipeline, replaceActive).catch(() => undefined);
    setBoardPrepRefresh((n) => n + 1);
    setFeedTelemetryActiveAt(Date.now());
    window.dispatchEvent(new CustomEvent("ironframe:dashboard-refetch"));
    void useRiskStore.getState().refreshActiveThreatsFromDb().catch(() => undefined);
    router.refresh();
  }

  async function disarmSimulationBot(drillId: SimulationBotIntegrityDrillId) {
    setDrillBusyKey(drillId);
    setDrillError(null);
    try {
      const standDown = await standDownAllSystemIntegrityDrillsAction(drillId);
      if (!standDown.ok) {
        setDrillError(standDown.error);
        return;
      }
      const cleared = new Set(standDown.threatIds);
      useRiskStore.getState().replacePipelineThreats(
        useRiskStore.getState().pipelineThreats.filter((t) => !cleared.has(t.id)),
      );
      useRiskStore.getState().replaceActiveThreats(
        useRiskStore.getState().activeThreats.filter((t) => !cleared.has(t.id)),
      );
      setSimulationBotsArmed((prev) => ({ ...prev, [drillId]: false }));
      await syncBoardsAfterIntegrityDrillChange();
    } catch (error) {
      setDrillError(error instanceof Error ? error.message : "Simulation bot stand-down failed.");
    } finally {
      setDrillBusyKey(null);
    }
  }

  async function handleSimulationBotPointer(
    drillId: SimulationBotIntegrityDrillId,
    disarm: boolean,
  ) {
    if (drillBusyKey || purgeBusy) return;
    if (disarm) {
      await disarmSimulationBot(drillId);
      return;
    }
    setDrillBusyKey(drillId);
    setDrillError(null);
    try {
      const wasArmed = simulationBotsArmed[drillId];
      if (!wasArmed) {
        useAgentStore.getState().resetAgentStreamsForPurge();
        window.dispatchEvent(new CustomEvent("ironframe:resilience-feed-resubscribe"));
        setSimulationBotsArmed((prev) => ({ ...prev, [drillId]: true }));
      }
      const attribution = await fetchChaosLedgerClientAttribution();
      const result = await triggerSystemIntegrityDrillAction(drillId, attribution ?? undefined);
      if (!result.ok) {
        setDrillError(result.error);
        if (!wasArmed) {
          setSimulationBotsArmed((prev) => ({ ...prev, [drillId]: false }));
        }
      } else {
        if (!result.cardProduced) {
          dispatchSimulationDispatchNotice({
            scenarioName: result.scenarioDisplayName,
            message: result.message,
            forensicLine: result.forensicLine,
          });
          await syncBoardsAfterIntegrityDrillChange();
          return;
        }
        const pipelineRow: PipelineThreat = {
          ...result.pipelineThreat,
          lifecycleState: "pipeline",
          threatStatus: result.pipelineThreat.threatStatus ?? "IDENTIFIED",
        };
        useRiskStore.getState().upsertPipelineThreat(pipelineRow);
        const activeIds = new Set(useRiskStore.getState().activeThreats.map((t) => t.id));
        if (activeIds.has(result.threatId)) {
          useRiskStore
            .getState()
            .replaceActiveThreats(
              useRiskStore.getState().activeThreats.filter((t) => t.id !== result.threatId),
            );
        }
        await syncBoardsAfterIntegrityDrillChange();
      }
    } catch (error) {
      setDrillError(error instanceof Error ? error.message : "Simulation bot attack failed.");
    } finally {
      setDrillBusyKey(null);
    }
  }

  async function handleSystemIntegrityDrill(drillId: SystemIntegrityDrillId) {
    if (SIMULATION_BOT_INTEGRITY_DRILLS.includes(drillId as SimulationBotIntegrityDrillId)) {
      await handleSimulationBotPointer(drillId as SimulationBotIntegrityDrillId, false);
    }
  }

  async function handleMasterPurge() {
    if (purgeBusy || drillBusyKey) return;
    if (!window.confirm("CAUTION: This will wipe all current simulation data. Proceed?")) {
      return;
    }
    setPurgeBusy(true);
    setDrillError(null);
    try {
      const result = await clearAllThreatsAction();
      if (!result.ok) {
        setDrillError(result.message || "Master purge failed.");
        return;
      }
      useRiskStore.getState().clearAllRiskStateForPurge();
      useAgentStore.getState().resetAgentStreamsForPurge();
      useAgentStore.getState().addStreamMessage(
        `> [GRC] ${GRC_RESOLUTION_GATE_ADMIN_BYPASS_DETAIL} — Bank Vault MANUAL_BOARD_PURGE recorded.`,
      );
      setDrillRunCount(0);
      setDrillDefeatedCount(0);
      const replacePipeline = useRiskStore.getState().replacePipelineThreats;
      const replaceActive = useRiskStore.getState().replaceActiveThreats;
      await syncThreatBoardsClient(replacePipeline, replaceActive).catch(() => {});
    } catch (error) {
      setDrillError(error instanceof Error ? error.message : "Master purge failed.");
    } finally {
      setPurgeBusy(false);
    }
  }

  return (
    <div className="col-span-full w-full max-w-full rounded-sm border border-zinc-800/90 bg-[#050509] p-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
      <div
        className="mb-2 rounded border border-cyan-900/60 bg-cyan-950/15 p-2"
        data-sim-nav-target="drill-metrics"
        tabIndex={-1}
      >
        <div className="flex items-center justify-between gap-2">
          <LeftPanelFeatureTitle
            index={LP_FEATURE.CHAOS_METER}
            className="text-[9px] font-black uppercase tracking-widest text-cyan-300/90"
          >
            Chaos Meter
          </LeftPanelFeatureTitle>
          <p className="text-[10px] font-black text-cyan-100">{chaosPercent}% Neutralized</p>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-900">
          <div
            className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 transition-all"
            style={{ width: `${Math.min(100, Math.max(0, chaosPercent))}%` }}
          />
        </div>
        <p className="mt-1 text-[8px] uppercase tracking-wide text-zinc-500">
          Total drills run: {drillRunCount} · Defeated: {drillDefeatedCount}
        </p>
      </div>

      <div className="mb-2 rounded border border-violet-900/55 bg-violet-950/20 px-2 py-1.5">
        <LeftPanelFeatureTitle
          index={LP_FEATURE.IDENTITY_TOGGLE}
          as="p"
          className="mb-1 text-[8px] font-black uppercase tracking-widest text-violet-300/90"
        >
          Identity toggle (GRC handshake)
        </LeftPanelFeatureTitle>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => {
              setHandshakeRole("ADMIN");
              syncHandshakeRoleCookie("ADMIN");
            }}
            className={`rounded-sm border px-2 py-1 text-[8px] font-black uppercase tracking-wide transition-colors ${
              handshakeRole === "ADMIN"
                ? "border-violet-400/70 bg-violet-900/50 text-violet-100"
                : "border-zinc-700 bg-zinc-950 text-zinc-500 hover:border-zinc-600"
            }`}
          >
            ADMIN
          </button>
          <div
            className="relative inline-block"
            title={
              cisoBreachSignalActive
                ? "Breach / ATTBOT attestation required — at least one open threat needs CISO approval"
                : undefined
            }
          >
            {cisoBreachSignalActive ? (
              <span
                className="pointer-events-none absolute -right-0.5 -top-0.5 z-10 flex h-2.5 w-2.5"
                aria-hidden
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-red-900/60 bg-red-500" />
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setHandshakeRole("CISO");
                syncHandshakeRoleCookie("CISO");
              }}
              aria-label={
                cisoBreachSignalActive
                  ? "CISO — Breach/ATTBOT attestation pending in pipeline (switch to CISO to approve)"
                  : "CISO"
              }
              className={`rounded-sm border px-2 py-1 text-[8px] font-black uppercase tracking-wide transition-colors ${
                cisoBreachSignalActive
                  ? "shadow-[0_0_15px_rgba(239,68,68,0.4)] motion-safe:animate-pulse"
                  : ""
              } ${
                handshakeRole === "CISO"
                  ? cisoBreachSignalActive
                    ? "border-violet-300/50 bg-violet-900/50 text-violet-100 ring-1 ring-red-500/30"
                    : "border-violet-400/70 bg-violet-900/50 text-violet-100"
                  : cisoBreachSignalActive
                    ? "border-red-500/50 bg-rose-950/30 text-rose-100/90 hover:border-red-400/55"
                    : "border-zinc-700 bg-zinc-950 text-zinc-500 hover:border-zinc-600"
              }`}
            >
              CISO
            </button>
          </div>
        </div>
        <p className="mt-1 text-[7px] leading-snug text-zinc-500">
          CISO: generate approval on Kimbot cards. Admin: acknowledge, then resolve once Epic 11 keys are present.
        </p>
      </div>

      <div className="flex w-full flex-wrap items-stretch gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={showCompliance}
          aria-label="Compliance overlay"
          onClick={() => setShowCompliance(!showCompliance)}
          className={`flex h-8 shrink-0 items-center gap-2 rounded-sm border px-2.5 text-[8px] font-black uppercase tracking-widest transition-all ${
            showCompliance
              ? "border-teal-400/70 bg-teal-950/45 text-teal-100 shadow-[inset_0_1px_0_0_rgba(45,212,191,0.15),0_0_14px_rgba(45,212,191,0.12)]"
              : "border-zinc-700/90 bg-zinc-950 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400"
          }`}
        >
          <span
            className={`h-2 w-5 rounded-full transition-colors ${
              showCompliance ? "bg-teal-400 shadow-[0_0_8px_#2dd4bf]" : "bg-zinc-700"
            }`}
            aria-hidden
          />
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <LeftPanelFeatureIndex index={LP_FEATURE.COMPLIANCE_OVERLAY} />
            🛡️ COMPLIANCE OVERLAY
          </span>
        </button>
        {logDive ? (
          <span className="self-center text-[7px] font-semibold uppercase tracking-wide text-cyan-500/90">
            Log-dive
          </span>
        ) : null}
        <div className="flex shrink-0 flex-wrap items-stretch gap-1">
          <button
            type="button"
            role="switch"
            aria-checked={automatedUpdatesEnabled}
            aria-label="Automated stakeholder updates"
            onClick={() => void toggleAutomatedUpdates()}
            className={`flex h-8 items-center gap-2 rounded-sm border px-2.5 text-[8px] font-black uppercase tracking-widest transition-all ${
              automatedUpdatesEnabled
                ? "border-emerald-500/55 bg-emerald-950/35 text-emerald-100 shadow-[inset_0_1px_0_0_rgba(16,185,129,0.12),0_0_16px_rgba(16,185,129,0.18)] motion-safe:animate-pulse"
                : "border-zinc-700/90 bg-zinc-950 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400"
            }`}
            title={
              automatedUpdatesEnabled
                ? `Broadcast Active — ${activeEndpointCount} channel(s) enabled in registry.`
                : "Updates Muted (secure by default): no automated posts. Use Copy Internal Brief in the receipt modal to share manually."
            }
          >
            {automatedUpdatesEnabled ? (
              <Megaphone className="h-3.5 w-3.5 shrink-0 text-emerald-400" strokeWidth={2.25} aria-hidden />
            ) : (
              <Lock className="h-3.5 w-3.5 shrink-0 text-zinc-500" strokeWidth={2.25} aria-hidden />
            )}
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <LeftPanelFeatureIndex index={LP_FEATURE.AUTOMATED_UPDATES} />
              [ AUTOMATED UPDATES ({activeEndpointCount}{" "}
              {activeEndpointCount === 1 ? "Channel" : "Channels"} Active) ]
            </span>
          </button>
          {auditVerified ? (
            <span
              className="inline-flex h-8 items-center gap-1 rounded-sm border border-emerald-800/50 bg-emerald-950/25 px-2 text-[7px] font-black uppercase tracking-wider text-emerald-400/95"
              title="A notification configuration audit entry was written during this browser session (since this panel loaded)."
            >
              <LeftPanelFeatureIndex index={LP_FEATURE.AUDIT_VERIFIED} />
              <ShieldCheck className="h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />
              Audit Verified
            </span>
          ) : null}
          <AgentKillsInlineTag featureIndex={LP_FEATURE.THREATS_RESOLVED} />
        </div>
        <button
          type="button"
          onClick={() => setEndpointsModalOpen(true)}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-sm border border-zinc-700/90 bg-zinc-950 px-2.5 text-[8px] font-black uppercase tracking-widest text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-300"
          title="Add or remove stakeholder webhook destinations"
        >
          <Radio className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <LeftPanelFeatureIndex index={LP_FEATURE.MANAGE_ENDPOINTS} />
            MANAGE ENDPOINTS
          </span>
        </button>
      </div>
      <NotificationEndpointsModal
        open={endpointsModalOpen}
        onClose={() => setEndpointsModalOpen(false)}
        onRegistryChanged={() => {
          void refreshActiveEndpointCount();
          setBoardPrepRefresh((k) => k + 1);
        }}
      />
      <div className="mt-2 max-w-md">
        <ConfigChangeWidget
          refreshSignal={`${automatedUpdatesEnabled}-${boardPrepRefresh}`}
          featureIndex={LP_FEATURE.CONFIG_CHURN}
        />
      </div>
      <AgentStatusPulseList
        combinedThreats={combinedThreats}
        agentTelemetryPulseUntil={agentTelemetryPulseUntil}
        irongateClaimFlash={irongateClaimFlash}
        formattedResubscribeTime={formattedResubscribeTime}
        headerActions={
          <>
            <AgentStatusPulse
              onSingleClick={handlePulseSingleClick}
              onDoubleClick={handlePulseDoubleClick}
              onRightClick={() => setAgentLogInspectorOpen(true)}
            />
            <ContextualHelpTrigger
              featureId="grc-002"
              title="19-Agent Workforce Monitor"
              location="Stretched across the middle tier of your center canvas layout grid."
              purpose="Monitors specialized background automation agents as they actively police the platform for compliance threats."
              steps={[
                "Scan the roster list to verify individual agent statuses (e.g., Green 'ACTIVE' flags).",
                "Click directly on any individual agent row (like Ironlock or Ironguard).",
                "Watch the custom GRC Meta Drawer slide open from the right side of the screen to read their background directives.",
              ]}
            />
          </>
        }
      />
      {workforceOverlayOpen ? (
        <div
          className="fixed inset-0 z-[180] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-label="19-agent workforce status overlay"
          onClick={() => setWorkforceOverlayOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded border border-zinc-700 bg-zinc-950 p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <LeftPanelFeatureTitle
                index={LP_FEATURE.WORKFORCE_OVERLAY}
                as="p"
                className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-200"
              >
                19-Agent Workforce Overlay
              </LeftPanelFeatureTitle>
              <button
                type="button"
                onClick={() => setWorkforceOverlayOpen(false)}
                className="rounded border border-zinc-700 px-2 py-0.5 text-[8px] font-black uppercase text-zinc-400 hover:border-zinc-500"
              >
                Close
              </button>
            </div>
            <AgentStatusPulseList
              combinedThreats={combinedThreats}
              agentTelemetryPulseUntil={agentTelemetryPulseUntil}
              irongateClaimFlash={irongateClaimFlash}
              formattedResubscribeTime={formattedResubscribeTime}
            />
          </div>
        </div>
      ) : null}
      {agentLogInspectorOpen ? (
        <div
          className="fixed inset-y-0 right-0 z-[190] flex w-full max-w-md flex-col border-l border-zinc-700 bg-zinc-950 shadow-2xl"
          role="dialog"
          aria-label="Agent Log Inspector"
        >
          <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
            <LeftPanelFeatureTitle
              index={LP_FEATURE.AGENT_LOG_INSPECTOR}
              as="p"
              className="text-[10px] font-black uppercase tracking-[0.14em] text-teal-400"
            >
              Agent Log Inspector
            </LeftPanelFeatureTitle>
            <button
              type="button"
              onClick={() => setAgentLogInspectorOpen(false)}
              className="rounded border border-zinc-700 px-2 py-0.5 text-[8px] font-black uppercase text-zinc-400 hover:border-zinc-500"
            >
              Close
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <AgentLogs
              feed={intelligenceStream.slice(0, 40).map((line, index) => ({
                id: index,
                type: /fail|error|alert/i.test(line) ? "error" : /pass|verified|complete/i.test(line) ? "success" : "info",
                agent: "Workforce",
                message: line,
                time: new Date().toLocaleTimeString(),
              }))}
            />
          </div>
        </div>
      ) : null}
      <div
        className="mt-3 rounded border border-zinc-800/85 bg-zinc-950/50 p-2.5"
        data-sim-nav-target="drill-metrics"
        tabIndex={-1}
      >
        <div className="flex items-center justify-between gap-2">
          <LeftPanelFeatureTitle
            index={LP_FEATURE.REVIEW_QUEUE}
            as="h3"
            className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-200"
          >
            Review Queue
          </LeftPanelFeatureTitle>
          <span className="rounded border border-amber-700/40 bg-amber-950/25 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-amber-200/85">
            {pendingApprovals.length} Pending
          </span>
        </div>
        <p className="mt-1 text-[9px] text-zinc-500">
          HITL threat-resolution attestations awaiting manager sign-off.
          {reviewQueueTenantId ? (
            <>
              {" "}
              Scope:{" "}
              <span className="font-mono text-zinc-400">
                {pendingApprovals[0]?.tenantScopeLabel === "Client"
                  ? devTenantHandshakeLabel(activeTenantKey)
                  : "Ironframe"}
              </span>
              {activeTenantUuid ? (
                <span className="text-zinc-600"> · {activeTenantUuid.slice(0, 8)}…</span>
              ) : null}
            </>
          ) : (
            <> Select a Command Center tenant to load scoped pending items.</>
          )}
        </p>
        {reviewError ? (
          <p className="mt-1.5 text-[9px] text-rose-300/90">{reviewError}</p>
        ) : null}
        <div className="mt-2 space-y-1.5">
          {reviewQueueLoading ? (
            <div
              className="space-y-1.5 animate-pulse"
              data-testid="review-queue-skeleton"
              aria-busy="true"
              aria-label="Loading drill metrics review queue"
            >
              <div className="h-10 rounded border border-zinc-800/80 bg-zinc-900/40" />
              <div className="h-10 rounded border border-zinc-800/80 bg-zinc-900/40" />
            </div>
          ) : pendingApprovals.length === 0 ? (
            <p className="text-[9px] text-zinc-600">No pending approvals.</p>
          ) : (
            pendingApprovals.map((item) => (
              <div
                key={item.approvalId}
                className="rounded border border-zinc-800/80 bg-zinc-900/50 px-2 py-1.5"
              >
                <p className="text-[9px] font-semibold text-zinc-200">{item.threatTitle}</p>
                <p className="mt-0.5 text-[8px] text-zinc-500">
                  Target: <span className="font-mono">{item.targetEntity ?? "N/A"}</span>
                  {item.hitlCategory !== "GENERAL" ? (
                    <>
                      {" "}
                      · <span className="text-amber-200/80">{item.hitlCategory.replace(/_/g, " ")}</span>
                    </>
                  ) : null}
                </p>
                {item.pendingLedgerCents ? (
                  <p className="mt-0.5 text-[8px] font-mono text-emerald-300/85">
                    Ledger: {item.pendingLedgerCents} cents (BigInt)
                  </p>
                ) : null}
                <p className="mt-0.5 line-clamp-2 text-[8px] text-zinc-400">{item.approvalNote}</p>
                {item.canReview ? (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={reviewBusyId === item.approvalId}
                      onClick={() => void handleReviewAction(item.approvalId, "APPROVE")}
                      className="rounded border border-emerald-700/70 bg-emerald-950/25 px-1.5 py-1 text-[8px] font-black uppercase tracking-wide text-emerald-200 disabled:opacity-50"
                    >
                      APPROVE
                    </button>
                    <button
                      type="button"
                      disabled={reviewBusyId === item.approvalId}
                      onClick={() => void handleReviewAction(item.approvalId, "REJECT")}
                      className="rounded border border-rose-700/70 bg-rose-950/20 px-1.5 py-1 text-[8px] font-black uppercase tracking-wide text-rose-200 disabled:opacity-50"
                    >
                      REJECT
                    </button>
                  </div>
                ) : (
                  <p className="mt-1 text-[8px] text-zinc-600">
                    {item.requiresCisoAdmin
                      ? "CISO or ADMIN role required (financial / breach attestation)."
                      : "Manager role required (GRC_MANAGER, GLOBAL_ADMIN, CISO, or DIRECTOR_OF_COMPLIANCE)."}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      {metaAuditTenantId ? (
        <div className="mt-3">
          <MetaAuditConsole
            tenantId={metaAuditTenantId}
            canAccess={metaAuditAccess}
            showIntegrityLedger={false}
            featureIndex={LP_FEATURE.META_AUDIT_CONSOLE}
          />
        </div>
      ) : null}
      {isSimulationActive ? (
        <div className="mt-3 rounded border border-rose-900/60 bg-rose-950/20 p-2">
          <LeftPanelFeatureTitle
            index={LP_FEATURE.SIMULATION_BOTS}
            as="p"
            className="text-[8px] font-black uppercase tracking-[0.14em] text-rose-300/95"
          >
            Simulation Bots (A-D) · Separate from 19-Agent Workforce
          </LeftPanelFeatureTitle>
          <p className="mt-1 text-[7px] leading-snug text-rose-200/70">
            Click to arm and fire (stack waves on Attack Velocity). Shift+click to disarm. Run A/B/C
            together for varying scenarios — stress the 19-agent workforce.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={drillBusyKey !== null || purgeBusy}
              onClick={(e) => void handleSimulationBotPointer("kimbot", e.shiftKey)}
              className="rounded border border-rose-700/80 bg-gradient-to-r from-rose-950/95 to-zinc-950 px-2 py-2 text-left text-[8px] font-black uppercase tracking-wide text-rose-200 hover:border-rose-500/80 disabled:opacity-50"
            >
              BOT B: KIMBOT (RED TEAM) {simulationBotsArmed.kimbot ? "ON" : "OFF"}
              {countOpenSimulationBotDrills(combinedThreats, "kimbot") > 0
                ? ` · ${countOpenSimulationBotDrills(combinedThreats, "kimbot")} live`
                : ""}
            </button>
            <button
              type="button"
              disabled={drillBusyKey !== null || purgeBusy}
              onClick={(e) => void handleSimulationBotPointer("grcbot", e.shiftKey)}
              className="rounded border border-zinc-700/90 bg-zinc-950 px-2 py-2 text-left text-[8px] font-black uppercase tracking-wide text-zinc-300 hover:border-zinc-500 disabled:opacity-50"
            >
              BOT C: GRCBOT (QA) {simulationBotsArmed.grcbot ? "ON" : "OFF"}
              {countOpenSimulationBotDrills(combinedThreats, "grcbot") > 0
                ? ` · ${countOpenSimulationBotDrills(combinedThreats, "grcbot")} live`
                : ""}
            </button>
            <button
              type="button"
              disabled={drillBusyKey !== null || purgeBusy}
              onClick={(e) => void handleSimulationBotPointer("attbot", e.shiftKey)}
              className="rounded border border-amber-600/90 bg-gradient-to-r from-amber-950/90 to-zinc-950 px-2 py-2 text-left text-[8px] font-black uppercase tracking-wide text-amber-200 hover:border-amber-500 disabled:opacity-50"
            >
              BOT A: ATTBOT {simulationBotsArmed.attbot ? "ON" : "OFF"}
              {countOpenSimulationBotDrills(combinedThreats, "attbot") > 0
                ? ` · ${countOpenSimulationBotDrills(combinedThreats, "attbot")} live`
                : ""}
            </button>
            <button
              type="button"
              disabled={purgeBusy || drillBusyKey !== null}
              onClick={() => void handleMasterPurge()}
              className="rounded border border-rose-500/90 bg-rose-900/85 px-2 py-2 text-left text-[8px] font-black uppercase tracking-wide text-rose-100 hover:bg-rose-800 disabled:opacity-50"
            >
              {purgeBusy ? "MASTER PURGE (WORKING...)" : "MASTER PURGE"}
            </button>
          </div>
          {drillError ? <p className="mt-1.5 text-[9px] text-rose-300">{drillError}</p> : null}
        </div>
      ) : null}
      {children ? <div className="mt-2 min-w-0">{children}</div> : null}
    </div>
  );
}
