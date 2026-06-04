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

/** TAS-AMEND-2026-004 — L6 cryptographic ransomware mock (client simulation token). */
export const IRONTECH_CHAOS_L6_ACTION_TOKEN = "IRONTECH_CHAOS_L6" as const;

export const IRONTECH_CHAOS_LEVEL_6_DRILL = {
  level: 6,
  actionToken: IRONTECH_CHAOS_L6_ACTION_TOKEN,
  label: "6 — IRONTECH CHAOS L6 · CRYPTOGRAPHIC RANSOMWARE (EXTORTION)",
} as const;

export const IRONTECH_CHAOS_L6_AGENT_LINES = [
  "[Irongate] [AGENT-14] Boundary scan anomaly detected: High-frequency cryptographic lock signature caught.",
  "[Ironwatch] CPU/Disk IO delta spikes out of baseline parameters. Initiating blast-radius threat mapping.",
  "[Ironlock] Priority Interrupt Authority deployed: Execution thread frozen. Containment sandbox active.",
  "[Ironguard] Token rotation enforced. PostgreSQL RLS partitions hardened. Multi-tenant memory isolated.",
  "[Irontrust] Financial whole-integer cents integrity audit complete: 0.00 USD variance detected.",
  "[Ironcast] SYSTEM SECURITY WARNING: RANSOMWARE THREAT CONTAINED // AVAILABILITY PRESERVED.",
] as const;

/** Full L6 lifecycle — matches nominal 8s layout paint window (~5–6 EKG sweeps at 1.4s). */
export const IRONTECH_CHAOS_L6_LIFECYCLE_MS = 8000;

export const IRONTECH_CHAOS_LEVEL_SCENARIO_IDS = new Set(
  IRONTECH_CHAOS_LEVEL_DRILLS.map((d) => d.scenario),
);

export function isIrontechChaosLevelScenario(
  scenario: string,
): scenario is (typeof IRONTECH_CHAOS_LEVEL_DRILLS)[number]["scenario"] {
  return IRONTECH_CHAOS_LEVEL_SCENARIO_IDS.has(scenario as ChaosScenario);
}
