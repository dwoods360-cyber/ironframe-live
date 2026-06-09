"use client";

/** @deprecated Not mounted — single-click inspect uses portaled right rail only. */

import { AGENT_INSPECT_FLOATING_NOTICE_WIDTH_CLASS } from "@/app/config/layoutConstants";
import type { AgentWorkforceRuntimeSnapshot } from "@/app/store/agentStore";
import type { LocalizedAuditResult } from "@/app/utils/workforceAgentPillPipeline";

export type AgentInspectFloatingAnchor = {
  agentId: string;
  x: number;
  y: number;
};

type AgentInspectFloatingNoticeProps = {
  anchor: AgentInspectFloatingAnchor;
  runtime: AgentWorkforceRuntimeSnapshot;
  audit: LocalizedAuditResult;
  onDismiss: () => void;
};

const NOTICE_WIDTH_PX = 448; // 28rem — matches center notification lane

/** Notification-sized floating frame — audit result + live runtime state at click coordinates. */
export default function AgentInspectFloatingNotice({
  anchor,
  runtime,
  audit,
  onDismiss,
}: AgentInspectFloatingNoticeProps) {
  const left = Math.min(
    Math.max(anchor.x, 16),
    typeof window !== "undefined" ? window.innerWidth - NOTICE_WIDTH_PX - 16 : anchor.x,
  );
  const top = Math.min(
    Math.max(anchor.y, 16),
    typeof window !== "undefined" ? window.innerHeight - 280 : anchor.y,
  );

  return (
    <div
      className={`fixed z-[200] ${AGENT_INSPECT_FLOATING_NOTICE_WIDTH_CLASS} rounded-lg border border-zinc-600 bg-zinc-950/98 p-4 shadow-2xl select-text`}
      style={{ left, top }}
      role="dialog"
      aria-label={`${anchor.agentId} audit and runtime state`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            {anchor.agentId}
          </p>
          <p
            className={`mt-1.5 text-sm font-black uppercase ${
              audit.pass ? "text-emerald-300" : "text-red-300"
            }`}
          >
            Audit {audit.inlineLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded border border-zinc-600 px-2.5 py-1 text-[9px] font-black uppercase text-zinc-300 hover:border-zinc-500"
        >
          Dismiss
        </button>
      </div>
      <p className="mt-3 font-mono text-[10px] leading-relaxed text-zinc-200">{audit.streamMessage}</p>
      <div className="mt-3 rounded-md border border-zinc-700/90 bg-zinc-900/60 px-3 py-2.5">
        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Current state</p>
        <ul className="mt-2 space-y-1 font-mono text-[10px] uppercase text-zinc-300">
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
            Telemetry:{" "}
            <span className={runtime.telemetryActive ? "text-emerald-300" : "text-zinc-500"}>
              {runtime.telemetryActive ? "LIVE" : "IDLE"}
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
