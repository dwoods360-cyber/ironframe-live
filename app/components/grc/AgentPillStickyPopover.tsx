"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CORE_WORKFORCE_AGENTS } from "@/app/config/agents";
import {
  getExpertAssigneeDisplay,
  getExpertJustification,
  getExpertTitle,
} from "@/app/config/expertAgentPersona";
import type { AgentPillPopoverState } from "@/app/store/agentStore";
import { computeAgentPillPopoverPosition } from "@/app/utils/agentPillPopoverAnchor";

type AgentPillStickyPopoverProps = {
  popover: AgentPillPopoverState;
  onClose: () => void;
};

export default function AgentPillStickyPopover({ popover, onClose }: AgentPillStickyPopoverProps) {
  const { left, top, width } = computeAgentPillPopoverPosition(popover.anchorRect);
  const roster = CORE_WORKFORCE_AGENTS.find((a) => a.name === popover.agentId);
  const title = getExpertTitle(popover.agentId);
  const assignee = getExpertAssigneeDisplay(popover.agentId);
  const behaviorNarrative = getExpertJustification(popover.agentId, "WORKFORCE_MONITOR");
  const { runtime } = popover;

  const operationalHealth =
    runtime.pulse === "ALERT" ? "ALERT" : runtime.pulse === "IDLE" ? "STANDBY" : "ACTIVE";

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onScrollOrResize = () => onClose();
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed z-[200] select-text rounded-lg border border-zinc-600 bg-zinc-950/98 p-3 shadow-2xl"
      style={{ left, top, width, transform: "translateY(-100%)" }}
      role="dialog"
      aria-label={
        popover.mode === "telemetry"
          ? `${popover.agentId} live telemetry`
          : `${popover.agentId} agent behavior`
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-black uppercase tracking-widest text-zinc-400">
            {popover.agentId}
          </p>
          <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-sky-300/90">
            {popover.mode === "telemetry" ? "Live telemetry" : "Agent role & behavior"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded border border-zinc-600 px-2 py-0.5 text-[8px] font-black uppercase text-zinc-300 hover:border-zinc-500"
        >
          Close
        </button>
      </div>

      {popover.mode === "telemetry" ? (
        <div className="mt-2.5 space-y-2">
          <p className="font-mono text-[9px] leading-relaxed text-zinc-200">
            Roster index {roster?.index ?? "—"} · Bus stream verified · Operational health{" "}
            <span
              className={
                operationalHealth === "ALERT"
                  ? "text-red-300"
                  : operationalHealth === "STANDBY"
                    ? "text-zinc-400"
                    : "text-emerald-300"
              }
            >
              {operationalHealth}
            </span>
          </p>
          <ul className="space-y-1 rounded-md border border-zinc-700/90 bg-zinc-900/60 px-2.5 py-2 font-mono text-[9px] uppercase text-zinc-300">
            <li>
              Pulse: <span className="text-sky-300">{runtime.pulse}</span>
            </li>
            <li>
              Checkpoint:{" "}
              <span className={runtime.checkpointFrozen ? "text-violet-300" : "text-emerald-300"}>
                {runtime.checkpointFrozen ? "FROZEN" : "SYNCED"}
              </span>
            </li>
            <li>
              Telemetry burst:{" "}
              <span className={runtime.telemetryActive ? "text-emerald-300" : "text-zinc-500"}>
                {runtime.telemetryActive ? "LIVE" : "IDLE"}
              </span>
            </li>
            {roster ? (
              <li>
                Data source: <span className="text-zinc-400">{roster.dataSource}</span>
              </li>
            ) : null}
          </ul>
        </div>
      ) : (
        <div className="mt-2.5 space-y-2">
          <p className="text-[10px] font-semibold leading-snug text-zinc-100">{title}</p>
          <p className="text-[8px] text-zinc-500">{assignee}</p>
          {roster ? (
            <p className="text-[8px] font-mono uppercase text-zinc-500">
              Source: {roster.dataSource}
            </p>
          ) : null}
          <p className="text-[10px] leading-relaxed text-zinc-200">{behaviorNarrative}</p>
          <p className="text-[9px] leading-relaxed text-zinc-400">
            Double-click this agent to run a localized diagnostic audit — results open in the
            right-hand inspect rail.
          </p>
        </div>
      )}
    </div>,
    document.body,
  );
}
