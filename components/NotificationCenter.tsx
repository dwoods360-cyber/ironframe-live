"use client";

import { useEffect } from "react";

type Props = {
  message: string | null;
  onDismiss: () => void;
  /** Seconds before auto-dismiss */
  durationMs?: number;
};

/**
 * Ironcast (Agent 7) — lightweight toast surface for clearance and broker-facing alerts.
 */
export default function NotificationCenter({ message, onDismiss, durationMs = 9000 }: Props) {
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => onDismiss(), durationMs);
    return () => window.clearTimeout(t);
  }, [message, onDismiss, durationMs]);

  if (!message) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[90] max-w-sm rounded-lg border border-emerald-600/70 bg-emerald-950/95 px-4 py-3 shadow-xl shadow-black/40 ring-1 ring-emerald-500/30"
      role="status"
      aria-live="polite"
    >
      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400/90">Ironcast · Agent 7</p>
      <p className="mt-1 text-[11px] leading-snug text-emerald-50">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-2 text-[9px] font-bold uppercase tracking-wide text-emerald-300/80 underline-offset-2 hover:text-emerald-200 hover:underline"
      >
        Dismiss
      </button>
    </div>
  );
}
