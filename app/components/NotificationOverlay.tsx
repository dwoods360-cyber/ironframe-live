"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  IRONCAST_TOAST_DURATION_MS,
  useIroncastNotificationStore,
  type IroncastNotificationToast,
} from "@/app/store/ironcastNotificationStore";

function IroncastToastCard({
  toast,
  onDismiss,
}: {
  toast: IroncastNotificationToast;
  onDismiss: (id: string) => void;
}) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeAt = IRONCAST_TOAST_DURATION_MS - 500;
    const fadeTimer = window.setTimeout(() => setFading(true), fadeAt);
    const removeTimer = window.setTimeout(() => onDismiss(toast.id), IRONCAST_TOAST_DURATION_MS);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, [toast.id, onDismiss]);

  const threatTone =
    toast.severity === "critical"
      ? "text-red-400"
      : "text-amber-400";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`pointer-events-auto rounded-lg border border-slate-700/90 bg-slate-950/95 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)] ring-1 ring-slate-800/80 backdrop-blur-sm transition-opacity duration-500 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
            Ironcast · Agent 7
          </p>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-wide text-slate-400">
            The threat detected
          </p>
          <p className={`mt-0.5 font-mono text-[11px] font-bold leading-snug ${threatTone}`}>
            {toast.threatDetected}
          </p>
          <p className="mt-2.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
            The agent action
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-200">{toast.agentAction}</p>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 rounded border border-slate-700/80 p-1 text-slate-500 transition-colors hover:border-slate-600 hover:text-slate-300"
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/**
 * Fixed toast stack for Ironcast (Agent 7) block-level security dispatches.
 * Mount once in the root layout — no layout shift (fixed positioning).
 */
export default function NotificationOverlay() {
  const toasts = useIroncastNotificationStore((s) => s.toasts);
  const dismissToast = useIroncastNotificationStore((s) => s.dismissToast);

  const handleDismiss = useCallback(
    (id: string) => {
      dismissToast(id);
    },
    [dismissToast],
  );

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed top-4 right-4 z-[650] flex w-[min(96vw,24rem)] flex-col gap-2"
      aria-label="Ironcast security notifications"
    >
      {toasts.map((toast) => (
        <IroncastToastCard key={toast.id} toast={toast} onDismiss={handleDismiss} />
      ))}
    </div>
  );
}
