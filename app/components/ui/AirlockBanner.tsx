"use client";

import { useEffect, useState } from "react";
import { setSimulationMode, useSystemConfigStore } from "@/app/store/systemConfigStore";

/** Matches `h-9` / `top-9` / `pt-9` offsets in AppShell. */
export const AIRLOCK_BANNER_HEIGHT_CLASS = "h-9";

const POLL_MS = 4000;

export default function AirlockBanner() {
  const isSimulationMode = useSystemConfigStore().isSimulationMode;
  const [criticalBreach, setCriticalBreach] = useState(false);

  useEffect(() => {
    if (!isSimulationMode) {
      setCriticalBreach(false);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/opsupport/deficiency-queue", { cache: "no-store" });
        const j = (await res.json().catch(() => ({}))) as {
          unresolved?: Array<{ severityLabel?: string }>;
        };
        if (cancelled) return;
        const items = j.unresolved ?? [];
        const hasCritical = items.some(
          (u) => (u.severityLabel ?? "").toString().toUpperCase() === "CRITICAL",
        );
        setCriticalBreach(hasCritical);
      } catch {
        if (!cancelled) setCriticalBreach(false);
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isSimulationMode]);

  if (!isSimulationMode) {
    return null;
  }

  return (
    <div
      className={`fixed inset-x-0 top-0 z-[60] ${AIRLOCK_BANNER_HEIGHT_CLASS} flex items-center justify-center gap-4 border-b border-amber-400/80 bg-gradient-to-r from-amber-600 via-violet-900 to-amber-600 px-3 shadow-[0_2px_12px_rgba(0,0,0,0.45)]`}
      role="status"
      aria-live="polite"
    >
      <span className="flex flex-wrap items-center justify-center gap-2 font-mono text-[11px] font-black uppercase tracking-wide text-black drop-shadow-sm">
        {criticalBreach ? (
          <span className="flex items-center gap-1.5" title="Unresolved critical deficiency in shadow queue">
            <span
              className="relative inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.95)] animate-pulse"
              aria-hidden
            />
            <span className="text-red-950">SYSTEM BREACH DETECTED</span>
          </span>
        ) : null}
        <span>[ ⚠️ SHADOW PLANE ACTIVE — SIMULATION MODE ]</span>
      </span>
      <button
        type="button"
        onClick={() => setSimulationMode(false)}
        className="shrink-0 rounded border-2 border-black/80 bg-black px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider text-amber-200 shadow-sm hover:bg-zinc-950 hover:text-amber-100"
      >
        RETURN TO PRODUCTION
      </button>
    </div>
  );
}
