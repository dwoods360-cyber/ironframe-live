"use client";

import { useRiskStore } from "@/app/store/riskStore";

export default function ThreatActionErrorToast() {
  const threatActionError = useRiskStore((s) => s.threatActionError);
  const setThreatActionError = useRiskStore((s) => s.setThreatActionError);

  if (!threatActionError.active || !threatActionError.message) return null;

  return (
    <div
      role="alert"
      className="fixed left-1/2 z-[99] -translate-x-1/2 rounded border border-red-500/70 bg-red-950/95 px-4 py-3 shadow-lg"
      style={{ top: "8rem" }}
    >
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 rounded-full bg-red-400" />
        <p className="text-sm font-bold uppercase tracking-wide text-red-200">
          Error
        </p>
      </div>
      <p className="mt-1 text-xs text-red-100/90">
        {threatActionError.message}
      </p>
      <button
        type="button"
        onClick={() => setThreatActionError({ active: false, message: "" })}
        className="mt-2 rounded border border-red-500/70 bg-red-500/20 px-2 py-1 text-[10px] font-bold uppercase text-red-200 hover:bg-red-500/30"
      >
        Dismiss
      </button>
    </div>
  );
}
