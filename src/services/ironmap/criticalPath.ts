/**
 * Agent 9 (Ironmap) — critical-path segmentation for supply-chain decoupling.
 * Splits workloads so regulatory/framework lanes can stay ACTIVE when live carbon feeds are DOWN.
 */

export type ElectricityMapsStatus = "UP" | "DOWN";

/** Logical sub-tasks for GRC / sustainability orchestration (names stable for audits). */
export type CriticalPathSubTask = "Sustainability_Mapping" | "Regulatory_Framework_Mapping";

export type CriticalPathLaneState = "WAIT" | "ACTIVE";

/**
 * When Electricity Maps is DOWN, **Sustainability_Mapping** (CSRD / environmental / physical units)
 * must WAIT; **Regulatory_Framework_Mapping** (e.g. SOC2 control mapping) may remain ACTIVE.
 */
export function resolveTaskLanes(electricityMaps: ElectricityMapsStatus): Record<
  CriticalPathSubTask,
  CriticalPathLaneState
> {
  if (electricityMaps === "DOWN") {
    return {
      Sustainability_Mapping: "WAIT",
      Regulatory_Framework_Mapping: "ACTIVE",
    };
  }
  return {
    Sustainability_Mapping: "ACTIVE",
    Regulatory_Framework_Mapping: "ACTIVE",
  };
}

/** Map Ironwatch “live API degraded” flag → Electricity Maps lane status. */
export function electricityMapsStatusFromDegradedFlag(liveApiDegraded: boolean): ElectricityMapsStatus {
  return liveApiDegraded ? "DOWN" : "UP";
}

export type WorkloadDependencyClass = "DEPENDENT" | "INDEPENDENT";

export function classifySubTaskDependency(sub: CriticalPathSubTask): WorkloadDependencyClass {
  if (sub === "Sustainability_Mapping") return "DEPENDENT";
  return "INDEPENDENT";
}
