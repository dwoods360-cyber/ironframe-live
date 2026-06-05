import type { Prisma } from "@prisma/client";
import { parseIngestionDetailsForMerge } from "@/app/utils/ingestionDetailsMerge";

/** Formal Chaos L4 (Remote Support) lifecycle steps persisted on `ingestionDetails`. */
export const CHAOS_L4_LIFECYCLE_STEPS = [
  "INITIATED",
  "PHONE_HOME_TRIGGERED",
  "AWAITING_JIT_GRANT",
  "JIT_GRANTED",
  "TECH_INVESTIGATING",
  "CLOSED_ARCHIVED",
] as const;

export type ChaosL4LifecycleStep = (typeof CHAOS_L4_LIFECYCLE_STEPS)[number];

export const CHAOS_L4_ASSIGNED_ROLES = [
  "CUSTOMER_ANALYST",
  "IRONFRAME_TECH_SUPPORT",
] as const;

export type ChaosL4AssignedRole = (typeof CHAOS_L4_ASSIGNED_ROLES)[number];

/** Automated failure phase system log lines (steps 1–3). */
export const CHAOS_L4_AUTOMATED_FAILURE_LOGS = [
  "STAGE 1: Internal baseline validation failed. No stable LKG state recovered.",
  "STAGE 2: Phone-home protocol handshake established with home.ironframe.io.",
  "STAGE 2: Remote update failed to deploy. Signature mismatch recorded.",
  "STAGE 3: System alert issued: Error requires an Ironframe Support person. Please grant remote access.",
] as const;

export const CHAOS_L4_WORK_PERFORMED_MIN_CHARS = 20;

export const CHAOS_L4_CARD_TITLE =
  "4 — Irontech Chaos L4 · Remote Support (Human Handoff)" as const;

export type ChaosL4LifecycleSnapshot = {
  lifecycleStep: ChaosL4LifecycleStep | null;
  assignedRole: ChaosL4AssignedRole | null;
  remoteSupportJitAwaitingGrant: boolean;
  systemLogs: string[];
  workPerformed: string | null;
  jitGrantedAt: string | null;
  techClaimedAt: string | null;
  closedAt: string | null;
};

function normalizeLifecycleStep(raw: unknown): ChaosL4LifecycleStep | null {
  const v = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  return (CHAOS_L4_LIFECYCLE_STEPS as readonly string[]).includes(v)
    ? (v as ChaosL4LifecycleStep)
    : null;
}

function normalizeAssignedRole(raw: unknown): ChaosL4AssignedRole | null {
  const v = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  return (CHAOS_L4_ASSIGNED_ROLES as readonly string[]).includes(v)
    ? (v as ChaosL4AssignedRole)
    : null;
}

export function parseChaosL4LifecycleFromIngestion(
  ingestionDetails?: string | Prisma.JsonValue | null,
): ChaosL4LifecycleSnapshot | null {
  const base = parseIngestionDetailsForMerge(ingestionDetails);
  const scenario =
    typeof base.chaosScenario === "string" ? base.chaosScenario.trim().toUpperCase() : "";
  if (scenario !== "REMOTE_SUPPORT") return null;

  const systemLogs = Array.isArray(base.systemLogs)
    ? (base.systemLogs as unknown[])
        .filter((l): l is string => typeof l === "string" && l.trim().length > 0)
        .map((l) => l.trim())
    : [];

  return {
    lifecycleStep: normalizeLifecycleStep(base.lifecycleStep),
    assignedRole: normalizeAssignedRole(base.assignedRole),
    remoteSupportJitAwaitingGrant: base.remoteSupportJitAwaitingGrant === true,
    systemLogs,
    workPerformed: (() => {
      if (typeof base.workPerformed === "string" && base.workPerformed.trim().length > 0) {
        return base.workPerformed.trim();
      }
      if (
        typeof base.workPerformedSummary === "string" &&
        base.workPerformedSummary.trim().length > 0
      ) {
        return base.workPerformedSummary.trim();
      }
      return null;
    })(),
    jitGrantedAt:
      typeof base.jitGrantedAt === "string" && base.jitGrantedAt.trim().length > 0
        ? base.jitGrantedAt.trim()
        : null,
    techClaimedAt:
      typeof base.techClaimedAt === "string" && base.techClaimedAt.trim().length > 0
        ? base.techClaimedAt.trim()
        : null,
    closedAt:
      typeof base.closedAt === "string" && base.closedAt.trim().length > 0
        ? base.closedAt.trim()
        : null,
  };
}

export function appendChaosL4SystemLog(
  existing: string[] | undefined,
  line: string,
): string[] {
  const trimmed = line.trim();
  if (!trimmed) return existing ?? [];
  return [...(existing ?? []), trimmed];
}

export function isChaosL4AwaitingJitGrant(
  threatStatus: string | null | undefined,
  ingestionDetails?: string | Prisma.JsonValue | null,
): boolean {
  const snap = parseChaosL4LifecycleFromIngestion(ingestionDetails);
  if (!snap) return false;
  const st = (threatStatus ?? "").trim().toUpperCase();
  if (st !== "MITIGATED" && st !== "ACTIVE" && st !== "CONFIRMED" && st !== "IDENTIFIED") {
    if (snap.lifecycleStep === "AWAITING_JIT_GRANT") return true;
    return false;
  }
  if (snap.lifecycleStep === "AWAITING_JIT_GRANT") return true;
  return snap.remoteSupportJitAwaitingGrant;
}

export function isChaosL4ReadyForTechClaim(
  ingestionDetails?: string | Prisma.JsonValue | null,
): boolean {
  const snap = parseChaosL4LifecycleFromIngestion(ingestionDetails);
  return snap?.lifecycleStep === "JIT_GRANTED" && snap.assignedRole === "IRONFRAME_TECH_SUPPORT";
}

export function isChaosL4TechInvestigating(
  ingestionDetails?: string | Prisma.JsonValue | null,
): boolean {
  const snap = parseChaosL4LifecycleFromIngestion(ingestionDetails);
  return snap?.lifecycleStep === "TECH_INVESTIGATING";
}

/** Archive gate — requires tech role + parsed work-performed narrative. */
export function canArchiveChaosL4(
  ingestionDetails?: string | Prisma.JsonValue | null,
): boolean {
  const snap = parseChaosL4LifecycleFromIngestion(ingestionDetails);
  if (!snap) return false;
  if (snap.assignedRole !== "IRONFRAME_TECH_SUPPORT") return false;
  if (!snap.workPerformed || snap.workPerformed.length < CHAOS_L4_WORK_PERFORMED_MIN_CHARS) {
    return false;
  }
  return snap.lifecycleStep === "TECH_INVESTIGATING" || snap.lifecycleStep === "CLOSED_ARCHIVED";
}

export function buildChaosL4LifecyclePatch(
  patch: Partial<{
    lifecycleStep: ChaosL4LifecycleStep;
    assignedRole: ChaosL4AssignedRole;
    remoteSupportJitAwaitingGrant: boolean;
    systemLogs: string[];
    workPerformed: string;
    jitGrantedAt: string;
    techClaimedAt: string;
    closedAt: string;
    chaosRemoteAccessGrantedAt: string;
  }>,
): Record<string, Prisma.InputJsonValue> {
  const out: Record<string, Prisma.InputJsonValue> = {};
  if (patch.lifecycleStep) out.lifecycleStep = patch.lifecycleStep;
  if (patch.assignedRole) out.assignedRole = patch.assignedRole;
  if (patch.remoteSupportJitAwaitingGrant !== undefined) {
    out.remoteSupportJitAwaitingGrant = patch.remoteSupportJitAwaitingGrant;
  }
  if (patch.systemLogs) {
    out.systemLogs = patch.systemLogs as unknown as Prisma.InputJsonValue;
  }
  if (patch.workPerformed) out.workPerformed = patch.workPerformed;
  if (patch.jitGrantedAt) out.jitGrantedAt = patch.jitGrantedAt;
  if (patch.techClaimedAt) out.techClaimedAt = patch.techClaimedAt;
  if (patch.closedAt) out.closedAt = patch.closedAt;
  if (patch.chaosRemoteAccessGrantedAt) {
    out.chaosRemoteAccessGrantedAt = patch.chaosRemoteAccessGrantedAt;
  }
  return out;
}

/** Pre-computed Steps 1–3 failure state for Scenario 4 (administrative JIT gate). */
export function buildChaosScenario4InitialIngestion(
  tenantScopeUuid: string,
  companyId: bigint,
): Record<string, Prisma.InputJsonValue> {
  const now = new Date().toISOString();
  return {
    isChaosTest: true,
    incident_type: "CHAOS",
    category: "INFRASTRUCTURE",
    tenantScopeUuid: tenantScopeUuid.trim(),
    chaosTenantCompanyId: companyId.toString(),
    chaos_level: 4,
    chaosScenario: "REMOTE_SUPPORT",
    chaosScenarioDisplayLabel: CHAOS_L4_CARD_TITLE,
    entityType: "CHAOS_DRILL",
    lifecycleStep: "AWAITING_JIT_GRANT",
    assignedRole: "CUSTOMER_ANALYST",
    remoteSupportJitAwaitingGrant: true,
    systemLogs: [...CHAOS_L4_AUTOMATED_FAILURE_LOGS],
    ingressJustification:
      "[Irongate] Automated internal baseline and phone-home diagnostics completed with critical failures. External Tier-3 human intervention required.",
    suggestedRemediationOptions: [
      {
        id: "TIER3_REMEDY",
        label: "Execute Tier-3 External Support Handoff Playbook",
        resolutionText:
          "AGENT_PLAYBOOK|TIER3_REMEDY Authorized remote intervention window closed following verified system recovery hotfix.",
      },
    ] as unknown as Prisma.InputJsonValue,
    irontechLive: {
      streamSeq: 3,
      lastTerminalLine:
        "> [IRONFRAME] STAGE 3 — FAULT UNRESOLVED — REMOTE ACCESS MANDATED BY ADMINISTRATIVE POLICY",
      agentName: "Irontech",
      streamedAt: now,
      attempts: [
        {
          attempt: 1,
          max: 4,
          error:
            "Step 1: Autonomous internal repair failed — local LKG snapshot signature mismatch.",
          at: now,
        },
        {
          attempt: 2,
          max: 4,
          error:
            "Step 2: Phone-home protocol active. Contacted home.ironframe.io. Remote patch bundle corrupted on ingress transfer.",
          at: now,
        },
        {
          attempt: 3,
          max: 4,
          error:
            "Step 3: Alert broadcast — Error requires an Ironframe Support person. Awaiting remote access token grant.",
          at: now,
        },
      ],
    } as unknown as Prisma.InputJsonValue,
    grcJustification:
      "SYSTEM TEST: Remote Support Drill. Validating secure diagnostic tunnel hand-off for complex internal faults.",
  };
}

export function parseChaosL4IrontechLive(
  ingestionDetails?: string | Prisma.JsonValue | null,
): {
  streamSeq: number;
  lastTerminalLine: string;
  attempts: Array<{ attempt: number; max: number; error: string; at: string }>;
} | null {
  const base = parseIngestionDetailsForMerge(ingestionDetails);
  const live = base.irontechLive;
  if (live == null || typeof live !== "object" || Array.isArray(live)) return null;
  const L = live as Record<string, unknown>;
  const attempts = Array.isArray(L.attempts)
    ? (L.attempts as Array<{ attempt: number; max: number; error: string; at: string }>)
    : [];
  return {
    streamSeq: typeof L.streamSeq === "number" ? L.streamSeq : 0,
    lastTerminalLine: typeof L.lastTerminalLine === "string" ? L.lastTerminalLine : "",
    attempts,
  };
}

export function isChaosL4HandoffActive(
  ingestionDetails?: string | Prisma.JsonValue | null,
): boolean {
  const snap = parseChaosL4LifecycleFromIngestion(ingestionDetails);
  if (!snap?.lifecycleStep) return false;
  return snap.lifecycleStep !== "CLOSED_ARCHIVED";
}
