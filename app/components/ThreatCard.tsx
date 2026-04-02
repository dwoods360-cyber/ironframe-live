"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  isGrcInfrastructureLimitMessage,
  parseRetryAfterSecondsFromMessage,
} from "@/app/utils/grcInfrastructureLimit";
import { useAgentStore } from "@/app/store/agentStore";
import {
  chaosComplianceCoverageLabel,
  formatRecoverySlaParts,
  frameworkBadgesForChaosScenario,
} from "@/app/utils/grcComplianceUi";

function useIngestionBootstrapVisual(
  createdAtIso: string | null | undefined,
  enabled: boolean,
  durationMs = 2000,
): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!enabled || !createdAtIso) {
      setOn(false);
      return;
    }
    const start = Date.parse(createdAtIso);
    if (Number.isNaN(start)) {
      setOn(false);
      return;
    }
    const end = start + durationMs;
    const tick = () => setOn(Date.now() < end);
    tick();
    if (Date.now() >= end) return;
    const iv = window.setInterval(tick, 200);
    const to = window.setTimeout(() => {
      setOn(false);
      window.clearInterval(iv);
    }, Math.max(0, end - Date.now()));
    return () => {
      window.clearInterval(iv);
      window.clearTimeout(to);
    };
  }, [createdAtIso, enabled, durationMs]);
  return on;
}

type Props = {
  /** ESCALATED: inline Double-Check / Save block (Main Ops). Rendered above card body. */
  manualRecoveryInline?: ReactNode;
  /** ThreatEvent.status === ESCALATED (Phone Home) or PENDING_REMOTE_INTERVENTION (opens overlay). */
  isEscalated: boolean;
  /** Level-3: muted gold remote support lane on the card. */
  isRemoteIntervention?: boolean;
  /** Assigned technician ref from dispatch (REMOTE_TECH_DISPATCH_ID / DB). */
  remoteTechId?: string | null;
  isRemoteAccessAuthorized?: boolean;
  /** From getRemoteAccessAdminEligibility — UI only; server re-checks on toggle. */
  canAuthorizeRemoteAccess?: boolean;
  onRemoteAccessToggle?: () => void;
  remoteAccessBusy?: boolean;
  className: string;
  children: ReactNode;
  /** Opens manual recovery / remote overlay when card is activated. */
  onEscalatedActivate?: () => void;
  /** When this value changes (e.g. per Irontech stream seq), card briefly shakes/pulses. */
  failureAnimToken?: string | null;
  /** Sprint 6.18: Irontech attempts 1–3 (ACTIVE, under three failures) or manual Attempt 4 in flight. */
  ironTechAgentPhase?: "analyzing" | "mitigating" | null;
  /** Sprint 6.19: first ~2s after `createdAt` uses zinc ingestion shell (ACTIVE path). */
  ingestionBootstrapFromIso?: string | null;
  ingestionBootstrapEnabled?: boolean;
  /** Joined Irontech / ingestion / recovery errors — quota detection. */
  infrastructureErrorProbeText?: string | null;
  ingestionDetailsRaw?: string | null;
  threatStatus?: string | null;
  irontechAttemptCount?: number;
  /** Optional callback when autonomous RESOLVED card should disappear from active view. */
  onAutoDismiss?: () => void;
  /** Chaos / IRONCHAOS drills — hide Assigned technician + Authorize Remote Access (use drill-specific CTAs). */
  suppressRemoteTechnicianHeader?: boolean;
  /** GRC auditor overlay: framework tags, attestation, SLA detail. */
  showCompliance?: boolean;
  /** Use parent card surface classes without internal status color overrides. */
  suppressAutoSurfaceOverride?: boolean;
};

/**
 * Active Ops threat shell: escalated lock chrome, or Level-3 remote support strip + authorize toggle.
 */
export function ThreatCard({
  manualRecoveryInline,
  isEscalated,
  isRemoteIntervention = false,
  remoteTechId,
  isRemoteAccessAuthorized = false,
  canAuthorizeRemoteAccess = false,
  onRemoteAccessToggle,
  remoteAccessBusy = false,
  className,
  children,
  onEscalatedActivate,
  failureAnimToken,
  ironTechAgentPhase = null,
  ingestionBootstrapFromIso = null,
  ingestionBootstrapEnabled = false,
  infrastructureErrorProbeText = null,
  ingestionDetailsRaw = null,
  threatStatus = null,
  irontechAttemptCount = 0,
  onAutoDismiss,
  suppressRemoteTechnicianHeader = false,
  showCompliance = false,
  suppressAutoSurfaceOverride = false,
}: Props) {
  const activateOverlay = (threatStatus ?? "").trim().toUpperCase() === "ESCALATED" && onEscalatedActivate;
  const [failureAnimOn, setFailureAnimOn] = useState(false);
  const [handoffState, setHandoffState] = useState<"IDLE" | "AUTHORIZING" | "CONNECTED">("IDLE");
  const ingestionBootstrapOn = useIngestionBootstrapVisual(
    ingestionBootstrapFromIso,
    ingestionBootstrapEnabled,
    3000,
  );
  const statusNorm = (threatStatus ?? "").trim().toUpperCase();
  const isHeartbeatVisualStatus =
    statusNorm === "ACTIVE" || statusNorm === "QUARANTINED";
  /**
   * Selector narrowing: subscribe only to this card's effective heartbeat phase.
   * If telemetry scope is unavailable/misaligned, fall back to "ASSIGNED" (server-side baseline shell).
   */
  const cardTelemetryPhase = useAgentStore((s) => {
    if (!isHeartbeatVisualStatus) return "ASSIGNED";
    const scope = s.telemetryTenantScope;
    const telem = s.ironwaveTelemetry;
    if (!scope || telem.tenantUuid !== scope) return "ASSIGNED";
    return telem.phase;
  });
  const hasLiveCardTelemetry = isHeartbeatVisualStatus && cardTelemetryPhase !== "ASSIGNED";
  const isResolvedThreat = statusNorm === "RESOLVED";
  const isStrictEscalated = statusNorm === "ESCALATED";
  const devRbacBypass = process.env.NODE_ENV !== "production";
  const effectiveCanAuthorizeRemoteAccess = canAuthorizeRemoteAccess || devRbacBypass;
  const forceIngressGray = statusNorm === "ACTIVE" && ingestionBootstrapOn;
  const probeTrimmed = (infrastructureErrorProbeText ?? "").trim();
  const infrastructureLimit = isGrcInfrastructureLimitMessage(probeTrimmed);
  /** Irontech/Chaos only — never infer from ACTIVE + low attempt count alone (avoids Ironbloom/GRC bleed). */
  const isIrontechOperation =
    Boolean(ironTechAgentPhase) || irontechAttemptCount > 0;
  const forceMitigatingSpinner =
    !isResolvedThreat &&
    isIrontechOperation &&
    statusNorm === "ACTIVE" &&
    irontechAttemptCount < 3 &&
    !infrastructureLimit;
  const retryAfterSec = infrastructureLimit
    ? parseRetryAfterSecondsFromMessage(probeTrimmed)
    : null;
  const showIronTechWorkingBadge =
    !isResolvedThreat &&
    !infrastructureLimit &&
    (forceMitigatingSpinner || Boolean(ironTechAgentPhase));
  const chaosMeta = (() => {
    const raw = (ingestionDetailsRaw ?? "").trim();
    if (!raw) return { scenario: null, isChaosTest: false, hasAutonomousJustification: false };
    try {
      const parsed = JSON.parse(raw) as {
        chaosScenario?: unknown;
        isChaosTest?: unknown;
        resolutionJustification?: unknown;
        autonomousRecoveredAt?: unknown;
        lkgAttestationIroncoreSha256?: unknown;
      };
      const v = typeof parsed.chaosScenario === "string" ? parsed.chaosScenario.trim().toUpperCase() : "";
      const scenario =
        v === "INTERNAL" ||
        v === "HOME_SERVER" ||
        v === "REMOTE" ||
        v === "CASCADING" ||
        v === "CASCADING_FAILURE" ||
        v === "CLOUD_EXFIL" ||
        v === "REMOTE_SUPPORT"
          ? v
          : null;
      const isChaosTest = parsed.isChaosTest === true ? true : false;
      const justification =
        typeof parsed.resolutionJustification === "string"
          ? parsed.resolutionJustification.trim()
          : "";
      const hasAutonomousJustification =
        justification.startsWith("[IRONTECH AUTONOMOUS RECOVERY]") ||
        justification.startsWith("[SIDECAR DRILL COMPLETE]");
      const autonomousRecoveredAt =
        typeof parsed.autonomousRecoveredAt === "string"
          ? parsed.autonomousRecoveredAt.trim()
          : "";
      const lkgAttestationIroncoreSha256 =
        typeof parsed.lkgAttestationIroncoreSha256 === "string"
          ? parsed.lkgAttestationIroncoreSha256.trim()
          : "";
      return {
        scenario,
        isChaosTest,
        hasAutonomousJustification,
        autonomousRecoveredAt,
        lkgAttestationIroncoreSha256,
      };
    } catch {
      return {
        scenario: null,
        isChaosTest: false,
        hasAutonomousJustification: false,
        autonomousRecoveredAt: "",
        lkgAttestationIroncoreSha256: "",
      };
    }
  })();

  const chaosScenario = chaosMeta.scenario;
  const complianceCoverageLabel = chaosComplianceCoverageLabel(
    chaosScenario,
    chaosMeta.isChaosTest,
  );
  const showLkgAttestationSha =
    chaosScenario === "CASCADING_FAILURE" &&
    statusNorm === "RESOLVED" &&
    chaosMeta.lkgAttestationIroncoreSha256.length > 0;
  const isRemoteChaosDrill = chaosMeta.scenario === "REMOTE" || chaosMeta.isChaosTest;
  const autoResolvedByIrontech =
    statusNorm === "RESOLVED" &&
    (chaosScenario === "INTERNAL" ||
      chaosScenario === "HOME_SERVER" ||
      chaosScenario === "CLOUD_EXFIL" ||
      chaosScenario === "CASCADING_FAILURE" ||
      chaosScenario === "REMOTE_SUPPORT" ||
      chaosMeta.hasAutonomousJustification);
  const recoverySlaParts =
    isResolvedThreat && autoResolvedByIrontech
      ? formatRecoverySlaParts(ingestionBootstrapFromIso, chaosMeta.autonomousRecoveredAt)
      : null;
  const frameworkBadges = frameworkBadgesForChaosScenario(chaosScenario, chaosMeta.isChaosTest);
  const showFrameworkOverlay =
    showCompliance && frameworkBadges.length > 0 && (chaosMeta.isChaosTest || chaosScenario);
  const canShowRemoteHandoff = isStrictEscalated || isRemoteIntervention;

  useEffect(() => {
    if (failureAnimToken === undefined || failureAnimToken === null || failureAnimToken === "") return;
    setFailureAnimOn(true);
    const id = window.setTimeout(() => setFailureAnimOn(false), 720);
    return () => window.clearTimeout(id);
  }, [failureAnimToken]);

  useEffect(() => {
    if (!autoResolvedByIrontech || !onAutoDismiss) return;
    const timer = window.setTimeout(() => {
      onAutoDismiss();
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [autoResolvedByIrontech, onAutoDismiss]);

  useEffect(() => {
    if (isRemoteAccessAuthorized) {
      setHandoffState("CONNECTED");
      return;
    }
    if (!canShowRemoteHandoff) {
      setHandoffState("IDLE");
    }
  }, [isRemoteAccessAuthorized, canShowRemoteHandoff]);

  const handleAuthorizeRemoteAccess = () => {
    if (handoffState !== "IDLE") return;
    // NEW GRC INTERCEPT:
    if (chaosMeta.isChaosTest || chaosScenario) {
      setHandoffState("AUTHORIZING");
      useAgentStore
        .getState()
        .appendRiskIngestionTerminalLine(
          "> [IRONTECH] Authorization received. Simulated handoff initiated.",
        );
      window.setTimeout(() => setHandoffState("CONNECTED"), 3000);
      return; // CRITICAL: Stop here for drills
    }
    setHandoffState("AUTHORIZING");
    useAgentStore
      .getState()
      .appendRiskIngestionTerminalLine(
        "> [IRONTECH] Authorization received. Telemetry routed to human operator. Standing by.",
      );
    onRemoteAccessToggle?.();
    window.setTimeout(() => {
      setHandoffState("CONNECTED");
    }, 3000);
  };

  const ironwaveIrontechShell =
    isHeartbeatVisualStatus && cardTelemetryPhase === "SCANNING"
      ? "!border-amber-500 !shadow-[0_0_22px_rgba(245,158,11,0.38)] !bg-gradient-to-br !from-slate-950/90 !to-amber-950/25 animate-pulse-amber"
      : isHeartbeatVisualStatus && cardTelemetryPhase === "VERIFIED"
        ? "!border-emerald-500 !shadow-[0_0_20px_rgba(16,185,129,0.28)] !bg-gradient-to-br !from-slate-950/90 !to-emerald-950/20 animate-flash-green"
        : isHeartbeatVisualStatus && (cardTelemetryPhase === "ASSIGNED" || !hasLiveCardTelemetry)
          ? "!border-cyan-400 !shadow-[0_0_18px_rgba(34,211,238,0.22)] !bg-gradient-to-br !from-slate-950/90 !to-cyan-950/25"
          : "";

  const surfaceOverride = suppressAutoSurfaceOverride
    ? ""
    :
    infrastructureLimit && !failureAnimOn
      ? "!border-amber-500/50 !bg-amber-950/25"
      : statusNorm === "RESOLVED"
        ? "!border-emerald-500/50 !bg-emerald-900/25 !shadow-[0_0_15px_rgba(16,185,129,0.2)]"
        : forceIngressGray && !infrastructureLimit
          ? "!border-zinc-700 !bg-zinc-900"
          : isIrontechOperation || chaosScenario
            ? ironwaveIrontechShell ||
              "!border-blue-900/40 !bg-gradient-to-br !from-slate-950/90 !to-blue-950/30"
            : "";

  return (
    <div
      role={activateOverlay ? "button" : undefined}
      tabIndex={activateOverlay ? 0 : undefined}
      onClick={
        activateOverlay
          ? () => {
              onEscalatedActivate?.();
            }
          : undefined
      }
      onKeyDown={
        activateOverlay
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEscalatedActivate?.();
              }
            }
          : undefined
      }
      className={`relative ${className} ${surfaceOverride} ${
        failureAnimOn ? "threat-card-failure-shake threat-card-failure-pulse " : ""
      }${
        isStrictEscalated && isRemoteIntervention
          ? "threat-card-remote-support"
          : isStrictEscalated
            ? `${infrastructureLimit ? "" : "critical-lock-border"}${activateOverlay ? " cursor-pointer" : ""}`
            : ""
      }`}
    >
      {showCompliance && complianceCoverageLabel ? (
        <span
          className={`pointer-events-none absolute right-3 z-[24] max-w-[min(240px,50vw)] rounded border border-teal-600/55 bg-slate-950/95 px-2 py-1 text-left text-[7px] font-bold uppercase leading-snug tracking-wide text-teal-100/95 shadow-[0_0_10px_rgba(45,212,191,0.15)] ${
            isStrictEscalated && !isRemoteIntervention ? "top-12" : "top-3"
          }`}
          title="Compliance coverage (framework mapping)"
        >
          {complianceCoverageLabel}
        </span>
      ) : null}
      {showFrameworkOverlay ? (
        <div className="pointer-events-none relative z-[12] mb-2 flex flex-wrap gap-1">
          {frameworkBadges.map((b) => (
            <span
              key={b}
              className="rounded border border-slate-600/80 bg-slate-900/90 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-slate-300"
            >
              {b === "SOC2" ? "[SOC 2]" : b === "ISO" ? "[ISO]" : "[NIST]"}
            </span>
          ))}
        </div>
      ) : null}
      {infrastructureLimit || showIronTechWorkingBadge ? (
        <div className="relative z-10 mb-3 flex flex-col gap-2">
          {infrastructureLimit ? (
            <span className="pointer-events-none max-w-full self-start rounded border border-amber-500/70 bg-amber-950/95 px-2 py-1 text-[7px] font-black uppercase leading-tight tracking-wide text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.35)]">
              [GRC] INFRASTRUCTURE LIMIT REACHED
            </span>
          ) : null}

          {showIronTechWorkingBadge ? (
            <div
              className="pointer-events-none flex max-w-full items-center gap-1.5 self-start rounded border border-cyan-600/70 bg-slate-950/95 px-2 py-1 shadow-[0_0_14px_rgba(34,211,238,0.25)] irontech-working-badge-pulse"
              role="status"
              aria-live="polite"
              aria-label={
                forceMitigatingSpinner || ironTechAgentPhase === "mitigating"
                  ? "Irontech mitigating"
                  : "Irontech analyzing"
              }
            >
              <Loader2
                className="h-3.5 w-3.5 shrink-0 animate-spin text-cyan-300"
                aria-hidden
              />
              <span className="text-[7px] font-black uppercase leading-tight tracking-wide text-cyan-100">
                {forceMitigatingSpinner || ironTechAgentPhase === "mitigating"
                  ? "[IRONTECH] MITIGATING..."
                  : "[IRONTECH] ANALYZING..."}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {infrastructureLimit ? (
        <div className="relative z-[22] mb-2 rounded border border-amber-600/45 bg-amber-950/35 px-2 py-1.5">
          <p className="text-[10px] font-semibold leading-snug text-amber-100">
            ⚠️ System Overload: Gemini-2.5-Flash Quota Exceeded.
          </p>
          {retryAfterSec != null ? (
            <p className="mt-1 text-[9px] font-mono text-amber-200/95">
              Retry in {retryAfterSec} seconds
            </p>
          ) : null}
        </div>
      ) : null}
      {chaosScenario === "INTERNAL" && statusNorm === "RESOLVED" ? (
        <div className="mb-3 rounded-md border border-emerald-400/70 bg-emerald-900/35 px-3 py-2 shadow-[0_0_16px_rgba(16,185,129,0.28)]">
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-100">
            LOCAL FIX APPLIED: Irontech successfully located and applied an internal recovery patch. Please review the terminal logs below and dismiss this alert.
          </p>
          <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-emerald-200/90">
            Auto-dismissing in 10s...
          </p>
        </div>
      ) : null}
      {chaosScenario === "HOME_SERVER" && statusNorm === "RESOLVED" ? (
        <div className="mb-3 rounded-md border border-cyan-400/70 bg-cyan-950/35 px-3 py-2 shadow-[0_0_16px_rgba(34,211,238,0.28)]">
          <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-100">
            GLOBAL PATCH APPLIED: Irontech queried the IronFrame Home Server, downloaded the missing patch, and restored stability. Please verify system integrity and dismiss this alert.
          </p>
          <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-cyan-200/90">
            Auto-dismissing in 10s...
          </p>
        </div>
      ) : null}
      {chaosScenario === "REMOTE" && statusNorm === "ESCALATED" && handoffState !== "CONNECTED" ? (
        <div className="mb-3 rounded-md border border-rose-400/80 bg-rose-950/45 px-3 py-2 shadow-[0_0_18px_rgba(244,63,94,0.32)]">
          <p className="text-[10px] font-black uppercase tracking-wide text-rose-100">
            MITIGATION FAILED: An automated diagnostic packet has been emailed to Ironframe Support. Please click 'Authorize Remote Access' below to allow our human tech team to intervene.
          </p>
        </div>
      ) : null}
      {chaosScenario === "CASCADING" && statusNorm === "ESCALATED" && handoffState !== "CONNECTED" ? (
        <div className="mb-3 rounded-md border border-orange-500/80 bg-orange-950/45 px-3 py-2 shadow-[0_0_18px_rgba(249,115,22,0.32)]">
          <p className="text-[10px] font-black uppercase tracking-wide text-orange-100">
            CASCADING FAILURE DETECTED: Irontech attempted Local and Global mitigation paths, but both failed. The threat is a zero-day variant. Human intervention is strictly required. Please click 'Authorize Remote Access' below.
          </p>
        </div>
      ) : null}

      {manualRecoveryInline}

      {canShowRemoteHandoff && !suppressRemoteTechnicianHeader && (
        <div
          className="pointer-events-auto z-30 mb-3 space-y-2 rounded-lg border border-amber-700/55 bg-amber-950/50 p-3 shadow-inner shadow-amber-950/40"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-amber-200/90">
                Assigned technician
              </p>
              <p className="mt-0.5 text-base font-black tracking-tight text-amber-50">
                {remoteTechId?.trim() ? remoteTechId : "Pending assignment"}
              </p>
            </div>
            <span className="shrink-0 rounded border border-amber-600/70 bg-amber-900/60 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-amber-100">
              Remote support
            </span>
          </div>
          {handoffState === "CONNECTED" ? (
            <p className="w-full rounded-md border border-indigo-500/60 bg-indigo-950/40 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-indigo-100">
              Session controlled by Ironframe Support.
            </p>
          ) : (
            <button
              type="button"
              disabled={
                handoffState !== "IDLE" ||
                !effectiveCanAuthorizeRemoteAccess ||
                remoteAccessBusy
              }
              title={
                effectiveCanAuthorizeRemoteAccess
                  ? undefined
                  : "Only Admin/Owner (or allowlisted email) can authorize remote access."
              }
              onClick={handleAuthorizeRemoteAccess}
              className={`w-full rounded-md border px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                handoffState === "AUTHORIZING"
                  ? "animate-pulse border-amber-400/80 bg-amber-900/65 text-amber-100"
                  : isRemoteAccessAuthorized
                    ? "border-emerald-600/70 bg-emerald-950/50 text-emerald-100 hover:bg-emerald-950/70"
                    : "border-amber-500/60 bg-amber-900/40 text-amber-100 hover:bg-amber-900/55"
              }`}
            >
              {handoffState === "AUTHORIZING"
                ? "[⏳ Awaiting Technician Connection...]"
                : remoteAccessBusy
                  ? "Updating…"
                  : `[🔓 Authorize Remote Access]${isRemoteAccessAuthorized ? " — ON" : " — OFF"}`}
            </button>
          )}
        </div>
      )}

      {isStrictEscalated && (
        handoffState === "CONNECTED" ? (
          <span className="pointer-events-none absolute right-3 top-3 z-20 rounded border border-indigo-400/90 bg-indigo-950/95 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-indigo-100 shadow-[0_0_12px_rgba(99,102,241,0.5)] animate-pulse">
            [📡 REMOTE TECH SESSION ACTIVE]
          </span>
        ) : !isRemoteIntervention ? (
          <span className="pointer-events-none absolute right-3 top-3 z-20 rounded border border-rose-500/90 bg-rose-950/95 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-rose-100 shadow-[0_0_12px_rgba(225,29,72,0.5)]">
            MANUAL ACTION REQUIRED
          </span>
        ) : null
      )}

      {children}

      {showCompliance && showLkgAttestationSha ? (
        <div className="pointer-events-none mt-2 px-1">
          <p className="mb-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-500">
            Attestation (G: manifest)
          </p>
          <code className="block text-[10px] opacity-50">
            SHA256 ironcore: {chaosMeta.lkgAttestationIroncoreSha256}
          </code>
        </div>
      ) : null}
      {showCompliance && recoverySlaParts ? (
        <div className="mt-2 space-y-0.5 text-center">
          <p className="text-[9px] font-black uppercase tracking-wide text-emerald-400/95">
            {recoverySlaParts.recoveryLine}
          </p>
          <p className="text-[9px] font-black uppercase tracking-wide text-emerald-400/95">
            {recoverySlaParts.slaLine}
          </p>
        </div>
      ) : null}
    </div>
  );
}
