"use client";

import { useRiskStore } from "@/app/store/riskStore";

/** Root-level TENANT-001 sync overlay — infinite heartline sweep until context switch resolves. */
export default function GlobalEkgPortal() {
  const isContextSwitching = useRiskStore((s) => s.isContextSwitching);

  if (!isContextSwitching) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-16 h-1 overflow-hidden bg-slate-950/30"
      style={{ zIndex: 99999 }}
      data-testid="global-ekg-progress-viewport"
      role="progressbar"
      aria-label="Tenant cryptographic handshake in progress"
      aria-busy="true"
    >
      <div className="animate-ekgOmniSweep absolute top-0 h-full w-[300px] text-emerald-400">
        <svg className="h-full w-full overflow-visible" aria-hidden>
          <path
            d="M 0 2 L 100 2 L 110 2 L 115 -6 L 120 10 L 125 -2 L 130 6 L 135 2 L 145 2 L 300 2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="animate-ekgOmniSweep absolute top-0 h-full w-[300px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
    </div>
  );
}
