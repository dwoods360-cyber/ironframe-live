"use client";

import { useEffect, useState } from "react";
import { setSessionClockDriftMs } from "@/app/utils/sessionClockDrift";
import { useSystemConfigStore } from "@/app/store/systemConfigStore";
import {
  FLOATING_NOTIFY_Z_CLASS,
  floatingNotifyTopRightClass,
} from "@/app/config/layoutConstants";
import { CLOCK_DRIFT_WARN_THRESHOLD_MS } from "@/app/config/clockDrift";
import { useClockDriftDismiss } from "@/app/hooks/useClockDriftDismiss";

export type ClockDriftMonitorProps = {
  serverTimeEpochMs: number;
  className?: string;
};

/**
 * Global HUD: fixed top-right amber alert when client vs server RSC baseline exceeds tolerance.
 * Operators may dismiss after verifying OS clock against NTP (session-scoped bypass).
 */
export default function ClockDriftMonitor({ serverTimeEpochMs, className }: ClockDriftMonitorProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [showDriftAlert, setShowDriftAlert] = useState(false);
  const [driftAbsMs, setDriftAbsMs] = useState(0);
  const isSimulationMode = useSystemConfigStore().isSimulationMode;
  const { dismissed, dismiss } = useClockDriftDismiss();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const clientMs = Date.now();
    const driftAbs = Math.abs(clientMs - serverTimeEpochMs);
    setDriftAbsMs(driftAbs);
    setSessionClockDriftMs(driftAbs);
    setShowDriftAlert(driftAbs > CLOCK_DRIFT_WARN_THRESHOLD_MS);
  }, [isMounted, serverTimeEpochMs]);

  if (!isMounted || dismissed || !showDriftAlert) return null;

  return (
    <div
      role="alert"
      className={`fixed right-4 max-w-[min(22rem,calc(100vw-2rem))] rounded border border-amber-600/60 bg-amber-950/90 px-3 py-2 text-[10px] font-semibold leading-snug text-amber-100/95 shadow-[0_0_18px_rgba(245,158,11,0.35)] ${floatingNotifyTopRightClass(isSimulationMode)} ${FLOATING_NOTIFY_Z_CLASS} ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1">
          <span aria-hidden>⚠️</span> SYSTEM CLOCK DRIFT DETECTED.
          <span className="mt-0.5 block font-mono text-[9px] font-normal text-amber-200/85">
            |Δ| {Math.round(driftAbsMs)}ms exceeds {CLOCK_DRIFT_WARN_THRESHOLD_MS}ms tolerance.
          </span>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded border border-amber-600/70 bg-amber-900/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-100 hover:bg-amber-800/60"
          aria-label="Dismiss clock drift warning after NTP verification"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
