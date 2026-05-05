"use client";



import { useEffect, useState } from "react";

import { setSessionClockDriftMs } from "@/app/utils/sessionClockDrift";



const DRIFT_WARN_THRESHOLD_MS = 5000;



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

 * Sticky strip: Forensic Calibration log when drift ≤ threshold.

 * Amber drift HUD lives in `ClockDriftMonitor` (fixed top-right).

 * Option 2: no drift-dependent UI until mounted — avoids hydration mismatch.

 */

export default function ClockDriftBanner({ serverTimeEpochMs, className }: ClockDriftBannerProps) {

  const [isMounted, setIsMounted] = useState(false);

  const [signedDriftLabel, setSignedDriftLabel] = useState<string | null>(null);

  const [showCalibrationStrip, setShowCalibrationStrip] = useState(false);



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

    setShowCalibrationStrip(driftAbs <= DRIFT_WARN_THRESHOLD_MS);

  }, [isMounted, serverTimeEpochMs]);



  if (!isMounted) return null;



  if (!showCalibrationStrip || signedDriftLabel == null) return null;



  return (

    <div

      role="status"

      aria-live="polite"

      className={`rounded border border-emerald-700/40 bg-slate-950/80 px-3 py-2 font-mono text-[10px] leading-relaxed text-emerald-100/90 shadow-[0_0_12px_rgba(16,185,129,0.12)] ${className ?? ""}`}

    >

      <div className="font-semibold tracking-tight text-emerald-200/95">

        <span aria-hidden>🤖</span> [FORENSIC CALIBRATION] | Authority: Ironscribe (Clerk of Record)

      </div>

      <div className="mt-1 text-emerald-100/85">

        Drift Attestation: Local Client Clock is synchronized within {signedDriftLabel} of the Ironframe

        Central NTP.

      </div>

      <div className="mt-0.5 text-emerald-100/80">

        Integrity Verification: Audit timestamps for this session are calibrated against the UTC

        Baseline.

      </div>

      <div className="mt-1.5 border-t border-emerald-800/40 pt-1 text-[9px] uppercase tracking-wider text-emerald-300/70">

        [TAS COMPLIANCE SIGNATURE]

      </div>

    </div>

  );

}

