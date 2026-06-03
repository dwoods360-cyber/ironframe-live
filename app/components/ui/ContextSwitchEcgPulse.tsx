"use client";

import { useRiskStore } from "@/app/store/riskStore";

/** Full-viewport ECG sweep — rides above all dashboard layers during TENANT-001 context switch. */
export default function ContextSwitchEcgProgressBar() {
  const isContextSwitching = useRiskStore((s) => s.isContextSwitching);

  if (!isContextSwitching) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed left-0 top-16 h-2 w-screen border-b border-teal-500/10 bg-slate-950/40"
      style={{ zIndex: 9999, width: "100vw" }}
      data-testid="global-ekg-progress-viewport"
      role="progressbar"
      aria-label="Tenant cryptographic handshake in progress"
      aria-busy="true"
    >
      <svg className="h-full w-full overflow-visible text-emerald-400" aria-hidden>
        <path
          d="M0 4 H40 L48 1 L56 7 L64 4 H120 L128 2 L136 6 L144 4 H200 L208 1 L216 7 L224 4 H280 L288 2 L296 6 L304 4 H360 L368 1 L376 7 L384 4 H440 L448 2 L456 6 L464 4 H520 L528 1 L536 7 L544 4 H600 L608 2 L616 6 L624 4 H680 L688 1 L696 7 L704 4 H760 L768 2 L776 6 L784 4 H840 L848 1 L856 7 L864 4 H920 L928 2 L936 6 L944 4 H1000"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-ekgProgress"
        />
      </svg>
      <div className="absolute left-6 top-3 animate-pulse font-mono text-[9px] font-bold uppercase tracking-widest text-emerald-400/80">
        [ RUNNING CRYPTO HANDSHAKE CLIENT SYNC... ]
      </div>
    </div>
  );
}
