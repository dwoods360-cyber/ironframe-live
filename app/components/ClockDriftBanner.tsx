"use client";

import { useEffect, useState } from "react";
import { setSessionClockDriftMs } from "@/app/utils/sessionClockDrift";
import { CLOCK_DRIFT_WARN_THRESHOLD_MS } from "@/app/config/clockDrift";
import { useClockDriftDismiss } from "@/app/hooks/useClockDriftDismiss";

export type ClockDriftBannerProps = {
  /** `Date.now()` from the Server Component at render (request-time skew baseline). */
  serverTimeEpochMs: number;
  className?: string;
};

function formatSignedDriftMs(signedMs: number): string {
  const rounded = Math.round(signedMs);
  const sign = rounded >= 0 ? "+" : "";
  return `${sign}${rounded}ms`;
}

/**
 * Sticky strip: Forensic Calibration log when drift ≤ tolerance.
 * Amber drift HUD lives in `ClockDriftMonitor` (fixed top-right).
 */
export default function ClockDriftBanner({ serverTimeEpochMs, className }: ClockDriftBannerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [signedDriftLabel, setSignedDriftLabel] = useState<string | null>(null);
  const [showCalibrationStrip, setShowCalibrationStrip] = useState(false);
  const { dismissed, dismiss } = useClockDriftDismiss();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const clientMs = Date.now();
    const driftSigned = clientMs - serverTimeEpochMs;
    const driftAbs = Math.abs(driftSigned);
    setSessionClockDriftMs(driftAbs);
    setSignedDriftLabel(formatSignedDriftMs(driftSigned));
    setShowCalibrationStrip(driftAbs <= CLOCK_DRIFT_WARN_THRESHOLD_MS);
  }, [isMounted, serverTimeEpochMs]);

  if (!isMounted || dismissed || !showCalibrationStrip || signedDriftLabel == null) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded border border-emerald-700/40 bg-slate-950/80 px-3 py-2 font-mono text-[10px] leading-relaxed text-emerald-100/90 shadow-[0_0_12px_rgba(16,185,129,0.12)] ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold tracking-tight text-emerald-200/95">
            <span aria-hidden>🤖</span> [FORENSIC CALIBRATION] | Authority: Ironscribe (Clerk of Record)
          </div>
          <div className="mt-1 text-emerald-100/85">
            Drift Attestation: Local Client Clock is synchronized within {signedDriftLabel} of the Ironframe
            Central NTP.
          </div>
          <div className="mt-0.5 text-emerald-100/80">
            Integrity Verification: Audit timestamps for this session are calibrated against the UTC Baseline.
          </div>
          <div className="mt-1.5 border-t border-emerald-800/40 pt-1 text-[9px] uppercase tracking-wider text-emerald-300/70">
            [TAS COMPLIANCE SIGNATURE]
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded border border-emerald-700/50 bg-emerald-950/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-200/90 hover:bg-emerald-900/50"
          aria-label="Dismiss forensic calibration banner"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
