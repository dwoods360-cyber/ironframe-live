/**
 * Authoritative chaos scenario registry (metadata + routing hints).
 * Runtime execution: `injectChaosThreatAction` for threat drills;
 * `triggerConstitutionalCollapseChaos` for constitutional collapse.
 */

export type ChaosRegistryIntensity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ChaosRegistryTarget = "GLOBAL" | "TENANT_SPECIFIC";

export type ChaosRegistryScenarioId =
  | "INTERNAL"
  | "HOME_SERVER"
  | "REMOTE_SUPPORT"
  | "CASCADING_FAILURE"
  | "CLOUD_EXFIL"
  | "INFIL_CRED_STUFFING"
  | "INFIL_LATERAL_PIVOT"
  | "PHISH_CEO_FRAUD"
  | "PHISH_IT_HELPDESK"
  | "CONSTITUTIONAL_COLLAPSE";

export type ChaosRegistryEntry = {
  id: ChaosRegistryScenarioId;
  label: string;
  intensity: ChaosRegistryIntensity;
  target: ChaosRegistryTarget;
  description: string;
  /** When true, use `/api/chaos/trigger` (not threat inject). */
  constitutionalDrill?: boolean;
};

export const CHAOS_REGISTRY: readonly ChaosRegistryEntry[] = [
  {
    id: "INTERNAL",
    label: "Internal Chaos Drill (Quick Fix)",
    intensity: "MEDIUM",
    target: "TENANT_SPECIFIC",
    description: "Isolated internal correction path with Irongate → Irontech shadow telemetry.",
  },
  {
    id: "HOME_SERVER",
    label: "Home Server Drill (Remote Struggle)",
    intensity: "MEDIUM",
    target: "TENANT_SPECIFIC",
    description: "Remote struggle simulation with extended Irontech observation beats.",
  },
  {
    id: "CLOUD_EXFIL",
    label: "Cloud Exfiltration (Internal Quarantine)",
    intensity: "HIGH",
    target: "TENANT_SPECIFIC",
    description: "Escalation drill with internal quarantine posture.",
  },
  {
    id: "REMOTE_SUPPORT",
    label: "Remote Support Drill (Human Handoff)",
    intensity: "MEDIUM",
    target: "TENANT_SPECIFIC",
    description: "Human handoff and remote support lifecycle.",
  },
  {
    id: "CASCADING_FAILURE",
    label: "Cascading Failure (Doomsday Lockdown)",
    intensity: "HIGH",
    target: "TENANT_SPECIFIC",
    description: "Multi-stage cascade with doomsday lockdown semantics.",
  },
  {
    id: "INFIL_CRED_STUFFING",
    label: "Infil: Shadow Credential Stuffing",
    intensity: "HIGH",
    target: "TENANT_SPECIFIC",
    description: "INFILBOT simulation ingress.",
  },
  {
    id: "INFIL_LATERAL_PIVOT",
    label: "Infil: Lateral Pivot Attempt",
    intensity: "HIGH",
    target: "TENANT_SPECIFIC",
    description: "INFILBOT lateral pivot simulation.",
  },
  {
    id: "PHISH_CEO_FRAUD",
    label: "Phish: CEO Fraud (Urgent Wire)",
    intensity: "HIGH",
    target: "TENANT_SPECIFIC",
    description: "PHISHBOT CEO fraud simulation.",
  },
  {
    id: "PHISH_IT_HELPDESK",
    label: "Phish: IT Helpdesk Trap",
    intensity: "HIGH",
    target: "TENANT_SPECIFIC",
    description: "PHISHBOT helpdesk trap simulation.",
  },
  {
    id: "CONSTITUTIONAL_COLLAPSE",
    label: "Constitutional Collapse (TAS Void + DMS)",
    intensity: "CRITICAL",
    target: "TENANT_SPECIFIC",
    description:
      "Simulates loss of TAS.md authority for the active tenant, tenant-scoped Ironlock freeze, " +
      "compressed 240s Dead Man's Switch, [SIMULATION_DATA] Last Will, and Phoenix resurrection drill.",
    constitutionalDrill: true,
  },
] as const;

export function getChaosRegistryEntry(
  id: ChaosRegistryScenarioId,
): ChaosRegistryEntry | undefined {
  return CHAOS_REGISTRY.find((e) => e.id === id);
}

export function isConstitutionalChaosDrill(id: string): boolean {
  return id === "CONSTITUTIONAL_COLLAPSE";
}
