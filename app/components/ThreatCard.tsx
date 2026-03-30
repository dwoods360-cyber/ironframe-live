"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  isGrcInfrastructureLimitMessage,
  parseRetryAfterSecondsFromMessage,
} from "@/app/utils/grcInfrastructureLimit";

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
  threatStatus?: string | null;
  irontechAttemptCount?: number;
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
  threatStatus = null,
  irontechAttemptCount = 0,
}: Props) {
  const activateOverlay = isEscalated && onEscalatedActivate;
  const [failureAnimOn, setFailureAnimOn] = useState(false);
  const ingestionBootstrapOn = useIngestionBootstrapVisual(
    ingestionBootstrapFromIso,
    ingestionBootstrapEnabled,
    3000,
  );
  const statusNorm = (threatStatus ?? "").trim().toUpperCase();
  const forceIngressGray = statusNorm === "ACTIVE" && ingestionBootstrapOn;
  const probeTrimmed = (infrastructureErrorProbeText ?? "").trim();
  const infrastructureLimit = isGrcInfrastructureLimitMessage(probeTrimmed);
  const forceMitigatingSpinner =
    statusNorm === "ACTIVE" && irontechAttemptCount < 3 && !infrastructureLimit;
  const retryAfterSec = infrastructureLimit
    ? parseRetryAfterSecondsFromMessage(probeTrimmed)
    : null;
  const showIronTechWorkingBadge =
    forceMitigatingSpinner || (Boolean(ironTechAgentPhase) && !infrastructureLimit);

  useEffect(() => {
    if (failureAnimToken === undefined || failureAnimToken === null || failureAnimToken === "") return;
    setFailureAnimOn(true);
    const id = window.setTimeout(() => setFailureAnimOn(false), 720);
    return () => window.clearTimeout(id);
  }, [failureAnimToken]);

  const surfaceOverride =
    infrastructureLimit && !failureAnimOn
      ? "!border-amber-500/50 !bg-amber-950/25"
      : forceIngressGray && !infrastructureLimit
        ? "!border-zinc-700 !bg-zinc-900"
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
        isRemoteIntervention
          ? "threat-card-remote-support"
          : isEscalated
            ? `${infrastructureLimit ? "" : "critical-lock-border"}${activateOverlay ? " cursor-pointer" : ""}`
            : ""
      }`}
    >
      {infrastructureLimit ? (
        <span className="pointer-events-none absolute left-3 top-3 z-[26] max-w-[min(100%,12rem)] rounded border border-amber-500/70 bg-amber-950/95 px-2 py-1 text-[7px] font-black uppercase leading-tight tracking-wide text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.35)]">
          [GRC] INFRASTRUCTURE LIMIT REACHED
        </span>
      ) : null}

      {showIronTechWorkingBadge ? (
        <div
          className="pointer-events-none absolute left-3 top-3 z-[25] flex max-w-[min(100%,14rem)] items-center gap-1.5 rounded border border-cyan-600/70 bg-slate-950/95 px-2 py-1 shadow-[0_0_14px_rgba(34,211,238,0.25)] irontech-working-badge-pulse"
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

      {manualRecoveryInline}

      {isRemoteIntervention && (
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
          <button
            type="button"
            disabled={!canAuthorizeRemoteAccess || remoteAccessBusy}
            title={
              canAuthorizeRemoteAccess
                ? undefined
                : "Only Admin/Owner (or allowlisted email) can authorize remote access."
            }
            onClick={() => onRemoteAccessToggle?.()}
            className={`w-full rounded-md border px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              isRemoteAccessAuthorized
                ? "border-emerald-600/70 bg-emerald-950/50 text-emerald-100 hover:bg-emerald-950/70"
                : "border-amber-500/60 bg-amber-900/40 text-amber-100 hover:bg-amber-900/55"
            }`}
          >
            {remoteAccessBusy
              ? "Updating…"
              : `[🔓 Authorize Remote Access]${isRemoteAccessAuthorized ? " — ON" : " — OFF"}`}
          </button>
        </div>
      )}

      {!isRemoteIntervention && isEscalated && (
        <span className="pointer-events-none absolute right-3 top-3 z-20 rounded border border-rose-500/90 bg-rose-950/95 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-rose-100 shadow-[0_0_12px_rgba(225,29,72,0.5)]">
          MANUAL ACTION REQUIRED
        </span>
      )}

      {children}
    </div>
  );
}
