/**
 * TAS Section 3 — Irontally Framework Mapping (Agent 19 Core Directive)
 * Epic 16 / Epic 8 — Continuous Auditor-Ready Evidence Compiler
 *
 * Maps tenant-scoped AuditLog telemetry to formal controls in
 * `IRONTALLY_FRAMEWORK_CONTROL_MAPPINGS` (not ad-hoc CC6.x stubs).
 */
import { createHash } from "crypto";

import {
  getFrameworkControlMappings,
  type IrontallyFrameworkId,
  type TasFrameworkControlMapping,
} from "@/app/config/irontallyFrameworkControls";
import prisma from "@/lib/prisma";

export type FrameworkReadinessLabel = "SOC2" | "ISO27001" | "CSRD";

export type VerifiedEvidenceLog = {
  controlId: string;
  agentSignature: string;
  timestamp: string;
  physicalContext: string;
};

export type FrameworkReadinessSummary = {
  framework: FrameworkReadinessLabel;
  frameworkId: IrontallyFrameworkId;
  totalControlsMonitored: number;
  passingControlsCount: number;
  verifiedEvidenceLogs: VerifiedEvidenceLog[];
};

const READINESS_FRAMEWORKS: Array<{
  frameworkId: IrontallyFrameworkId;
  framework: FrameworkReadinessLabel;
}> = [
  { frameworkId: "soc2_type2", framework: "SOC2" },
  { frameworkId: "iso_27001", framework: "ISO27001" },
  { frameworkId: "csrd_esrs", framework: "CSRD" },
];

/** Audit actions that may attest TAS directive satisfaction (production ledger only). */
export const IRONTALLY_EVIDENCE_AUDIT_ACTIONS = [
  "ORCHESTRATION_BUS_CYCLE_SUCCESS",
  "AUTONOMOUS_STATE_FREEZE_TRIGGERED",
  "IRONTALLY_SHADOW_MODE",
  "IRONTALLY_SIMULATED_AUDIT",
  "IRONTECH_POST_MORTEM",
  "IRONTECH_RECOVERY_ARCHIVE",
  "IRONSCRIBE_POST_MORTEM_STALE_DATA_OUTAGE",
  "SUSTAINABILITY_GRIDCORE_POLL_EXECUTED",
  "SUSTAINABILITY_STALE_LOCKDOWN_WAIVER",
  "CARBON_MITIGATION_EVENT",
  "IRONSIGHT_REGULATORY_POLL",
] as const;

type EvidenceAuditAction = (typeof IRONTALLY_EVIDENCE_AUDIT_ACTIONS)[number];

/** Maps ingest/orchestration bus and GRC audit actions to constitutional directive ids. */
const ACTION_DIRECTIVE_HINTS: Record<EvidenceAuditAction, readonly string[]> = {
  ORCHESTRATION_BUS_CYCLE_SUCCESS: [
    "irongate",
    "ironlock",
    "ironquery",
    "ironscribe",
    "ironsight",
    "irontally",
    "ironcore_router",
  ],
  AUTONOMOUS_STATE_FREEZE_TRIGGERED: ["ironlock"],
  IRONTALLY_SHADOW_MODE: ["irontally"],
  IRONTALLY_SIMULATED_AUDIT: ["irontally"],
  IRONTECH_POST_MORTEM: ["irontech"],
  IRONTECH_RECOVERY_ARCHIVE: ["irontech"],
  IRONSCRIBE_POST_MORTEM_STALE_DATA_OUTAGE: ["ironscribe"],
  SUSTAINABILITY_GRIDCORE_POLL_EXECUTED: ["ironscribe", "irontally"],
  SUSTAINABILITY_STALE_LOCKDOWN_WAIVER: ["ironscribe", "irontech"],
  CARBON_MITIGATION_EVENT: ["ironscribe", "irontally"],
  IRONSIGHT_REGULATORY_POLL: ["ironsight", "irontally"],
};

const JUSTIFICATION_DIRECTIVE_PATTERNS: Array<{ directiveId: string; pattern: RegExp }> = [
  { directiveId: "ironquery", pattern: /ironquery|fingerprint/i },
  { directiveId: "irongate", pattern: /irongate|dmz|ingress/i },
  { directiveId: "ironlock", pattern: /ironlock|freeze|quarantine/i },
  { directiveId: "ironscribe", pattern: /ironscribe|carbon|sustainability|gridcore/i },
  { directiveId: "ironsight", pattern: /ironsight|regulatory/i },
  { directiveId: "irontech", pattern: /irontech|post-mortem|phoenix|lkg/i },
  { directiveId: "irontrust", pattern: /irontrust|ale|bigint/i },
  { directiveId: "bigint_ledger", pattern: /bigint|ledger|sha-256|fingerprint/i },
  { directiveId: "rls", pattern: /rls|tenant isolation|tenant_id/i },
];

type AuditLogRow = {
  id: string;
  action: string;
  threatId: string | null;
  justification: string | null;
  createdAt: Date;
};

export function inferDirectivesFromAuditLog(log: Pick<AuditLogRow, "action" | "justification">): Set<string> {
  const directives = new Set<string>();
  const hints = ACTION_DIRECTIVE_HINTS[log.action as EvidenceAuditAction];
  if (hints) {
    for (const d of hints) directives.add(d);
  }
  const corpus = log.justification ?? "";
  for (const { directiveId, pattern } of JUSTIFICATION_DIRECTIVE_PATTERNS) {
    if (pattern.test(corpus)) directives.add(directiveId);
  }
  return directives;
}

export function auditLogSatisfiesDirective(
  log: Pick<AuditLogRow, "action" | "justification">,
  directiveId: string,
): boolean {
  return inferDirectivesFromAuditLog(log).has(directiveId);
}

function extractAgentSignature(log: AuditLogRow): string {
  const fp = log.justification?.match(/Ironquery fingerprint:\s*([^\s.]+)/i)?.[1];
  if (fp && fp !== "n/a") return fp;
  if (log.threatId) return log.threatId;
  return `sha256-${createHash("sha256").update(`${log.id}:${log.action}`).digest("hex").slice(0, 16)}`;
}

function buildPhysicalContext(control: TasFrameworkControlMapping, log: AuditLogRow): string {
  const tail = log.justification?.trim();
  const attestation = tail
    ? `Ledger attestation (${log.action}): ${tail.slice(0, 240)}`
    : `Ledger attestation (${log.action}) at ${log.createdAt.toISOString()}.`;
  return `${control.satisfaction} ${attestation}`;
}

export function compileFrameworkFromLogs(
  frameworkId: IrontallyFrameworkId,
  label: FrameworkReadinessLabel,
  logs: AuditLogRow[],
): FrameworkReadinessSummary {
  const controls = getFrameworkControlMappings(frameworkId);
  const verifiedEvidenceLogs: VerifiedEvidenceLog[] = [];

  for (const control of controls) {
    const match = logs.find((log) => auditLogSatisfiesDirective(log, control.directiveId));
    if (!match) continue;
    verifiedEvidenceLogs.push({
      controlId: `${control.controlId} — ${control.controlTitle}`,
      agentSignature: extractAgentSignature(match),
      timestamp: match.createdAt.toISOString(),
      physicalContext: buildPhysicalContext(control, match),
    });
  }

  return {
    framework: label,
    frameworkId,
    totalControlsMonitored: controls.length,
    passingControlsCount: verifiedEvidenceLogs.length,
    verifiedEvidenceLogs,
  };
}

/**
 * Compiles real ledger telemetry and maps rows to formal compliance controls.
 */
export async function compileFrameworkReadiness(tenantId: string): Promise<FrameworkReadinessSummary[]> {
  const activeLogs = await prisma.auditLog.findMany({
    where: {
      tenantId,
      isSimulation: false,
      action: { in: [...IRONTALLY_EVIDENCE_AUDIT_ACTIONS] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      action: true,
      threatId: true,
      justification: true,
      createdAt: true,
    },
  });

  return READINESS_FRAMEWORKS.map(({ frameworkId, framework }) =>
    compileFrameworkFromLogs(frameworkId, framework, activeLogs),
  );
}
