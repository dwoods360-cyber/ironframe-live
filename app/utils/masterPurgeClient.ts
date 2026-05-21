"use client";

import { useAgentStore } from "@/app/store/agentStore";
import { useRiskRegistryStore } from "@/app/store/riskRegistryStore";
import { useRiskStore } from "@/app/store/riskStore";

/** How long board refetches stay forced-empty after Master Purge (blocks realtime/sync races). */
export const MASTER_PURGE_BOARD_FREEZE_MS = 5000;

/**
 * Client RAM reset after successful `purgeSimulation` — empties boards immediately and
 * blocks `refreshActiveThreatsFromDb` from repopulating stale rows for a few seconds.
 */
export function applyMasterPurgeClientReset(): void {
  useRiskRegistryStore.getState().clear();
  useAgentStore.getState().resetAgentStreamsForPurge();
  const risk = useRiskStore.getState();
  risk.clearAllRiskStateForPurge();
  risk.replaceActiveThreats([]);
  risk.replacePipelineThreats([]);
  risk.setPurgeBoardFreezeUntil(Date.now() + MASTER_PURGE_BOARD_FREEZE_MS);
}
