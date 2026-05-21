"use client";

import { useRiskStore } from "@/app/store/riskStore";
import { useAgentStore } from "@/app/store/agentStore";
import { useKimbotStore } from "@/app/store/kimbotStore";
import { useGrcBotStore } from "@/app/store/grcBotStore";
import { useAdversarySimulatorStore } from "@/app/store/adversarySimulatorStore";
import { useBoardReadinessStatusStore } from "@/app/store/boardReadinessStatusStore";
import { useAgenticComputeStore } from "@/app/store/agenticComputeStore";
import { useComplianceOverlayStore } from "@/app/store/complianceOverlayStore";
import { useScenarioStore } from "@/app/store/scenarioStore";
import { useRiskRegistryStore } from "@/app/store/riskRegistryStore";

/**
 * Cold-boot: wipe tenant-derived client RAM across Zustand surfaces (Command Center + Dev switcher).
 * Call **before** applying a new tenant context.
 * Local forensic audit buffer is **not** cleared here — use Audit Intelligence → Master Purge only.
 */
export function resetAllStores(): void {
  useRiskRegistryStore.getState().clear();
  useRiskStore.getState().clearAllRiskStateForPurge();
  useRiskStore.getState().setSelectedTenantName(null);

  useAgentStore.getState().resetAgentStreamsForPurge();

  useKimbotStore.setState({
    enabled: false,
    injectedSignals: [],
    totalSignalsGenerated: 0,
  });

  useGrcBotStore.getState().stop();
  useGrcBotStore.setState({ enabled: false });

  useAdversarySimulatorStore.getState().reset();

  useBoardReadinessStatusStore.getState().reset();

  useAgenticComputeStore.getState().clear();

  useComplianceOverlayStore.getState().clearGrAuditHistoryForPurge();

  useScenarioStore.getState().setActiveScenario(null);
}
