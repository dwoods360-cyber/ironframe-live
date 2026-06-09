"use client";

/** @deprecated Cursor-positioned override menu — not mounted in inspect flow. */

import type { AgentWorkforceRuntimeSnapshot } from "@/app/store/agentStore";
import type { AgentInspectFloatingAnchor } from "@/app/components/grc/AgentInspectFloatingNotice";

type AgentOverrideModalProps = {
  anchor: AgentInspectFloatingAnchor;
  runtime: AgentWorkforceRuntimeSnapshot;
  onRunLocalizedAudit: (agentId: string) => void;
  onDismiss: () => void;
};

export default function AgentOverrideModal({
  anchor,
  runtime,
  onRunLocalizedAudit,
  onDismiss,
}: AgentOverrideModalProps) {
  return (
    <div
      className="fixed z-[200] min-w-[14rem] rounded border border-zinc-700 bg-zinc-950/95 p-2 shadow-xl select-text"
      style={{ left: anchor.x, top: anchor.y }}
      role="dialog"
      aria-label={`${anchor.agentId} override menu`}
    >
      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
        {anchor.agentId} Override
      </p>
      <div className="mt-2 rounded border border-zinc-800/90 bg-zinc-900/50 px-2 py-1.5">
        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Runtime state</p>
        <ul className="mt-1 space-y-0.5 font-mono text-[8px] uppercase text-zinc-400">
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
      <button
        type="button"
        className="mt-2 block w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-left text-[9px] font-mono uppercase text-emerald-300 hover:border-emerald-700"
        onClick={() => {
          onRunLocalizedAudit(anchor.agentId);
          onDismiss();
        }}
      >
        RUN LOCALIZED AUDIT
      </button>
      <button
        type="button"
        className="mt-1 block w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-left text-[9px] font-mono uppercase text-zinc-400 hover:border-zinc-600"
        onClick={onDismiss}
      >
        DISMISS
      </button>
    </div>
  );
}
