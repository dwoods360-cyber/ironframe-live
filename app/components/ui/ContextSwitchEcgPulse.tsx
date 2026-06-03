"use client";

import { useRiskStore } from "@/app/store/riskStore";

/** Full-viewport ECG sweep — active while TENANT-001 context switch paint gate is open. */
export default function ContextSwitchEcgProgressBar() {
  const isContextSwitching = useRiskStore((s) => s.isContextSwitching);

  if (!isContextSwitching) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed left-0 top-16 z-[55] h-1 w-full overflow-hidden bg-slate-950/20"
      data-testid="context-switch-ecg-progress-bar"
      role="progressbar"
      aria-label="Tenant cryptographic handshake in progress"
      aria-busy="true"
    >
      <div className="context-switch-ecg-sweep absolute inset-y-0 w-full min-w-[100vw]">
        <svg
          viewBox="0 0 1200 8"
          preserveAspectRatio="none"
          className="h-full w-full text-emerald-400"
          aria-hidden
        >
          <path
            d="M0 4 H120 L128 1 L136 7 L144 4 H280 L288 2 L296 6 L304 4 H440 L448 1 L456 7 L464 4 H600 L608 2 L616 6 L624 4 H760 L768 1 L776 7 L784 4 H920 L928 2 L936 6 L944 4 H1200"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
