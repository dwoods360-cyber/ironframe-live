"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { CORE_WORKFORCE_AGENTS } from "@/app/config/agents";
import {
  applyRiskDominanceBoost,
  useCommandPostStore,
} from "@/app/store/commandPostStore";
import { useCommandPostRiskSignal, useEffectiveCommandPostCells } from "@/app/hooks/useCommandPostLayout";
import { useLayoutStore } from "@/app/store/useLayoutStore";
import { useRiskStore } from "@/app/store/riskStore";
import TelemetryWidget from "@/app/components/commandPost/TelemetryWidget";

type Props = {
  /** When set, grid fills parent height (full cockpit). */
  variant?: "embedded" | "cockpit";
};

export default function CommandPostGrid({ variant = "embedded" }: Props) {
  const effective = useEffectiveCommandPostCells();
  const setAgentCell = useCommandPostStore((s) => s.setAgentCell);
  const resetCommandPostLayout = useCommandPostStore((s) => s.resetCommandPostLayout);
  const risk = useCommandPostRiskSignal();
  const isUiLocked = useLayoutStore((s) => s.isUiLocked);
  const enqueueAgentLayoutRequest = useLayoutStore((s) => s.enqueueAgentLayoutRequest);
  const agentLayoutQueue = useLayoutStore((s) => s.agentLayoutQueue);
  const activeThreatCount = useRiskStore((s) => s.activeThreats.length);

  const prevDominance = useRef(risk.dominanceActive);
  const prevThreatCount = useRef(activeThreatCount);

  useEffect(() => {
    if (!isUiLocked) {
      prevDominance.current = risk.dominanceActive;
      prevThreatCount.current = activeThreatCount;
      return;
    }
    if (risk.dominanceActive && !prevDominance.current) {
      enqueueAgentLayoutRequest({
        source: "ironscribe",
        reason: "risk_dominance_edge_while_ui_locked",
      });
    }
    prevDominance.current = risk.dominanceActive;
  }, [isUiLocked, risk.dominanceActive, enqueueAgentLayoutRequest, activeThreatCount]);

  useEffect(() => {
    if (!isUiLocked) {
      prevThreatCount.current = activeThreatCount;
      return;
    }
    if (activeThreatCount > prevThreatCount.current) {
      enqueueAgentLayoutRequest({
        source: "ironwatch",
        reason: `active_threats_increase_${prevThreatCount.current}->${activeThreatCount}`,
      });
    }
    prevThreatCount.current = activeThreatCount;
  }, [isUiLocked, activeThreatCount, enqueueAgentLayoutRequest]);

  const onCommit = useCallback(
    (index: number) => (next: { colSpan: number; rowSpan: number }) => {
      if (useLayoutStore.getState().isUiLocked) return;
      setAgentCell(index, next);
    },
    [setAgentCell],
  );

  const cockpit = variant === "cockpit";

  return (
    <div className={cockpit ? "flex min-h-0 flex-1 flex-col gap-2 p-0" : "flex flex-col gap-2 p-0"}>
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-800/70 pb-2">
        <div>
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300/90">Command Post</h2>
          <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
            Dense 12-column grid — drag the grip to resize spans. Ironscribe risk plane:{" "}
            {!isUiLocked && risk.dominanceActive ? (
              <span className="font-semibold text-amber-300">
                cockpit dominance (Ironguard / Ironlock expanded)
              </span>
            ) : isUiLocked ? (
              <span className="font-semibold text-rose-300/90">UI lock — agent-led span boosts suspended</span>
            ) : (
              <span className="text-slate-500">nominal</span>
            )}
            . Layout persists locally for the governed view.
            {isUiLocked && agentLayoutQueue.length > 0 ? (
              <span className="mt-1 block text-[9px] text-amber-400/90">
                Queued agent layout signals: {agentLayoutQueue.length} (Ironscribe / Ironwatch) — flush on unlock.
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!cockpit ? (
            <Link
              href="/cockpit"
              className="rounded border border-cyan-800/60 bg-cyan-950/40 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-cyan-200 hover:bg-cyan-900/50"
            >
              Full cockpit
            </Link>
          ) : null}
          <button
            type="button"
            disabled={isUiLocked}
            onClick={() => resetCommandPostLayout()}
            title={isUiLocked ? "Unlock Command Post before resetting layout" : undefined}
            className="rounded border border-slate-700 bg-slate-900/80 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reset layout
          </button>
        </div>
      </div>

      <div
        className={`grid w-full max-w-full min-w-0 grid-cols-12 gap-2 overflow-x-hidden p-0 auto-rows-[minmax(150px,auto)] ${
          isUiLocked ? "grid-flow-row" : "grid-flow-dense"
        } ${cockpit ? "min-h-0 flex-1 content-start" : "min-h-[min(55vh,560px)] content-start"}`}
      >
        {CORE_WORKFORCE_AGENTS.map((agent) => {
          const base = effective[agent.index]!;
          const cell = isUiLocked ? base : applyRiskDominanceBoost(agent.index, base, risk);
          const boosted = !isUiLocked && risk.dominanceActive && (agent.index === 6 || agent.index === 12);
          return (
            <TelemetryWidget
              key={agent.index}
              agent={agent}
              colSpan={cell.colSpan}
              rowSpan={cell.rowSpan}
              boosted={boosted}
              resizeLocked={isUiLocked}
              onCommitSize={onCommit(agent.index)}
            />
          );
        })}
      </div>
    </div>
  );
}
