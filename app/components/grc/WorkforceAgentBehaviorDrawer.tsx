"use client";

import { CORE_WORKFORCE_AGENTS } from "@/app/config/agents";
import {
  getExpertAssigneeDisplay,
  getExpertJustification,
  getExpertTitle,
} from "@/app/config/expertAgentPersona";
import type { AgentWorkforceRuntimeSnapshot } from "@/app/store/agentStore";

type WorkforceAgentBehaviorDrawerProps = {
  agentId: string;
  runtime: AgentWorkforceRuntimeSnapshot;
  onClose: () => void;
};

export default function WorkforceAgentBehaviorDrawer({
  agentId,
  runtime,
  onClose,
}: WorkforceAgentBehaviorDrawerProps) {
  const roster = CORE_WORKFORCE_AGENTS.find((a) => a.name === agentId);
  const title = getExpertTitle(agentId);
  const assignee = getExpertAssigneeDisplay(agentId);
  const behaviorNarrative = getExpertJustification(agentId, "WORKFORCE_MONITOR");

  return (
    <div
      className="fixed inset-y-0 right-0 z-[195] flex w-full max-w-md flex-col border-l border-zinc-700 bg-zinc-950 shadow-2xl animate-in slide-in-from-right duration-300"
      role="dialog"
      aria-label={`${agentId} agent behavior drawer`}
    >
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-sky-300">
            {agentId} — Behavior Matrix
          </p>
          <p className="truncate text-[9px] text-zinc-500">{assignee}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded border border-zinc-700 px-2 py-0.5 text-[8px] font-black uppercase text-zinc-400 hover:border-zinc-500"
        >
          Close
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 text-[10px] leading-relaxed text-zinc-300">
        <section className="rounded border border-zinc-800/90 bg-zinc-900/40 p-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Operational title</p>
          <p className="mt-1 font-semibold text-zinc-100">{title}</p>
        </section>
        <section className="mt-3 rounded border border-zinc-800/90 bg-zinc-900/40 p-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Runtime posture</p>
          <ul className="mt-1.5 space-y-1 font-mono text-[9px] uppercase">
            <li>
              Pulse lane: <span className="text-sky-300">{runtime.pulse}</span>
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
        </section>
        <section className="mt-3 rounded border border-zinc-800/90 bg-zinc-900/40 p-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Detailed behaviors</p>
          <p className="mt-1.5 text-[10px] leading-relaxed text-zinc-200">{behaviorNarrative}</p>
        </section>
      </div>
    </div>
  );
}
