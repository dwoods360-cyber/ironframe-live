"use client";

import { useRiskStore } from "@/app/store/riskStore";

export default function LiabilityAlertToast() {
  const liabilityAlert = useRiskStore((s) => s.liabilityAlert);
  const setLiabilityAlert = useRiskStore((s) => s.setLiabilityAlert);

  if (!liabilityAlert.active || !liabilityAlert.message) return null;

  return (
    <div
      role="alert"
      className="fixed top-4 left-1/2 z-[100] -translate-x-1/2 animate-pulse rounded border-2 border-red-500/80 bg-red-950/95 px-4 py-3 shadow-[0_0_24px_rgba(239,68,68,0.4)]"
    >
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <p className="text-sm font-bold uppercase tracking-wide text-red-200">
          Liability Alert — GRC operator action required
        </p>
      </div>
      <p className="mt-1 text-xs text-red-100/90">{liabilityAlert.message}</p>
      <button
        type="button"
        onClick={() => setLiabilityAlert({ active: false })}
        className="mt-2 rounded border border-red-500/70 bg-red-500/20 px-2 py-1 text-[10px] font-bold uppercase text-red-200 hover:bg-red-500/30"
      >
        Dismiss
      </button>
    </div>
  );
}
