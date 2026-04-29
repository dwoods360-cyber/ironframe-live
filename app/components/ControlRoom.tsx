"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Megaphone, Radio, ShieldCheck } from "lucide-react";
import {
  clearAllThreatsAction,
  triggerSystemIntegrityDrillAction,
  type SystemIntegrityDrillId,
} from "@/app/actions/chaosActions";
import { getIrontechActiveLogDive } from "@/app/actions/irontechUiActions";
import { fetchNotificationAuditSummary } from "@/app/actions/notificationAuditActions";
import { getMetaAuditConsoleAccess } from "@/app/actions/auditActions";
import {
  approveThreatResolution,
  getThreatResolutionReviewEligibility,
  listPendingThreatResolutions,
  rejectThreatResolution,
  type PendingThreatResolutionItem,
} from "@/app/actions/threatActions";
import MetaAuditConsole from "@/app/components/MetaAuditConsole";
import { useRiskStore } from "@/app/store/riskStore";
import { useComplianceOverlayStore } from "@/app/store/complianceOverlayStore";
import { useSimulationConfigStore } from "@/app/store/simulationConfigStore";
import { useSystemConfigStore } from "@/app/store/systemConfigStore";
import { useAgentStore } from "@/app/store/agentStore";
import NotificationEndpointsModal from "@/app/components/NotificationEndpointsModal";
import ConfigChangeWidget from "@/app/components/ConfigChangeWidget";
import type { NotificationAuditSummary } from "@/app/utils/notificationAuditSummary";
import { fetchChaosLedgerClientAttribution } from "@/app/utils/chaosClientAttribution";
import { syncThreatBoardsClient } from "@/app/utils/syncThreatBoardsClient";
import { GRC_RESOLUTION_GATE_ADMIN_BYPASS_DETAIL } from "@/src/constants/grcManualPurge";
import { applyManualSimulationStandDownResumeFeed } from "@/app/utils/manualSimulationStandDownFeed";
import { useShadowHandshakeRoleStore } from "@/app/store/shadowHandshakeRoleStore";
import { syncHandshakeRoleCookie } from "@/app/utils/handshakeRoleCookie";
import { isCisoBreachAttestationPendingInSets } from "@/app/utils/cisoBreachSignal";
import { CORE_WORKFORCE_AGENTS } from "@/app/config/agents";
import type { PipelineThreat } from "@/app/store/riskStore";
import {
  combineThreatPlanes,
  getAgentState,
  hasAnyOpenSimulationBotThreat,
  type AgentPulseState,
} from "@/app/utils/workforceAgentState";

export type { AgentPulseState };
export { getAgentState };

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
  const [irongateClaimFlash, setIrongateClaimFlash] = useState(false);
  const isSimulationActive = useSystemConfigStore().isSimulationMode;
  const pipelineThreats = useRiskStore((s) => s.pipelineThreats);
  const activeThreats = useRiskStore((s) => s.activeThreats);
  const intelligenceStream = useAgentStore((s) => s.intelligenceStream);

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
    let cancelled = false;
    void fetchNotificationAuditSummary().then((s) => {
      if (!cancelled) setAuditSummary(s);
    });
    return () => {
      cancelled = true;
    };
  }, [automatedUpdatesEnabled, endpointsModalOpen, boardPrepRefresh]);

  const auditVerified =
    auditSummary?.lastModified != null &&
    new Date(auditSummary.lastModified).getTime() >= sessionStartedAtRef.current;

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      const now = Date.now();
      const tid = selectedThreatId ?? null;
      const last = lastLogDiveFetchRef.current;
      const threatChanged = tid !== last.threatId;
      const stale = now - last.at >= 5000;
      if (!threatChanged && !stale) return;
      lastLogDiveFetchRef.current = { at: now, threatId: tid };
      void getIrontechActiveLogDive().then((on) => {
        if (cancelled) return;
        setLogDive((prev) => (prev === on ? prev : on));
      });
    };
    tick();
    const id = setInterval(tick, 500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [selectedThreatId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [eligibility, pending] = await Promise.all([
        getThreatResolutionReviewEligibility(),
        listPendingThreatResolutions(),
      ]);
      if (cancelled) return;
      setReviewEligible(eligibility.eligible);
      if (pending.ok) {
        setPendingApprovals(pending.items);
        setReviewError(null);
      } else {
        setPendingApprovals([]);
        setReviewError(pending.error);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [boardPrepRefresh]);

  useEffect(() => {
    let cancelled = false;
    void getMetaAuditConsoleAccess().then((res) => {
      if (cancelled) return;
      setMetaAuditAccess(res.canAccess);
      setMetaAuditTenantId(res.tenantId);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onClaim = () => {
      setIrongateClaimFlash(true);
      window.setTimeout(() => setIrongateClaimFlash(false), 2000);
    };
    window.addEventListener("ironframe:irongate-claim-attestation", onClaim);
    return () => window.removeEventListener("ironframe:irongate-claim-attestation", onClaim);
  }, []);

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
      const pending = await listPendingThreatResolutions();
      if (pending.ok) {
        setPendingApprovals(pending.items);
      } else {
        setReviewError(pending.error);
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

  const ingressSignalActive = useMemo(
    () => hasAnyOpenSimulationBotThreat(combinedThreats),
    [combinedThreats],
  );

  async function handleSystemIntegrityDrill(drillId: SystemIntegrityDrillId) {
    if (drillBusyKey || purgeBusy) return;
    setDrillBusyKey(drillId);
    setDrillError(null);
    try {
      const isFullSpectrum =
        drillId === "attbot" || drillId === "kimbot" || drillId === "grcbot";
      if (isFullSpectrum) {
        // Fresh subscription posture for live feed when full-spectrum drill toggles.
        useAgentStore.getState().resetAgentStreamsForPurge();
        window.dispatchEvent(new CustomEvent("ironframe:resilience-feed-resubscribe"));
      }
      const attribution = await fetchChaosLedgerClientAttribution();
      const result = await triggerSystemIntegrityDrillAction(drillId, attribution ?? undefined);
      if (!result.ok) {
        setDrillError(result.error);
      } else {
        applyManualSimulationStandDownResumeFeed();
        const replacePipeline = useRiskStore.getState().replacePipelineThreats;
        const replaceActive = useRiskStore.getState().replaceActiveThreats;
        await syncThreatBoardsClient(replacePipeline, replaceActive).catch(() => undefined);
        setBoardPrepRefresh((n) => n + 1);
        setFeedTelemetryActiveAt(Date.now());
        router.refresh();
      }
    } catch (error) {
      setDrillError(error instanceof Error ? error.message : "System integrity drill failed.");
    } finally {
      setDrillBusyKey(null);
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
      <div className="mb-2 rounded border border-cyan-900/60 bg-cyan-950/15 p-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-cyan-300/90">Chaos Meter</p>
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
        <p className="mb-1 text-[8px] font-black uppercase tracking-widest text-violet-300/90">
          Identity toggle (GRC handshake)
        </p>
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
          <span className="whitespace-nowrap">🛡️ COMPLIANCE OVERLAY</span>
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
            <span className="whitespace-nowrap">
              [ AUTOMATED UPDATES ({activeEndpointCount}{" "}
              {activeEndpointCount === 1 ? "Channel" : "Channels"} Active) ]
            </span>
          </button>
          {auditVerified ? (
            <span
              className="inline-flex h-8 items-center gap-1 rounded-sm border border-emerald-800/50 bg-emerald-950/25 px-2 text-[7px] font-black uppercase tracking-wider text-emerald-400/95"
              title="A notification configuration audit entry was written during this browser session (since this panel loaded)."
            >
              <ShieldCheck className="h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />
              Audit Verified
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setEndpointsModalOpen(true)}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-sm border border-zinc-700/90 bg-zinc-950 px-2.5 text-[8px] font-black uppercase tracking-widest text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-300"
          title="Add or remove stakeholder webhook destinations"
        >
          <Radio className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
          <span className="whitespace-nowrap">MANAGE ENDPOINTS</span>
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
        <ConfigChangeWidget refreshSignal={`${automatedUpdatesEnabled}-${boardPrepRefresh}`} />
      </div>
      <div className="mt-3 rounded border border-zinc-800/85 bg-zinc-950/50 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-200">Agent Status Pulse</h3>
          <span className="inline-flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wide text-slate-500">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                ingressSignalActive ? "bg-slate-400 motion-safe:animate-pulse" : "bg-slate-500"
              }`}
              aria-hidden
            />
            TELEMETRY ACTIVE
          </span>
        </div>
        <p className="mt-1 text-[9px] text-zinc-500">
          19-agent workforce heartbeat — drill-driven alert paths.
        </p>
        <p className="mt-1 text-[8px] text-zinc-600">
          Last resubscribe: {new Date(feedTelemetryActiveAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
        <div
          className="mt-2 grid grid-cols-3 gap-x-2 gap-y-1.5"
          role="list"
          aria-label="19-agent status pulse"
        >
          {CORE_WORKFORCE_AGENTS.map((agent, index) => {
            let pulse = getAgentState(agent.name, combinedThreats);
            if (agent.name === "Irongate" && irongateClaimFlash) {
              pulse = "ACTIVE";
            }
            const staggerMs = (index % 12) * 95;
            const dotPulseMotion =
              "motion-safe:animate-pulse [animation-duration:3s] [animation-timing-function:linear]";
            const dotPulse =
              pulse === "ALERT"
                ? `bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.5)] ${dotPulseMotion}`
                : pulse === "ACTIVE"
                  ? `bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.45)] ${dotPulseMotion}`
                  : "bg-slate-600";
            return (
              <div key={agent.name} role="listitem" className="min-w-0 w-full">
                <div className="flex min-w-0 w-full items-center gap-x-1.5">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotPulse}`}
                    style={
                      pulse !== "IDLE"
                        ? { animationDelay: `${staggerMs}ms` }
                        : undefined
                    }
                    title={pulse}
                    aria-label={`${agent.name} ${pulse}`}
                  />
                  <span className="min-w-0 flex-1 truncate text-[8px] font-semibold uppercase tracking-wide text-slate-500">
                    {agent.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 rounded border border-zinc-800/85 bg-zinc-950/50 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-200">
            Review Queue
          </h3>
          <span className="rounded border border-amber-700/40 bg-amber-950/25 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-amber-200/85">
            {pendingApprovals.length} Pending
          </span>
        </div>
        <p className="mt-1 text-[9px] text-zinc-500">
          HITL threat-resolution attestations awaiting manager sign-off.
        </p>
        {reviewError ? (
          <p className="mt-1.5 text-[9px] text-rose-300/90">{reviewError}</p>
        ) : null}
        <div className="mt-2 space-y-1.5">
          {pendingApprovals.length === 0 ? (
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
                </p>
                <p className="mt-0.5 line-clamp-2 text-[8px] text-zinc-400">{item.approvalNote}</p>
                {reviewEligible ? (
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
                    Manager role required (GRC_MANAGER, GLOBAL_ADMIN, CISO, or DIRECTOR_OF_COMPLIANCE).
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
          />
        </div>
      ) : null}
      {isSimulationActive ? (
        <div className="mt-3 rounded border border-rose-900/60 bg-rose-950/20 p-2">
          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-rose-300/95">
            Simulation Bots (A-D) · Separate from 19-Agent Workforce
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={drillBusyKey !== null || purgeBusy}
              onClick={() => void handleSystemIntegrityDrill("kimbot")}
              className="rounded border border-rose-700/80 bg-gradient-to-r from-rose-950/95 to-zinc-950 px-2 py-2 text-left text-[8px] font-black uppercase tracking-wide text-rose-200 hover:border-rose-500/80 disabled:opacity-50"
            >
              BOT B: KIMBOT (RED TEAM) OFF
            </button>
            <button
              type="button"
              disabled={drillBusyKey !== null || purgeBusy}
              onClick={() => void handleSystemIntegrityDrill("grcbot")}
              className="rounded border border-zinc-700/90 bg-zinc-950 px-2 py-2 text-left text-[8px] font-black uppercase tracking-wide text-zinc-300 hover:border-zinc-500 disabled:opacity-50"
            >
              BOT C: GRCBOT (QA) OFF
            </button>
            <button
              type="button"
              disabled={drillBusyKey !== null || purgeBusy}
              onClick={() => void handleSystemIntegrityDrill("attbot")}
              className="rounded border border-amber-600/90 bg-gradient-to-r from-amber-950/90 to-zinc-950 px-2 py-2 text-left text-[8px] font-black uppercase tracking-wide text-amber-200 hover:border-amber-500 disabled:opacity-50"
            >
              BOT A: ATTBOT
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
