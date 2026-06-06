import { getChaosShadowDrillStages } from "@/app/config/chaosScenarioTelemetry";
import type { ChaosTelemetryScenario } from "@/app/config/chaosScenarioTelemetry";

/** Mirrors `ChaosScenario` in chaosActions — kept local to avoid server/client import cycles. */
export type SimulationChaosScenario =
  | "INTERNAL"
  | "HOME_SERVER"
  | "REMOTE_SUPPORT"
  | "CASCADING_FAILURE"
  | "CLOUD_EXFIL"
  | "INFIL_CRED_STUFFING"
  | "INFIL_LATERAL_PIVOT"
  | "PHISH_CEO_FRAUD"
  | "PHISH_IT_HELPDESK";

export type SimulationInjectOptions = {
  deferRemoteSupportDrill?: boolean;
};

/** Stable read time for auditors before toast fade (matches L6 lifecycle window). */
/** Sticky retention — analyst dismiss only (no auto-hide timer). */
export const SIMULATION_DISPATCH_TOAST_MS = Infinity;

export type SimulationDispatchNoticeDetail = {
  scenarioName: string;
  message: string;
  forensicLine?: string;
};

export const SIMULATION_DISPATCH_NOTICE_EVENT = "ironframe:simulation-dispatch-confirmed";

/**
 * Scenarios neutralized at the perimeter without an Active Risks handoff card.
 * L4 Remote Support and L5 Cascading Failure require operator / tech cards.
 */
export function resolveSimulationCardProduced(
  scenario: SimulationChaosScenario,
  options?: SimulationInjectOptions,
): boolean {
  if (scenario === "REMOTE_SUPPORT" || options?.deferRemoteSupportDrill === true) {
    return true;
  }
  if (scenario === "CASCADING_FAILURE") {
    return true;
  }
  if (
    scenario === "INTERNAL" ||
    scenario === "HOME_SERVER" ||
    scenario === "CLOUD_EXFIL"
  ) {
    return false;
  }
  if (
    scenario === "INFIL_CRED_STUFFING" ||
    scenario === "INFIL_LATERAL_PIVOT" ||
    scenario === "PHISH_CEO_FRAUD" ||
    scenario === "PHISH_IT_HELPDESK"
  ) {
    return true;
  }
  return true;
}

export function resolveSimulationForensicLine(scenario: SimulationChaosScenario): string {
  const stages = getChaosShadowDrillStages(scenario as ChaosTelemetryScenario);
  const last = stages[stages.length - 1];
  return (
    last?.terminalLine?.trim() ||
    "[SYSTEM] Autonomous agents verified perimeter neutralization. No human intervention required."
  );
}

export function buildSimulationDispatchMessage(
  scenarioDisplayName: string,
  forensicLine: string,
): string {
  const name = scenarioDisplayName.trim() || "Chaos drill";
  const line = forensicLine.trim();
  return `ℹ️ SIMULATION DISPATCH CONFIRMED: ${name} executed successfully. Neutralized at perimeter by autonomous agents. No manual card required.${line ? ` ${line}` : ""}`;
}

export function buildSimulationCardRequiredMessage(scenarioDisplayName: string): string {
  const name = scenarioDisplayName.trim() || "Chaos drill";
  return `Simulation row created — Active Risks card required for ${name}.`;
}

/** Client-only — pushes notice to dashboard toast stack. */
export function dispatchSimulationDispatchNotice(detail: SimulationDispatchNoticeDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SIMULATION_DISPATCH_NOTICE_EVENT, { detail }),
  );
}
