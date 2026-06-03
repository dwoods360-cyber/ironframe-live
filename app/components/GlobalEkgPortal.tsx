"use client";

import { useEffect, useState } from "react";
import { useRiskStore } from "@/app/store/riskStore";

/** Root-level TENANT-001 sync overlay — independent of tripane panel mount/unmount cycles. */
export default function GlobalEkgPortal() {
  const isContextSwitching = useRiskStore((s) => s.isContextSwitching);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isContextSwitching) {
      setShouldRender(true);
      return;
    }

    const timer = window.setTimeout(() => setShouldRender(false), 200);
    return () => window.clearTimeout(timer);
  }, [isContextSwitching]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 h-screen w-screen bg-slate-950/10"
      style={{ zIndex: 99999 }}
      data-testid="global-ekg-omni-viewport"
      role="progressbar"
      aria-label="Tenant cryptographic handshake in progress"
      aria-busy={isContextSwitching}
    >
      <div className="absolute left-0 top-16 h-[2px] w-full animate-pulse bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

      <div className="absolute left-0 top-16 flex h-8 w-full items-center overflow-hidden bg-slate-950/40 backdrop-blur-[1px]">
        <svg className="h-4 w-full overflow-visible text-emerald-400" aria-hidden>
          <path
            d="M0 8 H100 L120 8 L125 0 L130 16 L135 8 L140 8 L150 8 H300 L320 8 L325 0 L330 16 L335 8 L340 8 L350 8 H500 L520 8 L525 0 L530 16 L535 8 L540 8 L550 8 H700 L720 8 L725 0 L730 16 L735 8 L740 8 L750 8 H900 L920 8 L925 0 L930 16 L935 8 L940 8 L950 8 H1100"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-ekgSweep"
          />
        </svg>

        <div className="absolute left-6 flex select-none items-center gap-2 font-mono text-[9px] font-black uppercase tracking-widest text-emerald-400">
          <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400" aria-hidden />
          [ SYSTEM AUDIT: RE-CALIBRATING TENANT DATA MATRIX — RUNNING CRYPTO HANDSHAKE ]
        </div>
      </div>
    </div>
  );
}
