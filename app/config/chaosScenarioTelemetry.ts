import type { Prisma } from "@prisma/client";
import { parseIngestionDetailsForMerge } from "@/app/utils/ingestionDetailsMerge";
import {
  CHAOS_ASSIGNEE_IRONGATE_14,
  CHAOS_ASSIGNEE_IRONSCRIBE_5,
  CHAOS_ASSIGNEE_IRONTECH_04,
  CHAOS_ASSIGNEE_SYSTEM,
  CHAOS_CONSTITUTIONAL_AUTHORITY_ID,
  CHAOS_DIRECTIVE,
  CHAOS_SHADOW_AUDIT_BIRTH,
} from "@/app/config/chaosShadowAudit";

/** Mirrors `ChaosDrillTelemetryPhase` in `chaosActions` — local so client bundles never import server actions. */
export type ChaosTelemetryPhase =
  | "T0_DMZ_IRONGATE"
  | "T2_REGISTRATION_IRONSCRIBE"
  | "T4_REMEDIATION_IRONTECH"
  | "T12_RESOLUTION_SYSTEM";

/** Mirrors `ChaosScenario` in `chaosActions`. */
export type ChaosTelemetryScenario =
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

/** One persisted telemetry beat (Irongate → Ironscribe → Irontech → SYSTEM @ T12). */
export type ChaosShadowDrillStageDef = {
  terminalLine: string;
  terminalTone: "amber" | "white";
  phase: ChaosTelemetryPhase;
  assigneeId: string;
  assigneeLabel: string;
  directiveId: string;
  flightStatusLine: string;
  recordObserverConcurrenceVerified?: boolean;
};

/**
 * Verbatim stream / patch strings from `runIsolated*` in `app/utils/irontechResilience.ts`
 * (5697029 lineage; no copy editing). T0 is always Irongate DMZ ingress.
 */
function workforceChainAfterIngestion(remediationLine: string, remediationTone: "amber" | "white" = "white"): ChaosShadowDrillStageDef[] {
  return [
    {
      terminalLine: "[IRONSCRIBE] Registration complete. Policy mapping sealed to tenant ledger.",
      terminalTone: "amber",
      phase: "T2_REGISTRATION_IRONSCRIBE",
      assigneeId: CHAOS_ASSIGNEE_IRONSCRIBE_5,
      assigneeLabel: "Ironscribe (Agent 5) · Registration & Policy Mapping",
      directiveId: CHAOS_DIRECTIVE.T2_IRONSCRIBE_REGISTER,
      flightStatusLine: "> T+4s · Ironscribe (5) · registration & policy mapping…",
    },
    {
      terminalLine: remediationLine,
      terminalTone: remediationTone,
      phase: "T4_REMEDIATION_IRONTECH",
      assigneeId: CHAOS_ASSIGNEE_IRONTECH_04,
      assigneeLabel: "Irontech (Agent 04) · Active Remediation",
      directiveId: CHAOS_DIRECTIVE.T4_ANALYSIS,
      flightStatusLine: "> T+8s · Irontech (04) · active remediation…",
    },
    {
      terminalLine:
        "[SYSTEM] [IRONTECH AUTONOMOUS RECOVERY] - System integrity verified and restored via automated patch. No human intervention required.",
      terminalTone: "amber",
      phase: "T12_RESOLUTION_SYSTEM",
      assigneeId: CHAOS_ASSIGNEE_SYSTEM,
      assigneeLabel: "System/Observer · Final Concurrence & Purge",
      directiveId: CHAOS_DIRECTIVE.T12_SYSTEM_CONCLUSION,
      flightStatusLine: "> T+12s · System/Observer · final concurrence & purge…",
      recordObserverConcurrenceVerified: true,
    },
  ];
}

export function getChaosShadowDrillStages(scenario: ChaosTelemetryScenario): ChaosShadowDrillStageDef[] {
  const ingestion: ChaosShadowDrillStageDef = {
    terminalLine: CHAOS_SHADOW_AUDIT_BIRTH,
    terminalTone: "amber",
    phase: "T0_DMZ_IRONGATE",
    assigneeId: CHAOS_ASSIGNEE_IRONGATE_14,
    assigneeLabel: "Irongate (Agent 14) · Sensing & Sanitization",
    directiveId: CHAOS_DIRECTIVE.T0_DMZ_SANITIZE,
    flightStatusLine: "> T0 · Irongate (14) · sensing & sanitization…",
  };

  if (
    scenario === "INTERNAL" ||
    scenario === "INFIL_CRED_STUFFING" ||
    scenario === "INFIL_LATERAL_PIVOT" ||
    scenario === "PHISH_CEO_FRAUD" ||
    scenario === "PHISH_IT_HELPDESK"
  ) {
    return [
      ingestion,
      ...workforceChainAfterIngestion("[IRONTECH] Attempt 1/1 — COMPLETED (autonomous quick fix)"),
    ];
  }

  if (scenario === "HOME_SERVER") {
    return [
      ingestion,
      ...workforceChainAfterIngestion("[IRONTECH] Attempt 3/3 — COMPLETED (home server path)"),
    ];
  }

  if (scenario === "CLOUD_EXFIL") {
    return [
      ingestion,
      ...workforceChainAfterIngestion("[IRONLOCK] Stage 3/3 — HARD QUARANTINE COMPLETE"),
    ];
  }

  if (scenario === "REMOTE_SUPPORT") {
    return [
      ingestion,
      ...workforceChainAfterIngestion(
        "[IRONFRAME] Stage 4/4 — Human engineer connected via Sidecar. Hotfix applied; forensic probe purged.",
      ),
    ];
  }

  /* CASCADING_FAILURE — terminal-only; no app / LKG process reboot. */
  return [
    ingestion,
    ...workforceChainAfterIngestion(
      "[IRONTECH] Stage 4/4 — LKG rebirth ACK — workforce signature matches gold images",
    ),
  ];
}

/** Appended on successful GRC acknowledge so the handoff chain closes in Prisma JSON. */
export function buildChaosFinalAckIngestionPatch(
  prevIngestionDetails: string | Prisma.JsonValue | null,
): Record<string, Prisma.InputJsonValue> | null {
  const base = parseIngestionDetailsForMerge(prevIngestionDetails);
  if (base.isChaosTest !== true) {
    return null;
  }

  const at = new Date().toISOString();

  const prevHand = base.chaosAssigneeHandoffHistory;
  const handArr: Array<{
    at: string;
    phase: string;
    assigneeId: string;
    assigneeLabel: string;
    directiveId: string;
  }> = Array.isArray(prevHand)
    ? (prevHand as Array<{
        at: string;
        phase: string;
        assigneeId: string;
        assigneeLabel: string;
        directiveId: string;
      }>)
    : [];

  if (handArr.some((h) => h.phase === "FINAL_GRC_ACKNOWLEDGEMENT")) {
    return {};
  }

  const prevLog = base.chaosShadowAuditLog;
  const auditArr: Array<{ at: string; line: string; tone?: string }> = Array.isArray(prevLog)
    ? (prevLog as Array<{ at: string; line: string; tone?: string }>)
    : [];

  const finalLine =
    "[SYSTEM] GRC acknowledgement persisted — threat promoted to Active Risks (operator concurrence).";
  const handoffEntry = {
    at,
    phase: "FINAL_GRC_ACKNOWLEDGEMENT",
    assigneeId: CHAOS_CONSTITUTIONAL_AUTHORITY_ID,
    assigneeLabel: "User_00 — Constitutional Authority",
    directiveId: CHAOS_DIRECTIVE.FINAL_GRC_ACK,
  };

  return {
    chaosShadowAuditLog: [...auditArr, { at, line: finalLine, tone: "amber" }] as unknown as Prisma.InputJsonValue,
    chaosAssigneeHandoffHistory: [...handArr, handoffEntry] as unknown as Prisma.InputJsonValue,
    chaosGrcAckPersistedAt: at as unknown as Prisma.InputJsonValue,
  };
}
