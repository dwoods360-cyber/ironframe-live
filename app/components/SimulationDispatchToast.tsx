"use client";

import { useCallback, useEffect, useState } from "react";
import {
  SIMULATION_DISPATCH_NOTICE_EVENT,
  type SimulationDispatchNoticeDetail,
} from "@/app/utils/simulationDispatchOutcome";
import { useSystemConfigStore } from "@/app/store/systemConfigStore";
import {
  FLOATING_NOTIFY_Z_CLASS,
  floatingNotifyTopRightClass,
} from "@/app/config/layoutConstants";

/**
 * Upper-right simulation dispatch notice — autonomous / perimeter-neutralized drills
 * that do not produce an Active Risks handoff card.
 */
export default function SimulationDispatchToast() {
  const [notice, setNotice] = useState<SimulationDispatchNoticeDetail | null>(null);
  const isSimulationMode = useSystemConfigStore((s) => s.isSimulationMode);

  const dismiss = useCallback(() => setNotice(null), []);

  useEffect(() => {
    const onNotice = (event: Event) => {
      const detail = (event as CustomEvent<SimulationDispatchNoticeDetail>).detail;
      if (!detail?.message?.trim()) return;
      setNotice({
        scenarioName: detail.scenarioName?.trim() || "Simulation drill",
        message: detail.message.trim(),
        forensicLine: detail.forensicLine?.trim(),
      });
    };
    window.addEventListener(SIMULATION_DISPATCH_NOTICE_EVENT, onNotice);
    return () => window.removeEventListener(SIMULATION_DISPATCH_NOTICE_EVENT, onNotice);
  }, []);

  if (notice == null) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto fixed right-4 w-[min(92vw,24rem)] animate-in slide-in-from-right-4 fade-in duration-300 ${floatingNotifyTopRightClass(isSimulationMode)} ${FLOATING_NOTIFY_Z_CLASS}`}
    >
      <div className="rounded-lg border border-amber-500/70 bg-gradient-to-br from-slate-950/98 via-amber-950/40 to-blue-950/35 px-4 py-3 shadow-[0_0_24px_rgba(245,158,11,0.22)] backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-300">
              Simulation dispatch
            </p>
            <p className="mt-1 text-[11px] font-semibold leading-snug text-slate-100">
              {notice.message}
            </p>
            {notice.forensicLine ? (
              <p className="mt-2 rounded border border-blue-500/30 bg-blue-950/30 px-2 py-1.5 font-mono text-[9px] leading-relaxed text-blue-100/90">
                {notice.forensicLine}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded border border-slate-600 bg-slate-900/80 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-300 hover:bg-slate-800"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
