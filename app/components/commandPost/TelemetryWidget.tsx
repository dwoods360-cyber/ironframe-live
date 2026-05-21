"use client";

import { useCallback, useRef, useState } from "react";
import type { CoreWorkforceAgent } from "@/app/config/agents";
import { useUser } from "@/app/hooks/useUser";
import { MoveDiagonal } from "lucide-react";
import { useAgentRiskStore, type AgentRiskLevel } from "@/app/store/agentRiskStore";
import { useLayoutStore } from "@/app/store/useLayoutStore";

export type TelemetryWidgetProps = {
  agent: CoreWorkforceAgent;
  colSpan: number;
  rowSpan: number;
  onCommitSize: (next: { colSpan: number; rowSpan: number }) => void;
  boosted?: boolean;
  /** Command Post UI lock — no resize commits; handle hidden. */
  resizeLocked?: boolean;
  children?: React.ReactNode;
};

/**
 * Resizable agent tile for the Command Post grid. Drag the SE handle to change col/row span;
 * `grid-flow-dense` on the parent re-packs siblings (self-healing layout).
 *
 * Ironwatch (Agent 15): outer glow pulse from `agentRiskStore` — visual-only layer (`pointer-events-none`),
 * does not alter grid metrics. Ironlock global freeze forces static red on all tiles.
 *
 * Human authority: amber/red tiles can be click-acknowledged (unless Gavel — state freeze or tenant hard ban).
 */
export default function TelemetryWidget({
  agent,
  colSpan,
  rowSpan,
  onCommitSize,
  boosted = false,
  resizeLocked = false,
  children,
}: TelemetryWidgetProps) {
  const byIndex = useAgentRiskStore((s) => s.byIndex);
  const ironlockGlobalStateFreeze = useAgentRiskStore((s) => s.ironlockGlobalStateFreeze);
  const quarantineHardBanActive = useAgentRiskStore((s) => s.quarantineHardBanActive);
  const acknowledgeAnomaly = useAgentRiskStore((s) => s.acknowledgeAnomaly);
  const showIroncastToast = useLayoutStore((s) => s.showIroncastToast);
  const { userId, assigneeSelectValue } = useUser();

  const [preview, setPreview] = useState<{ col: number; row: number } | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startCol: number;
    startRow: number;
  } | null>(null);
  const ackBusy = useRef(false);

  const displayCol = preview?.col ?? colSpan;
  const displayRow = preview?.row ?? rowSpan;

  const pulse = byIndex[agent.index] ?? { healthScore: 85, riskLevel: "low" as AgentRiskLevel };
  const effectiveLevel: AgentRiskLevel = ironlockGlobalStateFreeze ? "high" : pulse.riskLevel;

  const gavelBlocksAck = ironlockGlobalStateFreeze || quarantineHardBanActive;
  const canAcknowledge =
    !gavelBlocksAck && (pulse.riskLevel === "medium" || pulse.riskLevel === "high");

  const onAckClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!canAcknowledge || ackBusy.current) return;
      ackBusy.current = true;
      try {
        const res = await fetch("/api/ironwatch/human-ack-anomaly", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            agentName: agent.name,
            agentIndex: agent.index,
            userId: userId || assigneeSelectValue,
          }),
        });
        if (!res.ok) return;
        acknowledgeAnomaly(String(agent.index));
        showIroncastToast(
          "Anomaly acknowledged. System integrity re-verified by Human Authority.",
        );
      } finally {
        ackBusy.current = false;
      }
    },
    [agent.index, agent.name, acknowledgeAnomaly, assigneeSelectValue, canAcknowledge, showIroncastToast, userId],
  );

  const borderClass =
    effectiveLevel === "low"
      ? "border-emerald-500/50"
      : effectiveLevel === "medium"
        ? "border-amber-500"
        : "border-red-600";

  const pulseGlowClass = ironlockGlobalStateFreeze
    ? "pointer-events-none absolute -inset-[2px] z-0 rounded-md border border-transparent shadow-[0_0_20px_rgba(220,38,38,0.72)] will-change-[box-shadow]"
    : effectiveLevel === "medium"
      ? "pointer-events-none absolute -inset-[2px] z-0 rounded-md border border-transparent shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-ironwatch-pulse-slow will-change-[box-shadow]"
      : effectiveLevel === "high"
        ? "pointer-events-none absolute -inset-[2px] z-0 rounded-md border border-transparent shadow-[0_0_14px_rgba(220,38,38,0.55)] animate-ironwatch-pulse-fast will-change-[box-shadow]"
        : "pointer-events-none absolute -inset-[2px] z-0 rounded-md border border-transparent opacity-0";

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (resizeLocked || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startCol: colSpan,
        startRow: rowSpan,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setPreview({ col: colSpan, row: rowSpan });
    },
    [colSpan, rowSpan, resizeLocked],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const dc = Math.round(dx / 88);
    const dr = Math.round(dy / 56);
    const col = Math.max(1, Math.min(12, d.startCol + dc));
    const row = Math.max(1, Math.min(8, d.startRow + dr));
    setPreview({ col, row });
  }, []);

  const endDrag = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      dragRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      if (resizeLocked) {
        setPreview(null);
        return;
      }
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      const dc = Math.round(dx / 88);
      const dr = Math.round(dy / 56);
      onCommitSize({
        colSpan: Math.max(1, Math.min(12, d.startCol + dc)),
        rowSpan: Math.max(1, Math.min(8, d.startRow + dr)),
      });
      setPreview(null);
    },
    [onCommitSize, resizeLocked],
  );

  return (
    <div
      className="group relative isolate min-h-[140px] min-w-0 overflow-visible"
      style={{
        gridColumnEnd: `span ${displayCol}`,
        gridRowEnd: `span ${displayRow}`,
      }}
    >
      <div className={pulseGlowClass} aria-hidden />
      <section
        className={`relative z-10 flex h-full min-h-[140px] min-w-0 flex-col overflow-hidden border bg-slate-950/80 ${borderClass} ${
          boosted && !ironlockGlobalStateFreeze ? "shadow-[0_0_20px_rgba(245,158,11,0.22)]" : "shadow-sm"
        } ${canAcknowledge ? "cursor-pointer" : ""}`}
        aria-label={`${agent.label} telemetry`}
        onClick={canAcknowledge ? onAckClick : undefined}
        title={
          gavelBlocksAck
            ? "Acknowledgment suspended under Gavel (state freeze or hard ban)."
            : canAcknowledge
              ? "Acknowledge anomaly — restores green tier for this agent."
              : undefined
        }
      >
        {canAcknowledge ? (
          <span className="pointer-events-none absolute right-2 top-8 z-[15] max-w-[7rem] text-right text-[8px] font-medium uppercase tracking-wide text-slate-500/90 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            Click to Clear
          </span>
        ) : null}
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-900/60 px-2 py-1.5">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-wide text-cyan-300/95">{agent.label}</p>
            <p className="truncate text-[9px] text-slate-500">
              {agent.dataSource}
              <span className="ml-1 font-mono text-slate-600">· HS {pulse.healthScore}</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            {ironlockGlobalStateFreeze ? (
              <span className="rounded border border-red-600/80 bg-red-950/60 px-1.5 py-0.5 text-[8px] font-black uppercase text-red-200">
                Freeze
              </span>
            ) : null}
            {quarantineHardBanActive ? (
              <span className="rounded border border-rose-700/80 bg-rose-950/55 px-1.5 py-0.5 text-[8px] font-black uppercase text-rose-100">
                Hard ban
              </span>
            ) : null}
            {boosted ? (
              <span className="rounded border border-amber-600/60 bg-amber-950/50 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-200">
                Priority
              </span>
            ) : null}
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-2 text-[10px] leading-relaxed text-slate-400">
          {children ?? (
            <p>
              Ironwatch pulse reflects live risk tier. Resize when unlocked — glow is paint-only and does not shift the
              grid.
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label={`Resize ${agent.name} widget`}
          disabled={resizeLocked}
          className={`absolute bottom-1 right-1 z-20 flex h-7 w-7 items-center justify-center rounded border border-slate-600/80 bg-slate-900/90 text-slate-400 transition group-hover:opacity-100 ${
            resizeLocked
              ? "pointer-events-none cursor-not-allowed opacity-25"
              : "cursor-se-resize opacity-70 hover:border-cyan-600/60 hover:text-cyan-200"
          }`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <MoveDiagonal className="h-3.5 w-3.5" aria-hidden />
        </button>
      </section>
    </div>
  );
}
