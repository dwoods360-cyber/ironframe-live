"use client";

import {
  LAYOUT_AGENT_INSPECT_DRAWER_TOP_CLASS,
  LAYOUT_AGENT_INSPECT_DRAWER_WIDTH_CLASS,
  LAYOUT_AGENT_INSPECT_PANEL_Z_CLASS,
  LAYOUT_DRAWER_BACKDROP_Z_CLASS,
} from "@/app/config/layoutConstants";
import type { GovernanceMaturitySnapshot } from "@/app/types/governanceMaturity";
import GrcMaturityStrip from "@/app/components/GrcMaturityStrip";
import SustainabilityAnalyticsPlane from "@/app/components/SustainabilityAnalyticsPlane";
import { CORE_WORKFORCE_AGENTS } from "@/app/config/agents";
import {
  getExpertAssigneeDisplay,
  getExpertJustification,
  getExpertTitle,
} from "@/app/config/expertAgentPersona";
import type { AgentWorkforceRuntimeSnapshot } from "@/app/store/agentStore";
import type { LocalizedAuditResult } from "@/app/utils/workforceAgentPillPipeline";

type AgentInspectSlideOutPanelProps = {
  agentId: string;
  runtime: AgentWorkforceRuntimeSnapshot;
  audit: LocalizedAuditResult | null;
  open: boolean;
  governanceMaturity?: GovernanceMaturitySnapshot | null;
  onClose: () => void;
};

/** Right-hand inspect rail — translate-x slide from viewport edge (portaled). */
export default function AgentInspectSlideOutPanel({
  agentId,
  runtime,
  audit,
  open,
  governanceMaturity = null,
  onClose,
}: AgentInspectSlideOutPanelProps) {
  const roster = CORE_WORKFORCE_AGENTS.find((a) => a.name === agentId);
  const title = getExpertTitle(agentId);
  const assignee = getExpertAssigneeDisplay(agentId);
  const behaviorNarrative = getExpertJustification(agentId, "WORKFORCE_MONITOR");

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close agent inspect panel"
          className={`fixed inset-0 ${LAYOUT_DRAWER_BACKDROP_Z_CLASS} bg-black/45 backdrop-blur-[1px]`}
          onClick={onClose}
        />
      ) : null}
      <aside
        className={`fixed right-0 bottom-0 ${LAYOUT_AGENT_INSPECT_DRAWER_TOP_CLASS} ${LAYOUT_AGENT_INSPECT_DRAWER_WIDTH_CLASS} flex transform flex-col border-l border-zinc-700 bg-zinc-950 shadow-[-12px_0_40px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-out will-change-transform ${LAYOUT_AGENT_INSPECT_PANEL_Z_CLASS} ${
          open ? "translate-x-0 pointer-events-auto" : "translate-x-full pointer-events-none"
        }`}
        role="complementary"
        aria-hidden={!open}
        aria-label={`${agentId} agent inspect panel`}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-sky-300">
              {agentId} — Inspect Rail
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
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-4 text-[10px] leading-relaxed text-zinc-300">
          {audit ? (
            <section
              className={`rounded border p-2.5 ${
                audit.pass
                  ? "border-emerald-800/80 bg-emerald-950/25"
                  : "border-red-800/80 bg-red-950/25"
              }`}
            >
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                Localized audit
              </p>
              <p
                className={`mt-1 text-sm font-black uppercase ${
                  audit.pass ? "text-emerald-300" : "text-red-300"
                }`}
              >
                {audit.inlineLabel}
              </p>
              <p className="mt-2 font-mono text-[9px] leading-relaxed text-zinc-300">
                {audit.streamMessage}
              </p>
            </section>
          ) : null}
          <section className="rounded border border-zinc-800/90 bg-zinc-900/40 p-2.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Operational title</p>
            <p className="mt-1 font-semibold text-zinc-100">{title}</p>
            <ul className="mt-2 space-y-1 font-mono text-[8px] uppercase text-zinc-400">
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
              {roster ? (
                <li>
                  Data source: <span className="text-zinc-400">{roster.dataSource}</span>
                </li>
              ) : null}
            </ul>
            <p className="mt-2 text-[9px] leading-relaxed text-zinc-300">{behaviorNarrative}</p>
          </section>
          <GrcMaturityStrip maturity={governanceMaturity} />
          <SustainabilityAnalyticsPlane />
        </div>
      </aside>
    </>
  );
}
