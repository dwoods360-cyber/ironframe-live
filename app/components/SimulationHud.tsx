"use client";

import { useKimbotStore } from "@/app/store/kimbotStore";
import { useGrcBotStore } from "@/app/store/grcBotStore";

export default function SimulationHud() {
  const kimbotEnabled = useKimbotStore((s) => s.enabled);
  const grcBotEnabled = useGrcBotStore((s) => s.enabled);

  if (!kimbotEnabled && !grcBotEnabled) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-900/50 px-4 py-2">
      {kimbotEnabled && (
        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-rose-500 bg-rose-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-rose-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" />
          KIMBOT: ACTIVE
        </span>
      )}
      {grcBotEnabled && (
        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-blue-500 bg-blue-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
          GRCBOT: ACTIVE
        </span>
      )}
    </div>
  );
}
