"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { getIrontechActiveLogDive } from "@/app/actions/irontechUiActions";
import { useRiskStore } from "@/app/store/riskStore";
import { useComplianceOverlayStore } from "@/app/store/complianceOverlayStore";

/**
 * Left-pane Irontech enclave: compliance overlay + chaos controls.
 * Solid zinc frame only — no dashed “cage”, no redundant chrome (parent section owns “CONTROL ROOM”).
 */
export default function ControlRoom({ children }: { children?: ReactNode }) {
  const [logDive, setLogDive] = useState(false);
  const selectedThreatId = useRiskStore((s) => s.selectedThreatId);
  const showCompliance = useComplianceOverlayStore((s) => s.showCompliance);
  const setShowCompliance = useComplianceOverlayStore((s) => s.setShowCompliance);
  const lastLogDiveFetchRef = useRef<{ at: number; threatId: string | null }>({
    at: 0,
    threatId: null,
  });

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      const now = Date.now();
      const tid = selectedThreatId ?? null;
      const last = lastLogDiveFetchRef.current;
      const threatChanged = tid !== last.threatId;
      const stale = now - last.at >= 5000;
      if (!threatChanged && !stale) return;
      lastLogDiveFetchRef.current = { at: now, threatId: tid };
      void getIrontechActiveLogDive().then((on) => {
        if (cancelled) return;
        setLogDive((prev) => (prev === on ? prev : on));
      });
    };
    tick();
    const id = setInterval(tick, 500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [selectedThreatId]);

  return (
    <div className="col-span-full w-full max-w-full rounded-sm border border-zinc-800/90 bg-[#050509] p-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
      <div className="flex w-full flex-wrap items-stretch gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={showCompliance}
          aria-label="Compliance overlay"
          onClick={() => setShowCompliance(!showCompliance)}
          className={`flex h-8 shrink-0 items-center gap-2 rounded-sm border px-2.5 text-[8px] font-black uppercase tracking-widest transition-all ${
            showCompliance
              ? "border-teal-400/70 bg-teal-950/45 text-teal-100 shadow-[inset_0_1px_0_0_rgba(45,212,191,0.15),0_0_14px_rgba(45,212,191,0.12)]"
              : "border-zinc-700/90 bg-zinc-950 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400"
          }`}
        >
          <span
            className={`h-2 w-5 rounded-full transition-colors ${
              showCompliance ? "bg-teal-400 shadow-[0_0_8px_#2dd4bf]" : "bg-zinc-700"
            }`}
            aria-hidden
          />
          <span className="whitespace-nowrap">🛡️ COMPLIANCE OVERLAY</span>
        </button>
        {logDive ? (
          <span className="self-center text-[7px] font-semibold uppercase tracking-wide text-cyan-500/90">
            Log-dive
          </span>
        ) : null}
      </div>
      {children ? <div className="mt-2 min-w-0">{children}</div> : null}
    </div>
  );
}
