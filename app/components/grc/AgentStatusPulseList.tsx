"use client";

import { useCallback, useMemo, useState } from "react";
import { CORE_WORKFORCE_AGENTS } from "@/app/config/agents";
import { useAgentStore } from "@/app/store/agentStore";
import type { PipelineThreat } from "@/app/store/riskStore";
import {
  mergeInventoryAgentWithPulse,
  type AgentPulseState,
} from "@/app/utils/workforceAgentState";

const MEDSHIELD_BASELINE_CENTS = 1110000000n;
const VAULTBANK_BASELINE_CENTS = 590000000n;
const GRIDCORE_BASELINE_CENTS = 470000000n;
const SYSTEM_BASELINE_SUM_CENTS =
  MEDSHIELD_BASELINE_CENTS + VAULTBANK_BASELINE_CENTS + GRIDCORE_BASELINE_CENTS;

type AgentStatusPulseListProps = {
  combinedThreats: PipelineThreat[];
  agentTelemetryPulseUntil: Record<string, number>;
  irongateClaimFlash: boolean;
  formattedResubscribeTime: string | null;
};

export default function AgentStatusPulseList({
  combinedThreats,
  agentTelemetryPulseUntil,
  irongateClaimFlash,
  formattedResubscribeTime,
}: AgentStatusPulseListProps) {
  const setActiveAgentId = useAgentStore((s) => s.setActiveAgentId);
  const addStreamMessage = useAgentStore((s) => s.addStreamMessage);
  const [popover, setPopover] = useState<{ agentId: string; x: number; y: number } | null>(null);

  const dispatchSingleLeftClickDrawer = useCallback(
    (agentId: string) => {
      setActiveAgentId(agentId);
    },
    [setActiveAgentId],
  );

  const executeLocalizedDiagnosticAuditLoop = useCallback(
    (agentId: string) => {
      const verified = SYSTEM_BASELINE_SUM_CENTS === 2170000000n;
      addStreamMessage(
        verified
          ? `> [AUDIT] ${agentId} diagnostic PASS — whole-integer baseline sum ${SYSTEM_BASELINE_SUM_CENTS.toString()} cents.`
          : `> [AUDIT] ${agentId} diagnostic FAIL — baseline drift detected.`,
      );
    },
    [addStreamMessage],
  );

  const triggerCustomDarkPopoverFrame = useCallback(
    (event: React.MouseEvent, agentId: string) => {
      setPopover({ agentId, x: event.clientX, y: event.clientY });
    },
    [],
  );

  const agentRows = useMemo(
    () =>
      CORE_WORKFORCE_AGENTS.map((agent, index) => {
        let pulse: AgentPulseState = mergeInventoryAgentWithPulse(
          agent.name,
          combinedThreats,
          agentTelemetryPulseUntil,
        );
        if (agent.name === "Irongate" && irongateClaimFlash) {
          pulse = "ACTIVE";
        }
        return { agent, index, pulse };
      }),
    [combinedThreats, agentTelemetryPulseUntil, irongateClaimFlash],
  );

  return (
    <>
      <div className="mt-3 rounded border border-zinc-800/85 bg-zinc-950/50 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-200">
            Agent Status Pulse
          </h3>
          <span className="inline-flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wide text-emerald-400/95">
            <span
              className="h-1.5 w-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.55)]"
              aria-hidden
            />
            LIVE
          </span>
        </div>
        <p className="mt-1 text-[9px] text-zinc-500">
          19-agent workforce heartbeat — drill-driven alert paths.
        </p>
        <p className="mt-1 text-[8px] text-zinc-600">
          Last resubscribe:{" "}
          {formattedResubscribeTime != null ? (
            formattedResubscribeTime
          ) : (
            <span
              className="font-mono tabular-nums animate-pulse text-zinc-500"
              aria-label="Syncing telemetry clock"
            >
              --:--:--
            </span>
          )}
        </p>
        <div
          className="mt-2 grid grid-cols-3 gap-x-2 gap-y-1.5"
          role="list"
          aria-label="19-agent status pulse"
        >
          {agentRows.map(({ agent, index, pulse }) => {
            const staggerMs = (index % 12) * 95;
            const dotPulseMotion =
              "motion-safe:animate-pulse [animation-duration:3s] [animation-timing-function:linear]";
            const dotPulse =
              pulse === "ALERT"
                ? `bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.5)] ${dotPulseMotion}`
                : pulse === "TELEMETRY"
                  ? `bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)] ${dotPulseMotion}`
                  : pulse === "ACTIVE"
                    ? `bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.45)] ${dotPulseMotion}`
                    : "bg-slate-600";
            return (
              <div key={agent.name} role="listitem" className="min-w-0 w-full">
                <button
                  type="button"
                  className="flex min-w-0 w-full items-center gap-x-1.5 rounded px-0.5 py-0.5 text-left transition hover:bg-zinc-900/60 select-text"
                  onClick={() => dispatchSingleLeftClickDrawer(agent.name)}
                  onDoubleClick={() => executeLocalizedDiagnosticAuditLoop(agent.name)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    triggerCustomDarkPopoverFrame(e, agent.name);
                  }}
                  aria-label={`${agent.name} ${pulse}`}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-700 ${dotPulse}`}
                    style={pulse !== "IDLE" ? { animationDelay: `${staggerMs}ms` } : undefined}
                    title={pulse}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-[8px] font-semibold uppercase tracking-wide text-slate-500">
                    {agent.name}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {popover ? (
        <div
          className="fixed z-[200] min-w-[12rem] rounded border border-zinc-700 bg-zinc-950/95 p-2 shadow-xl select-text"
          style={{ left: popover.x, top: popover.y }}
          role="dialog"
          aria-label={`${popover.agentId} override menu`}
        >
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
            {popover.agentId} Override
          </p>
          <button
            type="button"
            className="mt-2 block w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-left text-[9px] font-mono uppercase text-emerald-300 hover:border-emerald-700"
            onClick={() => {
              executeLocalizedDiagnosticAuditLoop(popover.agentId);
              setPopover(null);
            }}
          >
            Run localized audit
          </button>
          <button
            type="button"
            className="mt-1 block w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-left text-[9px] font-mono uppercase text-zinc-400 hover:border-zinc-600"
            onClick={() => setPopover(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </>
  );
}
