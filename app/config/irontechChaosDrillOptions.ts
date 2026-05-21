import type { ChaosScenario } from "@/app/actions/chaosActions";

/** Irontech Chaos Levels 1–5 — maps to `ChaosScenario` + `chaosScenarioToInternalDrillLevel`. */
export const IRONTECH_CHAOS_LEVEL_DRILLS: readonly {
  level: number;
  scenario: ChaosScenario;
  label: string;
}[] = [
  {
    level: 1,
    scenario: "INTERNAL",
    label: "1 — Irontech Chaos L1 · Internal (Quick Fix)",
  },
  {
    level: 2,
    scenario: "HOME_SERVER",
    label: "2 — Irontech Chaos L2 · Home Server (Remote Struggle)",
  },
  {
    level: 3,
    scenario: "CLOUD_EXFIL",
    label: "3 — Irontech Chaos L3 · Cloud Exfiltration (Quarantine)",
  },
  {
    level: 4,
    scenario: "REMOTE_SUPPORT",
    label: "4 — Irontech Chaos L4 · Remote Support (Human Handoff)",
  },
  {
    level: 5,
    scenario: "CASCADING_FAILURE",
    label: "5 — Irontech Chaos L5 · Cascading Failure (Doomsday)",
  },
] as const;

export const IRONTECH_CHAOS_LEVEL_SCENARIO_IDS = new Set(
  IRONTECH_CHAOS_LEVEL_DRILLS.map((d) => d.scenario),
);

export function isIrontechChaosLevelScenario(
  scenario: string,
): scenario is (typeof IRONTECH_CHAOS_LEVEL_DRILLS)[number]["scenario"] {
  return IRONTECH_CHAOS_LEVEL_SCENARIO_IDS.has(scenario as ChaosScenario);
}
