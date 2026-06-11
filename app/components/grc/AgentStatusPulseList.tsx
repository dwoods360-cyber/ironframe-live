"use client";

import type { ReactNode } from "react";
import { useCallback, useMemo } from "react";
import { CORE_WORKFORCE_AGENTS } from "@/app/config/agents";
import { WORKFORCE_PULSE_GRID_CLASS } from "@/app/config/layoutConstants";
import { useAgentStore } from "@/app/store/agentStore";
import type { AgentPillAnchorRect } from "@/app/store/agentStore";
import type { PipelineThreat } from "@/app/store/riskStore";
import {
  mergeInventoryAgentWithPulse,
  type AgentPulseState,
} from "@/app/utils/workforceAgentState";
import type { AgentWorkforceRuntimeSnapshot } from "@/app/store/agentStore";
import WorkforceAgentPill from "@/app/components/grc/WorkforceAgentPill";
import { LeftPanelFeatureTitle } from "@/app/components/leftPanel/LeftPanelFeatureIndex";
import { LP_FEATURE } from "@/app/config/leftPanelFeatureIndex";
import { safeAgentInspectEmission } from "@/app/utils/safeRuntimeEmission";

type AgentStatusPulseListProps = {
  combinedThreats: PipelineThreat[];
  agentTelemetryPulseUntil: Record<string, number>;
  irongateClaimFlash: boolean;
  formattedResubscribeTime: string | null;
  headerActions?: ReactNode;
};

function buildRuntimeSnapshot(
  pulse: AgentPulseState,
  checkpointFrozen: boolean,
  agentName: string,
  agentTelemetryPulseUntil: Record<string, number>,
): AgentWorkforceRuntimeSnapshot {
  return {
    pulse,
    checkpointFrozen,
    telemetryActive: (agentTelemetryPulseUntil[agentName] ?? 0) > Date.now(),
  };
}

export default function AgentStatusPulseList({
  combinedThreats,
  agentTelemetryPulseUntil,
  irongateClaimFlash,
  formattedResubscribeTime,
  headerActions,
}: AgentStatusPulseListProps) {
  const agentCheckpointFrozenUntil = useAgentStore((s) => s.agentCheckpointFrozenUntil);
  const dispatchAgentInspect = useAgentStore((s) => s.dispatchAgentInspect);
  const openAgentPillPopover = useAgentStore((s) => s.openAgentPillPopover);

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
        const checkpointFrozen =
          (agentCheckpointFrozenUntil[agent.name] ?? 0) > Date.now();
        const runtime = buildRuntimeSnapshot(
          pulse,
          checkpointFrozen,
          agent.name,
          agentTelemetryPulseUntil,
        );
        return { agent, index, pulse, checkpointFrozen, runtime };
      }),
    [combinedThreats, agentTelemetryPulseUntil, irongateClaimFlash, agentCheckpointFrozenUntil],
  );

  const runtimeByAgentId = useMemo(() => {
    const map = new Map<string, AgentWorkforceRuntimeSnapshot>();
    for (const row of agentRows) {
      map.set(row.agent.name, row.runtime);
    }
    return map;
  }, [agentRows]);

  const openPopover = useCallback(
    (mode: "telemetry" | "behavior", agentId: string, anchorRect: AgentPillAnchorRect) => {
      const runtime = runtimeByAgentId.get(agentId);
      if (!runtime) return;
      openAgentPillPopover({ mode, agentId, anchorRect, runtime });
    },
    [openAgentPillPopover, runtimeByAgentId],
  );

  const handleAgentTelemetryPopover = useCallback(
    (agentId: string, anchorRect: AgentPillAnchorRect) => {
      openPopover("telemetry", agentId, anchorRect);
    },
    [openPopover],
  );

  const handleAgentBehaviorPopover = useCallback(
    (agentId: string, anchorRect: AgentPillAnchorRect) => {
      openPopover("behavior", agentId, anchorRect);
    },
    [openPopover],
  );

  const handleAgentAuditInspect = useCallback(
    (agentId: string) => {
      const runtime = runtimeByAgentId.get(agentId);
      if (!runtime) return;
      safeAgentInspectEmission(() =>
        dispatchAgentInspect({
          agentId,
          runtime,
        }),
      );
    },
    [dispatchAgentInspect, runtimeByAgentId],
  );

  return (
    <div className="mt-3 border-b border-slate-800 bg-[#080f1a] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <LeftPanelFeatureTitle
          index={LP_FEATURE.AGENT_STATUS_PULSE}
          as="h3"
          className="text-xs font-semibold uppercase tracking-wider text-slate-400"
        >
          Agent Status Pulse
        </LeftPanelFeatureTitle>
        <div className="flex shrink-0 items-center gap-2">
          {headerActions}
          <span className="inline-flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wide text-emerald-400/95">
            <span
              className="h-1.5 w-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.55)]"
              aria-hidden
            />
            LIVE
          </span>
        </div>
      </div>
      <p className="mb-1 text-[7px] text-zinc-600">
        <LeftPanelFeatureTitle index={LP_FEATURE.PULSE_GESTURES} className="text-zinc-600">
          Pulse gestures
        </LeftPanelFeatureTitle>
        {" "}
        · click overlay · dbl-click flush · right-click log inspector
      </p>
      <p className="mb-3 text-[8px] text-zinc-600">
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

      <div className={WORKFORCE_PULSE_GRID_CLASS} role="list" aria-label="19-agent status pulse">
        {agentRows.map(({ agent, index, pulse, checkpointFrozen }) => (
          <WorkforceAgentPill
            key={agent.name}
            agentId={agent.name}
            pulse={pulse}
            staggerMs={(index % 12) * 95}
            checkpointFrozen={checkpointFrozen}
            onAgentTelemetryPopover={handleAgentTelemetryPopover}
            onAgentAuditInspect={handleAgentAuditInspect}
            onAgentBehaviorPopover={handleAgentBehaviorPopover}
          />
        ))}
      </div>
    </div>
  );
}
