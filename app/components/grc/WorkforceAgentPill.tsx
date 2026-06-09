"use client";

import { useCallback, useEffect, useRef } from "react";
import type { AgentPulseState } from "@/app/utils/workforceAgentState";
import type { AgentPillAnchorRect } from "@/app/store/agentStore";
import { readAgentPillAnchorRect } from "@/app/utils/agentPillPopoverAnchor";
import { WORKFORCE_PILL_SINGLE_CLICK_GATE_MS } from "@/app/hooks/useWorkforceAgentPillMatrix";

type WorkforceAgentPillProps = {
  agentId: string;
  pulse: AgentPulseState;
  staggerMs: number;
  checkpointFrozen: boolean;
  /** Left click — sticky telemetry popover above this pill. */
  onAgentTelemetryPopover: (agentId: string, anchorRect: AgentPillAnchorRect) => void;
  /** Double click — localized audit + right inspect slide-out. */
  onAgentAuditInspect: (agentId: string) => void;
  /** Right click — sticky behavior / role popover above this pill. */
  onAgentBehaviorPopover: (agentId: string, anchorRect: AgentPillAnchorRect) => void;
};

export default function WorkforceAgentPill({
  agentId,
  pulse,
  staggerMs,
  checkpointFrozen,
  onAgentTelemetryPopover,
  onAgentAuditInspect,
  onAgentBehaviorPopover,
}: WorkforceAgentPillProps) {
  const pillRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<number | null>(null);
  const blockSingleAfterDoubleRef = useRef(false);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current != null) {
        window.clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  const cancelPendingSingleClick = useCallback(() => {
    if (clickTimeoutRef.current != null) {
      window.clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
  }, []);

  const readAnchor = useCallback((): AgentPillAnchorRect | null => {
    return readAgentPillAnchorRect(pillRef.current);
  }, []);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.detail > 1) {
        cancelPendingSingleClick();
        return;
      }
      cancelPendingSingleClick();
      clickTimeoutRef.current = window.setTimeout(() => {
        clickTimeoutRef.current = null;
        if (blockSingleAfterDoubleRef.current) {
          blockSingleAfterDoubleRef.current = false;
          return;
        }
        const anchor = readAnchor();
        if (!anchor) return;
        onAgentTelemetryPopover(agentId, anchor);
      }, WORKFORCE_PILL_SINGLE_CLICK_GATE_MS);
    },
    [agentId, cancelPendingSingleClick, onAgentTelemetryPopover, readAnchor],
  );

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      blockSingleAfterDoubleRef.current = true;
      cancelPendingSingleClick();
      onAgentAuditInspect(agentId);
    },
    [agentId, cancelPendingSingleClick, onAgentAuditInspect],
  );

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      cancelPendingSingleClick();
      const anchor = readAnchor();
      if (!anchor) return;
      onAgentBehaviorPopover(agentId, anchor);
    },
    [agentId, cancelPendingSingleClick, onAgentBehaviorPopover, readAnchor],
  );

  const livePing = pulse !== "IDLE" || checkpointFrozen;
  const dotCore = checkpointFrozen
    ? "bg-violet-500"
    : pulse === "ALERT"
      ? "bg-orange-500"
      : pulse === "TELEMETRY" || pulse === "ACTIVE"
        ? "bg-emerald-500"
        : "bg-slate-600";
  const pingRing = checkpointFrozen
    ? "bg-violet-400"
    : pulse === "ALERT"
      ? "bg-orange-400"
      : livePing
        ? "bg-emerald-400"
        : "bg-transparent";

  return (
    <div
      ref={pillRef}
      role="listitem"
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      className="group relative flex min-h-[2.25rem] min-w-0 w-full cursor-pointer select-none items-center gap-1.5 rounded border border-slate-800 bg-slate-900/40 px-2 py-1.5 transition-all hover:border-slate-700 hover:bg-slate-800/60"
      aria-label={`${agentId} ${checkpointFrozen ? "FROZEN" : pulse}`}
      title="Left-Click: Telemetry | Double-Click: Audit & Inspect | Right-Click: Role & Behavior"
    >
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
        {livePing ? (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${pingRing}`}
            style={{ animationDelay: `${staggerMs}ms` }}
          />
        ) : null}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dotCore}`} />
      </span>
      <span className="min-w-0 flex-1 truncate font-mono text-[9px] leading-tight text-slate-300 group-hover:text-emerald-400">
        {agentId}
      </span>
    </div>
  );
}
