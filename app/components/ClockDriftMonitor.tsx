"use client";

import { useEffect, useState } from "react";
import { setSessionClockDriftMs } from "@/app/utils/sessionClockDrift";

const DRIFT_WARN_THRESHOLD_MS = 5000;

export type ClockDriftMonitorProps = {
  serverTimeEpochMs: number;
  className?: string;
};

/**
 * Global HUD: fixed top-right amber alert when client vs server RSC baseline exceeds 5s.
 * Uses isMounted (Option 2) so no clock/drift UI renders until after hydration.
 */
export default function ClockDriftMonitor({ serverTimeEpochMs, className }: ClockDriftMonitorProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [showDriftAlert, setShowDriftAlert] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const clientMs = Date.now();
    const driftAbs = Math.abs(clientMs - serverTimeEpochMs);
    setSessionClockDriftMs(driftAbs);
    setShowDriftAlert(driftAbs > DRIFT_WARN_THRESHOLD_MS);
  }, [isMounted, serverTimeEpochMs]);

  if (!isMounted || !showDriftAlert) return null;

  return (
    <div
      role="alert"
      className={`pointer-events-none fixed right-4 top-4 z-[100] max-w-[min(22rem,calc(100vw-2rem))] rounded border border-amber-600/60 bg-amber-950/90 px-3 py-2 text-[10px] font-semibold leading-snug text-amber-100/95 shadow-[0_0_18px_rgba(245,158,11,0.35)] ${className ?? ""}`}
    >
      <span aria-hidden>⚠️</span> SYSTEM CLOCK DRIFT DETECTED.
    </div>
  );
}
