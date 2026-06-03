"use client";

/** Looping ECG-style pulse line for tenant crypto-handshake sync feedback. */
export default function ContextSwitchEcgPulse() {
  return (
    <svg
      viewBox="0 0 120 24"
      className="h-4 w-28 shrink-0 text-emerald-400"
      role="img"
      aria-label="Active cryptographic handshake pulse"
    >
      <path
        d="M0 12 H18 L22 4 L26 20 L30 12 H52 L56 6 L60 18 L64 12 H120"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="context-switch-ecg-line"
      />
    </svg>
  );
}
