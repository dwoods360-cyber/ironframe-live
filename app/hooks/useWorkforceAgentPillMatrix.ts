"use client";

import { useCallback, useRef } from "react";
import { useAgentStore } from "@/app/store/agentStore";
import {
  buildCheckpointFreezeMessage,
  runLocalizedDiagnosticAudit,
} from "@/app/utils/workforceAgentPillPipeline";

/** @deprecated Use `AgentInspectPayload` from `agentStore`. */
export type AgentOverrideAnchor = {
  agentId: string;
  x: number;
  y: number;
};

export function useWorkforceAgentPillMatrix() {
  const addStreamMessage = useAgentStore((s) => s.addStreamMessage);
  const freezeAgentCheckpointSync = useAgentStore((s) => s.freezeAgentCheckpointSync);

  const executeLocalizedDiagnosticAudit = useCallback(
    (agentId: string) => runLocalizedDiagnosticAudit(agentId, addStreamMessage),
    [addStreamMessage],
  );

  const triggerIndividualStateFreezeAndCheckpointSync = useCallback(
    (agentId: string) => {
      freezeAgentCheckpointSync(agentId);
      addStreamMessage(buildCheckpointFreezeMessage(agentId));
    },
    [addStreamMessage, freezeAgentCheckpointSync],
  );

  return {
    executeLocalizedDiagnosticAudit,
    triggerIndividualStateFreezeAndCheckpointSync,
  };
}

/** Debounced click matrix — single click waits so double-click does not fire audit. */
export const WORKFORCE_PILL_SINGLE_CLICK_GATE_MS = 220;

export function useDebouncedAgentPillClicks(
  agentId: string,
  onSingleClick: (agentId: string) => void,
  onDoubleClick: (agentId: string) => void,
) {
  const singleClickTimerRef = useRef<number | null>(null);

  const handleClick = useCallback(() => {
    if (singleClickTimerRef.current != null) {
      window.clearTimeout(singleClickTimerRef.current);
    }
    singleClickTimerRef.current = window.setTimeout(() => {
      singleClickTimerRef.current = null;
      onSingleClick(agentId);
    }, WORKFORCE_PILL_SINGLE_CLICK_GATE_MS);
  }, [agentId, onSingleClick]);

  const handleDoubleClick = useCallback(() => {
    if (singleClickTimerRef.current != null) {
      window.clearTimeout(singleClickTimerRef.current);
      singleClickTimerRef.current = null;
    }
    onDoubleClick(agentId);
  }, [agentId, onDoubleClick]);

  return { handleClick, handleDoubleClick };
}
