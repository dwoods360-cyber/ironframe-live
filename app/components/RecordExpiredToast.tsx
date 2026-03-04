"use client";

import { useRiskStore } from "@/app/store/riskStore";

export default function RecordExpiredToast() {
  const recordExpiredToast = useRiskStore((s) => s.recordExpiredToast);
  const setRecordExpiredToast = useRiskStore((s) => s.setRecordExpiredToast);

  if (!recordExpiredToast.active || recordExpiredToast.count <= 0) return null;

  return (
    <div
      role="alert"
      className="fixed left-1/2 z-[99] -translate-x-1/2 rounded border border-amber-500/70 bg-amber-950/95 px-4 py-3 shadow-lg"
      style={{ top: "8rem" }}
    >
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        <p className="text-sm font-bold uppercase tracking-wide text-amber-200">
          Record Expired
        </p>
      </div>
      <p className="mt-1 text-xs text-amber-100/90">
        {recordExpiredToast.count} card{recordExpiredToast.count !== 1 ? "s" : ""} removed from pipeline (no longer in database).
      </p>
      <button
        type="button"
        onClick={() => setRecordExpiredToast({ active: false, count: 0 })}
        className="mt-2 rounded border border-amber-500/70 bg-amber-500/20 px-2 py-1 text-[10px] font-bold uppercase text-amber-200 hover:bg-amber-500/30"
      >
        Dismiss
      </button>
    </div>
  );
}
