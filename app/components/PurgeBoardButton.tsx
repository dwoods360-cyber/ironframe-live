"use client";

import { useState } from "react";
import { purgeAllDataAction } from "@/app/actions/purgeSimulation";
import { useRiskStore } from "@/app/store/riskStore";

/**
 * Purge chip: server bulk-resolves threats (DB rows kept for history); local store cleared via
 * `clearAllRiskStateForPurge` so the board empties until the next fetch matches the active filter.
 */
export function PurgeBoardButton() {
  const [purging, setPurging] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  return (
    <>
      <div className="shrink-0 text-right text-[10px] leading-tight text-[#ff4b4b] font-mono whitespace-nowrap">
        Master State Reset. ⚠️ DEV ONLY:
        <br />
        Do not deploy to Prod!
      </div>
      {showPurgeConfirm ? (
        <div className="flex items-center gap-2 rounded border border-slate-600 bg-slate-900/90 px-2 py-1">
          <span className="text-[10px] text-slate-300">Clear active board?</span>
          <button
            type="button"
            disabled={purging}
            onClick={async () => {
              if (purging) return;
              setPurging(true);
              try {
                const result = await purgeAllDataAction();
                if (!result.ok) {
                  setShowPurgeConfirm(false);
                  return;
                }
                useRiskStore.getState().clearAllRiskStateForPurge();
                setShowPurgeConfirm(false);
              } finally {
                setPurging(false);
              }
            }}
            className="rounded border border-rose-500/60 bg-rose-500/20 px-2 py-1 text-[10px] font-bold uppercase text-rose-300 hover:bg-rose-500/30 disabled:opacity-50"
          >
            {purging ? "…" : "Yes"}
          </button>
          <button
            type="button"
            onClick={() => setShowPurgeConfirm(false)}
            disabled={purging}
            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-[10px] font-bold uppercase text-slate-300 hover:bg-slate-700"
          >
            No
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowPurgeConfirm(true)}
          disabled={purging}
          className="rounded border border-rose-500/60 bg-rose-500/10 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
        >
          Purge
        </button>
      )}
    </>
  );
}
