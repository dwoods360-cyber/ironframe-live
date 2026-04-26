"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Lock, Megaphone, Radio, ShieldCheck } from "lucide-react";
import { getIrontechActiveLogDive } from "@/app/actions/irontechUiActions";
import { fetchNotificationAuditSummary } from "@/app/actions/notificationAuditActions";
import {
  approveThreatResolution,
  getThreatResolutionReviewEligibility,
  listPendingThreatResolutions,
  rejectThreatResolution,
  type PendingThreatResolutionItem,
} from "@/app/actions/threatActions";
import { useRiskStore } from "@/app/store/riskStore";
import { useComplianceOverlayStore } from "@/app/store/complianceOverlayStore";
import { useSimulationConfigStore } from "@/app/store/simulationConfigStore";
import NotificationEndpointsModal from "@/app/components/NotificationEndpointsModal";
import ConfigChangeWidget from "@/app/components/ConfigChangeWidget";
import type { NotificationAuditSummary } from "@/app/utils/notificationAuditSummary";

/**
 * Left-pane Irontech enclave: compliance overlay + chaos controls.
 * Solid zinc frame only — no dashed “cage”, no redundant chrome (parent section owns “CONTROL ROOM”).
 */
export default function ControlRoom({ children }: { children?: ReactNode }) {
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

  const automatedUpdatesEnabled = useSimulationConfigStore((s) => s.automatedUpdatesEnabled);
  const activeEndpointCount = useSimulationConfigStore((s) => s.activeEndpointCount);
  const hydrateSimulationConfig = useSimulationConfigStore((s) => s.hydrate);
  const refreshActiveEndpointCount = useSimulationConfigStore((s) => s.refreshActiveEndpointCount);
  const toggleAutomatedUpdates = useSimulationConfigStore((s) => s.toggleAutomatedUpdates);
  const [endpointsModalOpen, setEndpointsModalOpen] = useState(false);

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

  return (
    <div className="col-span-full w-full max-w-full rounded-sm border border-zinc-800/90 bg-[#050509] p-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
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
                    Manager role required (GRC_MANAGER / GLOBAL_ADMIN).
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      {children ? <div className="mt-2 min-w-0">{children}</div> : null}
    </div>
  );
}
