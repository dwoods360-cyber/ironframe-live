/**
 * TAS.md compliance anchors for Irontech chaos post-mortem (line refs = docs/TAS.md).
 */

export type TasComplianceDirective = {
  id: string;
  tasLineRef: number;
  tasSection: string;
  requirement: string;
  /** Metric key resolved by post-mortem engine. */
  metric: "containmentMs" | "isolationBleedCount" | "lwtJustificationMinLen" | "dmsWipeComplete";
  slaMs?: number;
  slaMin?: number;
  slaMaxBleed?: number;
};

export const TAS_CHAOS_COMPLIANCE_DIRECTIVES: readonly TasComplianceDirective[] = [
  {
    id: "DIRECTIVE_4",
    tasLineRef: 119,
    tasSection: "5 — Multi-Tenant Isolation",
    requirement: "Command Center tenant switch must purge client scope before loading next tenant (isolation <1s).",
    metric: "containmentMs",
    slaMs: 1000,
  },
  {
    id: "DIRECTIVE_5_106",
    tasLineRef: 106,
    tasSection: "5 — Multi-Tenant Isolation",
    requirement: "Cross-tenant data retrieval is a terminal failure — zero bleed into bricked workspace.",
    metric: "isolationBleedCount",
    slaMaxBleed: 0,
  },
  {
    id: "DIRECTIVE_5_127",
    tasLineRef: 127,
    tasSection: "5 — Immutable Directives (Gateway)",
    requirement: "x-tenant-id must match ironframe-tenant cookie session (403 on mismatch).",
    metric: "isolationBleedCount",
    slaMaxBleed: 0,
  },
  {
    id: "DIRECTIVE_LOGGING",
    tasLineRef: 10,
    tasSection: "Logging Directive",
    requirement: "Last Will audit trail must carry minimum 50-character forensic justifications.",
    metric: "lwtJustificationMinLen",
    slaMin: 50,
  },
  {
    id: "DIRECTIVE_IRONLOCK",
    tasLineRef: 104,
    tasSection: "5 — Ironlock quarantine",
    requirement: "Functions without tenant_id must be quarantined by Ironlock (Agent 6).",
    metric: "containmentMs",
    slaMs: 1000,
  },
  {
    id: "DIRECTIVE_DMS",
    tasLineRef: 90,
    tasSection: "4.3 — Diagnostics isolation",
    requirement: "Dead Man's Switch must complete tenant scorch with no residual active threat rows.",
    metric: "dmsWipeComplete",
  },
] as const;
