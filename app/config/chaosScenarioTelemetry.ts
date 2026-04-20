import type { Prisma } from "@prisma/client";
import { parseIngestionDetailsForMerge } from "@/app/utils/ingestionDetailsMerge";
import {
  CHAOS_ASSIGNEE_IRONGATE_14,
  CHAOS_ASSIGNEE_IRONTECH_11,
  CHAOS_ASSIGNEE_SYSTEM,
  CHAOS_DIRECTIVE,
  CHAOS_SHADOW_AUDIT_BIRTH,
} from "@/app/config/chaosShadowAudit";

/** Mirrors `ChaosDrillTelemetryPhase` in `chaosActions` — local so client bundles never import server actions. */
export type ChaosTelemetryPhase =
  | "T0_DMZ_IRONGATE"
  | "T4_ANALYSIS_IRONTECH"
  | "T8_OBSERVATION_IRONTECH"
  | "T12_RESOLUTION_SYSTEM";

/** Mirrors `ChaosScenario` in `chaosActions`. */
export type ChaosTelemetryScenario =
  | "INTERNAL"
  | "HOME_SERVER"
  | "REMOTE_SUPPORT"
  | "CASCADING_FAILURE"
  | "CLOUD_EXFIL";

/** One persisted telemetry beat (Irongate → Irontech → Irontech → SYSTEM @ T12). */
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
export function getChaosShadowDrillStages(scenario: ChaosTelemetryScenario): ChaosShadowDrillStageDef[] {
  const ingestion: ChaosShadowDrillStageDef = {
    terminalLine: CHAOS_SHADOW_AUDIT_BIRTH,
    terminalTone: "amber",
    phase: "T0_DMZ_IRONGATE",
    assigneeId: CHAOS_ASSIGNEE_IRONGATE_14,
    assigneeLabel: "Irongate (Agent 14)",
    directiveId: CHAOS_DIRECTIVE.T0_DMZ_SANITIZE,
    flightStatusLine: "> T0 · Irongate (14) · sanitization / ingestion…",
  };

  if (scenario === "INTERNAL") {
    return [
      ingestion,
      {
        terminalLine: "[IRONTECH] Attempt 1/1 — PENDING",
        terminalTone: "white",
        phase: "T4_ANALYSIS_IRONTECH",
        assigneeId: CHAOS_ASSIGNEE_IRONTECH_11,
        assigneeLabel: "Irontech (Agent 11)",
        directiveId: CHAOS_DIRECTIVE.T4_ANALYSIS,
        flightStatusLine: "> T+4s · Irontech (11) · internal correction attempt…",
      },
      {
        terminalLine: "[IRONTECH] Attempt 1/1 — COMPLETED",
        terminalTone: "amber",
        phase: "T8_OBSERVATION_IRONTECH",
        assigneeId: CHAOS_ASSIGNEE_IRONTECH_11,
        assigneeLabel: "Irontech (Agent 11)",
        directiveId: CHAOS_DIRECTIVE.T8_OBSERVATION,
        flightStatusLine: "> T+8s · Irontech (11) · completion observed…",
      },
      {
        terminalLine:
          "[SYSTEM] [IRONTECH AUTONOMOUS RECOVERY] - System integrity verified and restored via automated patch. No human intervention required.",
        terminalTone: "amber",
        phase: "T12_RESOLUTION_SYSTEM",
        assigneeId: CHAOS_ASSIGNEE_SYSTEM,
        assigneeLabel: "SYSTEM",
        directiveId: CHAOS_DIRECTIVE.T12_SYSTEM_CONCLUSION,
        flightStatusLine: "> T+12s · SYSTEM · conclusion / GRC promotion…",
        recordObserverConcurrenceVerified: true,
      },
    ];
  }

  if (scenario === "HOME_SERVER") {
    return [
      ingestion,
      {
        terminalLine: "[IRONTECH] Attempt 1/3 — FAILED",
        terminalTone: "white",
        phase: "T4_ANALYSIS_IRONTECH",
        assigneeId: CHAOS_ASSIGNEE_IRONTECH_11,
        assigneeLabel: "Irontech (Agent 11)",
        directiveId: CHAOS_DIRECTIVE.T4_ANALYSIS,
        flightStatusLine: "> T+4s · Irontech (11) · internal fail…",
      },
      {
        terminalLine: "[IRONTECH] Attempt 1/3 — PENDING",
        terminalTone: "amber",
        phase: "T8_OBSERVATION_IRONTECH",
        assigneeId: CHAOS_ASSIGNEE_IRONTECH_11,
        assigneeLabel: "Irontech (Agent 11)",
        directiveId: CHAOS_DIRECTIVE.T8_OBSERVATION,
        flightStatusLine: "> T+8s · Irontech (11) · home server query path…",
      },
      {
        terminalLine: "[IRONTECH] Attempt 3/3 — COMPLETED",
        terminalTone: "amber",
        phase: "T12_RESOLUTION_SYSTEM",
        assigneeId: CHAOS_ASSIGNEE_SYSTEM,
        assigneeLabel: "SYSTEM",
        directiveId: CHAOS_DIRECTIVE.T12_SYSTEM_CONCLUSION,
        flightStatusLine: "> T+12s · SYSTEM · success / promotion…",
        recordObserverConcurrenceVerified: true,
      },
    ];
  }

  if (scenario === "CLOUD_EXFIL") {
    return [
      ingestion,
      {
        terminalLine: "[IRONTECH] Stage 1/3 — soft containment engaged",
        terminalTone: "white",
        phase: "T4_ANALYSIS_IRONTECH",
        assigneeId: CHAOS_ASSIGNEE_IRONTECH_11,
        assigneeLabel: "Irontech (Agent 11)",
        directiveId: CHAOS_DIRECTIVE.T4_ANALYSIS,
        flightStatusLine: "> T+4s · Irontech (11) · cloud exfiltration detection…",
      },
      {
        terminalLine: "[IRONLOCK] Escalation armed — API rotation",
        terminalTone: "amber",
        phase: "T8_OBSERVATION_IRONTECH",
        assigneeId: CHAOS_ASSIGNEE_IRONTECH_11,
        assigneeLabel: "Irontech (Agent 11)",
        directiveId: CHAOS_DIRECTIVE.T8_OBSERVATION,
        flightStatusLine: "> T+8s · Irontech (11) · internal quarantine / escalation…",
      },
      {
        terminalLine: "[IRONLOCK] Stage 3/3 — HARD QUARANTINE COMPLETE",
        terminalTone: "amber",
        phase: "T12_RESOLUTION_SYSTEM",
        assigneeId: CHAOS_ASSIGNEE_SYSTEM,
        assigneeLabel: "SYSTEM",
        directiveId: CHAOS_DIRECTIVE.T12_SYSTEM_CONCLUSION,
        flightStatusLine: "> T+12s · SYSTEM · containment…",
        recordObserverConcurrenceVerified: true,
      },
    ];
  }

  if (scenario === "REMOTE_SUPPORT") {
    return [
      ingestion,
      {
        terminalLine: "[IRONTECH] Stage 1/4 — auto-mitigation engaged",
        terminalTone: "white",
        phase: "T4_ANALYSIS_IRONTECH",
        assigneeId: CHAOS_ASSIGNEE_IRONTECH_11,
        assigneeLabel: "Irontech (Agent 11)",
        directiveId: CHAOS_DIRECTIVE.T4_ANALYSIS,
        flightStatusLine: "> T+4s · Irontech (11) · remote support trigger…",
      },
      {
        terminalLine:
          "[IRONFRAME] Stage 3/4 — Opening Secure Diagnostic Tunnel. Irontech/Ironlock deploying Transient Sidecar Agent for human diagnostics.",
        terminalTone: "amber",
        phase: "T8_OBSERVATION_IRONTECH",
        assigneeId: CHAOS_ASSIGNEE_IRONTECH_11,
        assigneeLabel: "Irontech (Agent 11)",
        directiveId: CHAOS_DIRECTIVE.T8_OBSERVATION,
        flightStatusLine: "> T+8s · Irontech (11) · access grant / tunnel (simulated)…",
      },
      {
        terminalLine:
          "[IRONFRAME] Stage 4/4 — Human engineer connected via Sidecar. Pushing hotfix… Deleting Sidecar forensic probe.",
        terminalTone: "amber",
        phase: "T12_RESOLUTION_SYSTEM",
        assigneeId: CHAOS_ASSIGNEE_SYSTEM,
        assigneeLabel: "SYSTEM",
        directiveId: CHAOS_DIRECTIVE.T12_SYSTEM_CONCLUSION,
        flightStatusLine: "> T+12s · SYSTEM · human handoff (simulated)…",
        recordObserverConcurrenceVerified: true,
      },
    ];
  }

  /* CASCADING_FAILURE — terminal-only; no app / LKG process reboot. */
  return [
    ingestion,
    {
      terminalLine: "[IRONCORE] Stage 1/4 — FAILED: NODE LOST — telemetry storm collapsing",
      terminalTone: "white",
      phase: "T4_ANALYSIS_IRONTECH",
      assigneeId: CHAOS_ASSIGNEE_IRONTECH_11,
      assigneeLabel: "Irontech (Agent 11)",
      directiveId: CHAOS_DIRECTIVE.T4_ANALYSIS,
      flightStatusLine: "> T+4s · Irontech (11) · agent corruption / mesh fault (simulated)…",
    },
    {
      terminalLine:
        "[IRONTECH] Stage 4/4 — WORKFORCE REBIRTH — Restoring from LKG Gold Images — all 19 agents to verified state",
      terminalTone: "amber",
      phase: "T8_OBSERVATION_IRONTECH",
      assigneeId: CHAOS_ASSIGNEE_IRONTECH_11,
      assigneeLabel: "Irontech (Agent 11)",
      directiveId: CHAOS_DIRECTIVE.T8_OBSERVATION,
      flightStatusLine: "> T+8s · Irontech (11) · simulated relaunch from LKG (terminal only)…",
    },
    {
      terminalLine: "[IRONTECH] Stage 4/4 — LKG rebirth ACK — workforce signature matches gold images",
      terminalTone: "amber",
      phase: "T12_RESOLUTION_SYSTEM",
      assigneeId: CHAOS_ASSIGNEE_SYSTEM,
      assigneeLabel: "SYSTEM",
      directiveId: CHAOS_DIRECTIVE.T12_SYSTEM_CONCLUSION,
      flightStatusLine: "> T+12s · SYSTEM · rebirth narrative (simulated)…",
      recordObserverConcurrenceVerified: true,
    },
  ];
}

/** Appended on successful GRC acknowledge so the handoff chain closes in Prisma JSON. */
export function buildChaosFinalAckIngestionPatch(
  prevIngestionDetails: string | null,
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
    assigneeId: CHAOS_ASSIGNEE_SYSTEM,
    assigneeLabel: "SYSTEM / Operator",
    directiveId: CHAOS_DIRECTIVE.FINAL_GRC_ACK,
  };

  return {
    chaosShadowAuditLog: [...auditArr, { at, line: finalLine, tone: "amber" }] as unknown as Prisma.InputJsonValue,
    chaosAssigneeHandoffHistory: [...handArr, handoffEntry] as unknown as Prisma.InputJsonValue,
    chaosGrcAckPersistedAt: at as unknown as Prisma.InputJsonValue,
  };
}
