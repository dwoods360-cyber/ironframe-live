"use client";

import { useEffect, useState } from "react";
import { useRiskStore } from "@/app/store/riskStore";

/** Root-level TENANT-001 sync overlay — seamless repeating heartbeat pattern sweep. */
export default function GlobalEkgPortal() {
  const isContextSwitching = useRiskStore((state) => state.isContextSwitching);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isContextSwitching) {
      setShouldRender(true);
      return;
    }

    const timer = window.setTimeout(() => setShouldRender(false), 400);
    return () => window.clearTimeout(timer);
  }, [isContextSwitching]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-16 flex h-4 items-center overflow-hidden border-b border-emerald-500/10 bg-slate-950/60 backdrop-blur-[1px]"
      style={{ zIndex: 99999 }}
      data-testid="global-ekg-progress-viewport"
      role="progressbar"
      aria-label="Tenant cryptographic handshake in progress"
      aria-busy={isContextSwitching}
    >
      <div
        className="absolute inset-0 flex h-full w-full items-center"
        style={{
          animation: "ekgOmniLoop 1.4s linear infinite",
          width: "200vw",
        }}
      >
        <svg className="h-4 w-full overflow-visible text-emerald-400 opacity-90" aria-hidden>
          <defs>
            <pattern id="ekg-heartbeat-global" width="400" height="16" patternUnits="userSpaceOnUse">
              <path
                d="M 0 8 L 150 8 L 160 8 L 165 0 L 170 16 L 175 8 L 180 8 L 190 8 L 400 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ekg-heartbeat-global)" />
        </svg>
      </div>

      <div className="absolute left-6 flex select-none items-center gap-2 font-mono text-[9px] font-black uppercase tracking-widest text-emerald-400">
        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400" aria-hidden />
        [ RUNNING SECURE CRYPTO HANDSHAKE CLIENT SYNC... ]
      </div>
    </div>
  );
}
