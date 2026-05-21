/**
 * Irontech resilience: Scenario 1 (INTERNAL) drill + minimal shared hooks for GRC / Ironcore.
 */
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { AgentOperationStatus, ThreatState } from "@prisma/client";
import { recordSustainabilityImpact } from "@/app/actions/sustainabilityActions";
import { recordResilienceIntelStreamLine } from "@/app/actions/resilienceIntelStreamActions";
import { poisonAgentOperationWithChaos, threatIsChaosTest } from "@/app/utils/ironchaos";
import {
  mergeIngestionDetailsPatch,
  mergeIngestionDetailsPatchJson,
  normalizeIngestionDetailsToString,
} from "@/app/utils/ingestionDetailsMerge";
import { executeAgentAction } from "@/app/actions/threatActions";
import {
  appendAssigneeHistory,
  handoffWorkforceAgent,
} from "@/app/services/riskRegistryActions";
import {
  CHAOS_ASSIGNEE_SYSTEM,
  CHAOS_DIRECTIVE,
} from "@/app/config/chaosShadowAudit";
import { CHAOS_WORKFORCE_ASSIGNEE_LABELS } from "@/app/utils/assignmentChainOfCustody";
import {
  parseIrontechLiveFromIngestion,
  type IrontechLiveAttemptEntry,
} from "@/app/utils/irontechLiveStream";
import { resolveIntegrityLedgerAuthorizedLabel } from "@/app/utils/serverAuth";
import { transitionThreatStatus, updateThreatWithIntegrity } from "@/src/services/threatStateService";
import { logThreatActivity } from "@/app/actions/auditActions";

/** Passed from server actions (inject / JIT grant) for Integrity Hub forensic fields. */
export type IntegrityForensicAttribution = { userId: string; displayName: string };

/** Strict completion signal for chaos drills (server action gates UI on `success`). */
export type IrontechDrillPersistenceResult =
  | { success: true; recordId?: string }
  | { success: false; error: string };

/**
 * GRC / SOC 2: bind `ingestionDetails.userId` + integrity fields on resolve.
 * Non-empty `triggeringUser` → human operator; `null` → autonomous background only (`SYSTEM_IRONTECH_AUTO`).
 */
export function attributionFromTriggeringUser(
  triggeringUser: string | null,
  displayName?: string | null,
): IntegrityForensicAttribution {
  if (triggeringUser != null && triggeringUser.trim() !== "") {
    const uid = triggeringUser.trim();
    const dn = displayName?.trim();
    return { userId: uid, displayName: dn && dn.length > 0 ? dn : uid };
  }
  return { userId: "SYSTEM_IRONTECH_AUTO", displayName: "SYSTEM_IRONTECH_AUTO" };
}

const INTERNAL_DRILL_AGENT = "Irontech";
const INTERNAL_DRILL_GAP_MS = 4000;
/** Canonical constitutional operator id — aligned with `ACKNOWLEDGE_FIRST_TOUCH_ASSIGNEE_ID` in threatActions. */
const INTERNAL_DRILL_OPERATOR_ID = "User_00";

/** AuditLog operator + JSON: agent executes; User_00 is recorded as finalizing supervisory authority. */
async function logAutonomousDrillResolutionAudit(
  threatId: string,
  integrityEventType: string,
  executingAgent?: string,
): Promise<void> {
  await logThreatActivity(
    threatId,
    "STATUS_UPDATED",
    JSON.stringify({
      supervisoryAuthority: INTERNAL_DRILL_OPERATOR_ID,
      executingAgent: executingAgent?.trim() || INTERNAL_DRILL_AGENT,
      integrityEventType,
      source: "IRONTECH_AUTONOMOUS_RESOLUTION",
    }),
    { operatorId: INTERNAL_DRILL_OPERATOR_ID },
  );
}

const HOME_SERVER_GAP_MS_ATTEMPT_1 = 2000;
const HOME_SERVER_GAP_MS_ATTEMPT_2 = 2000;
const HOME_SERVER_GAP_MS_ATTEMPT_3 = 3000;

const ESCALATION_DRILL_STAGE_1_MS = 2000;
const ESCALATION_DRILL_STAGE_2_MS = 3000;
const ESCALATION_DRILL_STAGE_3_MS = 4000;

/** Scenario 5 — cascading failure: 2s + 2s + 3s + 3s = 10s terminal lockdown. */
const CASCADE_DRILL_STAGE_1_MS = 2000;
const CASCADE_DRILL_STAGE_2_MS = 2000;
const CASCADE_DRILL_STAGE_3_MS = 3000;
const CASCADE_DRILL_STAGE_4_MS = 3000;
/** Repo-local LKG manifest (build-safe; no G: path literals in bundle graph). */
const LKG_LOCAL_MANIFEST_REL = ["storage", "manifest", "lkg_signatures.json"] as const;
const LKG_VAULT_VERIFY_SIM_MS = 2000;

/** Initial L4 drill (Stages 1–2) — kept short so Attack Velocity → Active handoff stays ~1–2s. */
const REMOTE_SUPPORT_STAGE_1_MS = 300;
const REMOTE_SUPPORT_STAGE_2_MS = 300;
/** Post-JIT grant resume (Stage 4 hotfix window) — unchanged UX for grant flow. */
const REMOTE_SUPPORT_STAGE_4_MS = 4000;

function revalidateDashboardAndIntegrityPath(): void {
  revalidatePath("/", "layout");
  revalidatePath("/integrity");
}

type ChaosScenarioIntegrityCode =
  | "INTERNAL"
  | "HOME_SERVER"
  | "CLOUD_EXFIL"
  | "REMOTE_SUPPORT"
  | "CASCADING_FAILURE";

/** Persist chaos drill identity + recovery seconds for Integrity Hub (Prisma / ingestionDetails). */
function chaosIntegrityLedgerPatch(
  scenario: ChaosScenarioIntegrityCode,
  createdAt: Date,
  recoveredAtIso: string,
): {
  isChaosTest: true;
  chaosScenario: string;
  integrityLedgerRecoverySeconds: number;
} {
  const ms = Date.parse(recoveredAtIso) - createdAt.getTime();
  const sec = Number.isFinite(ms) && ms >= 0 ? Math.round((ms / 1000) * 10) / 10 : 0;
  return {
    isChaosTest: true,
    chaosScenario: scenario,
    integrityLedgerRecoverySeconds: sec,
  };
}

/** SOC 2: precise resolution instant + operator attribution in `ingestionDetails`. */
function integrityForensicIngestionFieldsSync(
  resolvedAtIso: string,
  attr: IntegrityForensicAttribution,
): Record<string, Prisma.InputJsonValue> {
  return {
    integrityResolvedAt: resolvedAtIso,
    resolvedAt: resolvedAtIso,
    integrityAuthorizedUserId: attr.userId,
    userId: attr.userId,
    integrityAuthorizedDisplayName: attr.displayName,
  };
}

async function integrityForensicIngestionFields(
  resolvedAtIso: string,
  attribution?: IntegrityForensicAttribution | null,
): Promise<Record<string, Prisma.InputJsonValue>> {
  if (attribution === null) {
    return integrityForensicIngestionFieldsSync(
      resolvedAtIso,
      attributionFromTriggeringUser(null),
    );
  }
  if (attribution !== undefined) {
    return integrityForensicIngestionFieldsSync(resolvedAtIso, attribution);
  }
  return integrityForensicIngestionFieldsSync(
    resolvedAtIso,
    await resolveIntegrityLedgerAuthorizedLabel(),
  );
}

async function persistIrontechLivePatch(
  threatId: string,
  streamSeq: number,
  lastTerminalLine: string,
  attempts: IrontechLiveAttemptEntry[],
): Promise<void> {
  const row = await prisma.threatEvent.findUnique({
    where: { id: threatId },
    select: { ingestionDetails: true },
  });
  const irontechLive = {
    streamSeq,
    lastTerminalLine,
    attempts,
    agentName: INTERNAL_DRILL_AGENT,
    streamedAt: new Date().toISOString(),
  } satisfies Record<string, unknown>;
  await updateThreatWithIntegrity({
    threatId,
    changes: {
      ingestionDetails: mergeIngestionDetailsPatch(row?.ingestionDetails ?? null, {
        irontechLive: irontechLive as unknown as Prisma.InputJsonValue,
      }),
    },
    actorUserId: INTERNAL_DRILL_OPERATOR_ID,
    eventType: "IRONTECH_LIVE_PATCH_UPDATED",
  });
}

export type ExecuteWithRetryResult =
  | { ok: true; completed: true }
  | { ok: false; escalated: true; error: string }
  | { ok: false; completed: false; error: string };

export type ExecuteWithRetryOptions = {
  maxAttempts?: number;
  bypassChaosTestTag?: boolean;
};

/**
 * Scenario 1 (INTERNAL) — linear path: PENDING → wait 4s → COMPLETED → RESOLVED + green banner payload.
 */
export async function runIsolatedInternalDrill(
  threatId: string,
  attribution?: IntegrityForensicAttribution | null,
): Promise<IrontechDrillPersistenceResult> {
  try {
    const tid = threatId.trim();
    if (!tid) {
      console.log("[DRILL SKIP] empty threatId");
      return { success: false, error: "Missing threat id." };
    }

    console.log(`[DRILL START] Threat ${tid}`);

    const operatorSnapshot = {
      operatorId: INTERNAL_DRILL_OPERATOR_ID,
      phase: "INTERNAL_DRILL",
    } satisfies Record<string, string>;

    await prisma.agentOperation.upsert({
      where: { threatId_agentName: { threatId: tid, agentName: INTERNAL_DRILL_AGENT } },
      create: {
        threatId: tid,
        agentName: INTERNAL_DRILL_AGENT,
        status: AgentOperationStatus.PENDING,
        attemptCount: 1,
        snapshot: operatorSnapshot as Prisma.InputJsonValue,
      },
      update: {
        status: AgentOperationStatus.PENDING,
        attemptCount: 1,
        lastError: null,
        snapshot: operatorSnapshot as Prisma.InputJsonValue,
      },
    });

    await recordResilienceIntelStreamLine(
      "> [IRONTECH] Attempt 1/1 — PENDING",
      tid,
    );

    console.log(`[DRILL WAITING] ${INTERNAL_DRILL_GAP_MS}ms...`);
    await new Promise((r) => setTimeout(r, INTERNAL_DRILL_GAP_MS));

    console.log("[DRILL RESOLVING] Updating DB...");

    await prisma.agentOperation.update({
      where: { threatId_agentName: { threatId: tid, agentName: INTERNAL_DRILL_AGENT } },
      data: {
        status: AgentOperationStatus.COMPLETED,
        lastError: null,
        snapshot: {
          ...operatorSnapshot,
          completedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });

    await recordResilienceIntelStreamLine(
      "> [IRONTECH] Attempt 1/1 — COMPLETED",
      tid,
    );

    const row = await prisma.threatEvent.findUnique({
      where: { id: tid },
      select: { ingestionDetails: true, createdAt: true },
    });
    const recoveredAt = new Date().toISOString();
    const forensic = await integrityForensicIngestionFields(recoveredAt, attribution);
    const merged = mergeIngestionDetailsPatch(row?.ingestionDetails ?? null, {
      ...forensic,
      ...chaosIntegrityLedgerPatch("INTERNAL", row?.createdAt ?? new Date(), recoveredAt),
      resolutionJustification:
        "[IRONTECH AUTONOMOUS RECOVERY] - System integrity verified and restored via automated patch. No human intervention required.",
      lifecycleState: "archived",
      autonomousRecovery: true,
      autonomousRecoveredAt: recoveredAt,
      ironsightBypassed: true,
    });
    await transitionThreatStatus({
      threatId: tid,
      newStatus: ThreatState.RESOLVED,
      actorUserId: INTERNAL_DRILL_OPERATOR_ID,
      eventType: "IRONTECH_SCENARIO_INTERNAL_RESOLVED",
      extraChanges: {
        ingestionDetails: merged,
        assigneeId: INTERNAL_DRILL_OPERATOR_ID,
      },
    });
    await logAutonomousDrillResolutionAudit(tid, "IRONTECH_SCENARIO_INTERNAL_RESOLVED");
    revalidateDashboardAndIntegrityPath();

    console.log(`[DRILL SUCCESS] Threat ${tid} is Green.`);
    return { success: true };
  } catch (error) {
    console.error(`[DRILL CRASHED] Threat ${threatId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Scenario 2 (HOME_SERVER) — 3 attempts: fail (2s) + fail (2s) + success (3s) → RESOLVED + victory payload.
 * Drives `ingestionDetails.irontechLive` so the Active board attempt list + 2s polling stay in sync.
 */
export async function runIsolatedHomeServerDrill(
  threatId: string,
  attribution?: IntegrityForensicAttribution | null,
): Promise<IrontechDrillPersistenceResult> {
  try {
    const tid = threatId.trim();
    if (!tid) {
      console.log("[SCENARIO 2 SKIP] empty threatId");
      return { success: false, error: "Missing threat id." };
    }

    console.log(`[SCENARIO 2 START] Threat ${tid}`);

    const operatorSnapshot = {
      operatorId: INTERNAL_DRILL_OPERATOR_ID,
      phase: "HOME_SERVER_DRILL",
    } satisfies Record<string, string>;

    let seq = 0;
    const attempts: IrontechLiveAttemptEntry[] = [];
    const nowIso = () => new Date().toISOString();

    await prisma.agentOperation.upsert({
      where: { threatId_agentName: { threatId: tid, agentName: INTERNAL_DRILL_AGENT } },
      create: {
        threatId: tid,
        agentName: INTERNAL_DRILL_AGENT,
        status: AgentOperationStatus.PENDING,
        attemptCount: 1,
        snapshot: operatorSnapshot as Prisma.InputJsonValue,
      },
      update: {
        status: AgentOperationStatus.PENDING,
        attemptCount: 1,
        lastError: null,
        snapshot: operatorSnapshot as Prisma.InputJsonValue,
      },
    });

    seq += 1;
    await persistIrontechLivePatch(
      tid,
      seq,
      "> [IRONTECH] Attempt 1/3 — PENDING (home path)",
      attempts,
    );
    await recordResilienceIntelStreamLine("> [IRONTECH] Attempt 1/3 — PENDING", tid);

    console.log("[S2] Attempt 1: Simulating blocked port...");
    await new Promise((r) => setTimeout(r, HOME_SERVER_GAP_MS_ATTEMPT_1));

    attempts.push({
      attempt: 1,
      max: 3,
      error: "Blocked port — upstream handshake timeout (simulated).",
      at: nowIso(),
    });
    seq += 1;
    await persistIrontechLivePatch(
      tid,
      seq,
      "> [IRONTECH] Attempt 1/3 — FAILED (blocked port)",
      attempts,
    );
    await prisma.agentOperation.update({
      where: { threatId_agentName: { threatId: tid, agentName: INTERNAL_DRILL_AGENT } },
      data: {
        status: AgentOperationStatus.RETRYING,
        attemptCount: 1,
        lastError: attempts[0]?.error ?? "Attempt 1 failed",
      },
    });
    await recordResilienceIntelStreamLine("> [IRONTECH] Attempt 1/3 — FAILED", tid);

    console.log("[S2] Attempt 2: Simulating auth rejection...");
    await new Promise((r) => setTimeout(r, HOME_SERVER_GAP_MS_ATTEMPT_2));

    attempts.push({
      attempt: 2,
      max: 3,
      error: "Auth rejection — HMAC validation failed (simulated).",
      at: nowIso(),
    });
    seq += 1;
    await persistIrontechLivePatch(
      tid,
      seq,
      "> [IRONTECH] Attempt 2/3 — FAILED (auth rejection)",
      attempts,
    );
    await prisma.agentOperation.update({
      where: { threatId_agentName: { threatId: tid, agentName: INTERNAL_DRILL_AGENT } },
      data: {
        status: AgentOperationStatus.RETRYING,
        attemptCount: 2,
        lastError: attempts[1]?.error ?? "Attempt 2 failed",
      },
    });
    await recordResilienceIntelStreamLine("> [IRONTECH] Attempt 2/3 — FAILED", tid);

    console.log("[S2] Attempt 3: Patching...");
    await new Promise((r) => setTimeout(r, HOME_SERVER_GAP_MS_ATTEMPT_3));

    attempts.push({
      attempt: 3,
      max: 3,
      error: "Patch bundle deployed — integrity verified (simulated).",
      at: nowIso(),
    });
    seq += 1;
    await persistIrontechLivePatch(
      tid,
      seq,
      "> [IRONTECH] Attempt 3/3 — COMPLETED",
      attempts,
    );
    await prisma.agentOperation.update({
      where: { threatId_agentName: { threatId: tid, agentName: INTERNAL_DRILL_AGENT } },
      data: {
        status: AgentOperationStatus.COMPLETED,
        attemptCount: 3,
        lastError: null,
        snapshot: {
          ...operatorSnapshot,
          completedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
    await recordResilienceIntelStreamLine("> [IRONTECH] Attempt 3/3 — COMPLETED", tid);

    console.log("[S2] Resolving DB...");
    const row = await prisma.threatEvent.findUnique({
      where: { id: tid },
      select: { ingestionDetails: true, createdAt: true },
    });
    const recoveredAt = new Date().toISOString();
    const forensic = await integrityForensicIngestionFields(recoveredAt, attribution);
    const merged = mergeIngestionDetailsPatch(row?.ingestionDetails ?? null, {
      ...forensic,
      ...chaosIntegrityLedgerPatch("HOME_SERVER", row?.createdAt ?? new Date(), recoveredAt),
      resolutionJustification:
        "[IRONTECH AUTONOMOUS RECOVERY] - System integrity verified and restored via automated patch. No human intervention required.",
      lifecycleState: "archived",
      autonomousRecovery: true,
      autonomousRecoveredAt: recoveredAt,
      ironsightBypassed: true,
    });
    await transitionThreatStatus({
      threatId: tid,
      newStatus: ThreatState.RESOLVED,
      actorUserId: INTERNAL_DRILL_OPERATOR_ID,
      eventType: "IRONTECH_SCENARIO_HOME_SERVER_RESOLVED",
      extraChanges: {
        ingestionDetails: merged,
        assigneeId: INTERNAL_DRILL_OPERATOR_ID,
      },
    });
    await logAutonomousDrillResolutionAudit(tid, "IRONTECH_SCENARIO_HOME_SERVER_RESOLVED");
    revalidateDashboardAndIntegrityPath();

    console.log(`[SCENARIO 2 SUCCESS] Threat ${tid} is Green.`);
    return { success: true };
  } catch (error) {
    console.error(`[SCENARIO 2 CRASHED] Threat ${threatId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Scenario 3 (CLOUD_EXFIL) — soft containment fail (2s) + Ironlock escalation fail (3s) + hard quarantine (4s) → RESOLVED.
 */
export async function runIsolatedEscalationDrill(
  threatId: string,
  attribution?: IntegrityForensicAttribution | null,
): Promise<IrontechDrillPersistenceResult> {
  try {
    const tid = threatId.trim();
    if (!tid) {
      console.log("[SCENARIO 3 SKIP] empty threatId");
      return { success: false, error: "Missing threat id." };
    }

    console.log(`[SCENARIO 3 START] Threat ${tid} - Escalation Protocol`);

    const operatorSnapshot = {
      operatorId: INTERNAL_DRILL_OPERATOR_ID,
      phase: "CLOUD_EXFIL_DRILL",
    } satisfies Record<string, string>;

    let seq = 0;
    const attempts: IrontechLiveAttemptEntry[] = [];
    const nowIso = () => new Date().toISOString();

    await prisma.agentOperation.upsert({
      where: { threatId_agentName: { threatId: tid, agentName: INTERNAL_DRILL_AGENT } },
      create: {
        threatId: tid,
        agentName: INTERNAL_DRILL_AGENT,
        status: AgentOperationStatus.PENDING,
        attemptCount: 1,
        snapshot: operatorSnapshot as Prisma.InputJsonValue,
      },
      update: {
        status: AgentOperationStatus.PENDING,
        attemptCount: 1,
        lastError: null,
        snapshot: operatorSnapshot as Prisma.InputJsonValue,
      },
    });

    seq += 1;
    await persistIrontechLivePatch(
      tid,
      seq,
      "> [IRONTECH] Stage 1/3 — soft containment (Irontech)",
      attempts,
    );
    await recordResilienceIntelStreamLine("> [IRONTECH] Stage 1/3 — soft containment engaged", tid);

    console.log("[S3] Stage 1: Irontech attempting soft containment...");
    await new Promise((r) => setTimeout(r, ESCALATION_DRILL_STAGE_1_MS));

    attempts.push({
      attempt: 1,
      max: 3,
      error: "Evasion detected — lateral movement probe bypassed soft ACL (simulated).",
      at: nowIso(),
    });
    seq += 1;
    await persistIrontechLivePatch(
      tid,
      seq,
      "> [IRONTECH] Stage 1/3 — FAILED (evasion)",
      attempts,
    );
    await prisma.agentOperation.update({
      where: { threatId_agentName: { threatId: tid, agentName: INTERNAL_DRILL_AGENT } },
      data: {
        status: AgentOperationStatus.RETRYING,
        attemptCount: 1,
        lastError: attempts[0]?.error ?? "Stage 1 failed",
      },
    });
    await recordResilienceIntelStreamLine("> [IRONLOCK] Escalation armed — API rotation", tid);

    console.log("[S3] Stage 2: Soft containment bypassed. Escalating to Ironlock...");
    await new Promise((r) => setTimeout(r, ESCALATION_DRILL_STAGE_2_MS));

    attempts.push({
      attempt: 2,
      max: 3,
      error: "Ironlock pre-sever — edge API keys rotating; session pinning lost (simulated).",
      at: nowIso(),
    });
    seq += 1;
    await persistIrontechLivePatch(
      tid,
      seq,
      "> [IRONLOCK] Stage 2/3 — escalation lane (keys rotating)",
      attempts,
    );
    await prisma.agentOperation.update({
      where: { threatId_agentName: { threatId: tid, agentName: INTERNAL_DRILL_AGENT } },
      data: {
        status: AgentOperationStatus.RETRYING,
        attemptCount: 2,
        lastError: attempts[1]?.error ?? "Stage 2 failed",
      },
    });
    await recordResilienceIntelStreamLine("> [IRONLOCK] Stage 2/3 — pre-quarantine hold", tid);

    console.log("[S3] Stage 3: Ironlock executing hard network sever...");
    await new Promise((r) => setTimeout(r, ESCALATION_DRILL_STAGE_3_MS));

    attempts.push({
      attempt: 3,
      max: 3,
      error: "Hard quarantine complete — east-west paths severed; exfil channel collapsed (simulated).",
      at: nowIso(),
    });
    seq += 1;
    await persistIrontechLivePatch(
      tid,
      seq,
      "> [IRONLOCK] Stage 3/3 — HARD QUARANTINE COMPLETE",
      attempts,
    );
    await prisma.agentOperation.update({
      where: { threatId_agentName: { threatId: tid, agentName: INTERNAL_DRILL_AGENT } },
      data: {
        status: AgentOperationStatus.COMPLETED,
        attemptCount: 3,
        lastError: null,
        snapshot: {
          ...operatorSnapshot,
          completedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
    await recordResilienceIntelStreamLine("> [IRONLOCK] Stage 3/3 — COMPLETED", tid);

    console.log("[S3] Resolving DB...");
    const row = await prisma.threatEvent.findUnique({
      where: { id: tid },
      select: { ingestionDetails: true, createdAt: true },
    });
    const recoveredAt = new Date().toISOString();
    const forensic = await integrityForensicIngestionFields(recoveredAt, attribution);
    const merged = mergeIngestionDetailsPatch(row?.ingestionDetails ?? null, {
      ...forensic,
      ...chaosIntegrityLedgerPatch("CLOUD_EXFIL", row?.createdAt ?? new Date(), recoveredAt),
      resolutionJustification:
        "[IRONTECH AUTONOMOUS RECOVERY] - System integrity verified and restored via automated patch. No human intervention required.",
      lifecycleState: "archived",
      autonomousRecovery: true,
      autonomousRecoveredAt: recoveredAt,
      ironsightBypassed: true,
    });
    await transitionThreatStatus({
      threatId: tid,
      newStatus: ThreatState.RESOLVED,
      actorUserId: INTERNAL_DRILL_OPERATOR_ID,
      eventType: "IRONTECH_SCENARIO_CLOUD_EXFIL_RESOLVED",
      extraChanges: {
        ingestionDetails: merged,
        assigneeId: INTERNAL_DRILL_OPERATOR_ID,
      },
    });
    await logAutonomousDrillResolutionAudit(tid, "IRONTECH_SCENARIO_CLOUD_EXFIL_RESOLVED");
    revalidateDashboardAndIntegrityPath();

    console.log(`[SCENARIO 3 SUCCESS] Threat ${tid} is Green.`);
    return { success: true };
  } catch (error) {
    console.error(`[SCENARIO 3 CRASHED] Threat ${threatId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const CASCADE_ATTEMPT_MAX = 4;
const REMOTE_SUPPORT_ATTEMPT_MAX = 4;

/** Scenario 4 only — chaos inject may land on `RiskEvent` (sim) or `ThreatEvent` (prod). */
type RemoteSupportDrillCtx = {
  plane: "prod" | "shadow";
  tenantCompanyId: bigint;
};

async function resolveRemoteSupportDrillCtx(
  threatId: string,
): Promise<RemoteSupportDrillCtx | null> {
  const sim = await prisma.riskEvent.findFirst({
    where: { id: threatId },
    select: { tenantCompanyId: true },
  });
  if (sim?.tenantCompanyId != null) {
    return { plane: "shadow", tenantCompanyId: sim.tenantCompanyId };
  }
  const prod = await prisma.threatEvent.findUnique({
    where: { id: threatId },
    select: { tenantCompanyId: true },
  });
  if (prod?.tenantCompanyId != null) {
    return { plane: "prod", tenantCompanyId: prod.tenantCompanyId };
  }
  return null;
}

async function upsertRemoteSupportDrillAgentOp(
  ctx: RemoteSupportDrillCtx,
  threatId: string,
  data: {
    status: AgentOperationStatus;
    attemptCount: number;
    lastError?: string | null;
    snapshot: Prisma.InputJsonValue;
  },
): Promise<void> {
  if (ctx.plane === "shadow") return;
  await prisma.agentOperation.upsert({
    where: { threatId_agentName: { threatId, agentName: INTERNAL_DRILL_AGENT } },
    create: {
      threatId,
      agentName: INTERNAL_DRILL_AGENT,
      status: data.status,
      attemptCount: data.attemptCount,
      lastError: data.lastError ?? null,
      snapshot: data.snapshot,
    },
    update: {
      status: data.status,
      attemptCount: data.attemptCount,
      lastError: data.lastError ?? null,
      snapshot: data.snapshot,
    },
  });
}

async function updateRemoteSupportDrillAgentOp(
  ctx: RemoteSupportDrillCtx,
  threatId: string,
  data: Prisma.AgentOperationUpdateInput,
): Promise<void> {
  if (ctx.plane === "shadow") return;
  await prisma.agentOperation.update({
    where: { threatId_agentName: { threatId, agentName: INTERNAL_DRILL_AGENT } },
    data,
  });
}

async function persistRemoteSupportLivePatch(
  ctx: RemoteSupportDrillCtx,
  threatId: string,
  streamSeq: number,
  lastTerminalLine: string,
  attempts: IrontechLiveAttemptEntry[],
): Promise<void> {
  const irontechLive = {
    streamSeq,
    lastTerminalLine,
    attempts,
    agentName: INTERNAL_DRILL_AGENT,
    streamedAt: new Date().toISOString(),
  } satisfies Record<string, unknown>;
  const patch = { irontechLive: irontechLive as unknown as Prisma.InputJsonValue };

  if (ctx.plane === "prod") {
    const row = await prisma.threatEvent.findUnique({
      where: { id: threatId },
      select: { ingestionDetails: true },
    });
    await updateThreatWithIntegrity({
      threatId,
      changes: {
        ingestionDetails: mergeIngestionDetailsPatch(row?.ingestionDetails ?? null, patch),
      },
      actorUserId: INTERNAL_DRILL_OPERATOR_ID,
      eventType: "IRONTECH_LIVE_PATCH_UPDATED",
    });
    return;
  }

  const row = await prisma.riskEvent.findFirst({
    where: { id: threatId, tenantCompanyId: ctx.tenantCompanyId },
    select: { ingestionDetails: true },
  });
  const merged = mergeIngestionDetailsPatchJson(row?.ingestionDetails ?? null, patch);
  const result = await executeAgentAction({
    plane: "shadow",
    threatId,
    tenantCompanyId: ctx.tenantCompanyId,
    operatorId: INTERNAL_DRILL_OPERATOR_ID,
    justification: lastTerminalLine,
    integrityEventType: "IRONTECH_LIVE_PATCH_UPDATED",
    auditAction: "STATE_TRANSITION",
    shadowChanges: { ingestionDetails: merged },
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
}

async function applyRemoteSupportDrillStatus(
  ctx: RemoteSupportDrillCtx,
  threatId: string,
  newStatus: ThreatState,
  eventType: string,
  ingestionPatch: Record<string, Prisma.InputJsonValue>,
  rowExtras?: {
    prod?: Omit<Prisma.ThreatEventUpdateInput, "status" | "ingestionDetails">;
    shadow?: Omit<Prisma.RiskEventUpdateInput, "status" | "ingestionDetails">;
  },
): Promise<void> {
  if (ctx.plane === "prod") {
    const row = await prisma.threatEvent.findUnique({
      where: { id: threatId },
      select: { ingestionDetails: true },
    });
    await transitionThreatStatus({
      threatId,
      newStatus,
      actorUserId: INTERNAL_DRILL_OPERATOR_ID,
      eventType,
      extraChanges: {
        ingestionDetails: mergeIngestionDetailsPatch(row?.ingestionDetails ?? null, ingestionPatch),
        ...rowExtras?.prod,
      },
    });
    return;
  }

  const row = await prisma.riskEvent.findFirst({
    where: { id: threatId, tenantCompanyId: ctx.tenantCompanyId },
    select: { ingestionDetails: true },
  });
  const merged = mergeIngestionDetailsPatchJson(row?.ingestionDetails ?? null, ingestionPatch);
  const result = await executeAgentAction({
    plane: "shadow",
    threatId,
    tenantCompanyId: ctx.tenantCompanyId,
    operatorId: INTERNAL_DRILL_OPERATOR_ID,
    justification: eventType,
    integrityEventType: eventType,
    auditAction: "STATE_TRANSITION",
    shadowChanges: {
      status: newStatus,
      ingestionDetails: merged,
      ...rowExtras?.shadow,
    },
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
}

async function fetchRemoteSupportDrillIngestion(
  ctx: RemoteSupportDrillCtx,
  threatId: string,
): Promise<string | null> {
  if (ctx.plane === "prod") {
    const row = await prisma.threatEvent.findUnique({
      where: { id: threatId },
      select: { ingestionDetails: true },
    });
    return row?.ingestionDetails ?? null;
  }
  const row = await prisma.riskEvent.findFirst({
    where: { id: threatId, tenantCompanyId: ctx.tenantCompanyId },
    select: { ingestionDetails: true },
  });
  return normalizeIngestionDetailsToString(row?.ingestionDetails) ?? null;
}

const REMOTE_SUPPORT_CHAOS_OPERATOR_ID = "Irontech";

async function recordRemoteSupportWorkforceHandoff(
  ctx: RemoteSupportDrillCtx,
  threatId: string,
  agent: "IRONGATE" | "IRONSCRIBE" | "IRONTECH",
  narrative: string,
): Promise<void> {
  const result = await handoffWorkforceAgent(agent, {
    plane: ctx.plane,
    threatId,
    tenantCompanyId: ctx.tenantCompanyId,
    operatorId: REMOTE_SUPPORT_CHAOS_OPERATOR_ID,
    narrative,
  });
  if (!result.ok) {
    console.warn(`[S4] workforce handoff ${agent} failed:`, result.error);
  }
}

async function recordRemoteSupportSystemHandoff(
  ctx: RemoteSupportDrillCtx,
  threatId: string,
  narrative: string,
): Promise<void> {
  const result = await appendAssigneeHistory({
    plane: ctx.plane,
    threatId,
    tenantCompanyId: ctx.tenantCompanyId,
    assigneeId: CHAOS_ASSIGNEE_SYSTEM,
    assigneeDisplay: CHAOS_WORKFORCE_ASSIGNEE_LABELS.SYSTEM,
    actorLabel: "System/Observer",
    operatorId: REMOTE_SUPPORT_CHAOS_OPERATOR_ID,
    phase: "T12_RESOLUTION_SYSTEM",
    narrative,
    integrityEventType: "CHAOS_REMOTE_SUPPORT_SYSTEM_CONCURRENCE",
  });
  if (!result.ok) {
    console.warn("[S4] System/Observer handoff failed:", result.error);
  }
}

async function fetchRemoteSupportDrillCreatedAt(
  ctx: RemoteSupportDrillCtx,
  threatId: string,
): Promise<Date> {
  if (ctx.plane === "prod") {
    const row = await prisma.threatEvent.findUnique({
      where: { id: threatId },
      select: { createdAt: true },
    });
    return row?.createdAt ?? new Date();
  }
  const row = await prisma.riskEvent.findFirst({
    where: { id: threatId, tenantCompanyId: ctx.tenantCompanyId },
    select: { createdAt: true },
  });
  return row?.createdAt ?? new Date();
}

/**
 * Remote Support drill (Scenario 4) — Stages 1–2 failures, Stage 3 Transient Sidecar + tunnel,
 * then halts at `PENDING_REMOTE_INTERVENTION` until `resumeIsolatedRemoteSupportDrill` (JIT grant).
 */
export async function runIsolatedRemoteSupportDrill(
  threatId: string,
  injectAttribution?: IntegrityForensicAttribution | null,
): Promise<IrontechDrillPersistenceResult> {
  try {
    const tid = threatId.trim();
    if (!tid) {
      console.log("[REMOTE SUPPORT SKIP] empty threatId");
      return { success: false, error: "Missing threat id." };
    }

    console.log(`[SCENARIO 4 START] Threat ${tid} - Remote Support Handoff`);

    const ctx = await resolveRemoteSupportDrillCtx(tid);
    if (!ctx) {
      return { success: false, error: "Threat not found." };
    }

    const operatorSnapshot = {
      operatorId: INTERNAL_DRILL_OPERATOR_ID,
      phase: "REMOTE_SUPPORT_DRILL",
    } satisfies Record<string, string>;

    let seq = 0;
    const attempts: IrontechLiveAttemptEntry[] = [];
    const nowIso = () => new Date().toISOString();

    await upsertRemoteSupportDrillAgentOp(ctx, tid, {
      status: AgentOperationStatus.PENDING,
      attemptCount: 1,
      snapshot: operatorSnapshot as Prisma.InputJsonValue,
    });
    await recordRemoteSupportWorkforceHandoff(
      ctx,
      tid,
      "IRONGATE",
      "[T0_DMZ_IRONGATE] Irongate (14) — sensing & sanitization",
    );

    seq += 1;
    await persistRemoteSupportLivePatch(
      ctx,
      tid,
      seq,
      "> [IRONTECH] Stage 1/4 — autonomous repair attempt",
      attempts,
    );
    await recordResilienceIntelStreamLine("> [IRONTECH] Stage 1/4 — auto-mitigation engaged", tid);

    console.log("[S4] Stage 1: Irontech autonomous repair failed. Complex fault detected...");
    await new Promise((r) => setTimeout(r, REMOTE_SUPPORT_STAGE_1_MS));

    attempts.push({
      attempt: 1,
      max: REMOTE_SUPPORT_ATTEMPT_MAX,
      error:
        "Autonomous repair failed — fault signature exceeds automated playbook; escalation required (simulated).",
      at: nowIso(),
    });
    seq += 1;
    await persistRemoteSupportLivePatch(
      ctx,
      tid,
      seq,
      "> [IRONTECH] Stage 1/4 — FAILED (complex internal fault)",
      attempts,
    );
    await updateRemoteSupportDrillAgentOp(ctx, tid, {
      status: AgentOperationStatus.RETRYING,
      attemptCount: 1,
      lastError: attempts[0]?.error ?? "Stage 1 failed",
    });
    await recordRemoteSupportWorkforceHandoff(
      ctx,
      tid,
      "IRONSCRIBE",
      "[T2_REGISTRATION_IRONSCRIBE] Ironscribe (5) — registration & policy mapping",
    );
    await recordResilienceIntelStreamLine("> [IRONLOCK] Quarantine assessment starting", tid);

    console.log(
      "[S4] Stage 2: Ironlock assessing. Hard quarantine deemed unsafe for platform stability...",
    );
    await new Promise((r) => setTimeout(r, REMOTE_SUPPORT_STAGE_2_MS));

    attempts.push({
      attempt: 2,
      max: REMOTE_SUPPORT_ATTEMPT_MAX,
      error:
        "Hard quarantine aborted — blast radius would destabilize shared control plane; human review mandated (simulated).",
      at: nowIso(),
    });
    seq += 1;
    await persistRemoteSupportLivePatch(
      ctx,
      tid,
      seq,
      "> [IRONLOCK] Stage 2/4 — FAILED (quarantine unsafe)",
      attempts,
    );
    await updateRemoteSupportDrillAgentOp(ctx, tid, {
      status: AgentOperationStatus.RETRYING,
      attemptCount: 2,
      lastError: attempts[1]?.error ?? "Stage 2 failed",
    });

    console.log(
      "[S4] Stage 3: Opening Secure Diagnostic Tunnel. Irontech/Ironlock deploying Transient Sidecar Agent for human diagnostics.",
    );
    attempts.push({
      attempt: 3,
      max: REMOTE_SUPPORT_ATTEMPT_MAX,
      error:
        "Sidecar — Secure diagnostic tunnel OPEN; Irontech/Ironlock deploying Transient Sidecar Agent for Tier-3 human forensics; awaiting JIT access grant (simulated).",
      at: nowIso(),
    });
    seq += 1;
    await persistRemoteSupportLivePatch(
      ctx,
      tid,
      seq,
      "> [IRONFRAME] Stage 3/4 — Opening Secure Diagnostic Tunnel. Irontech/Ironlock deploying Transient Sidecar Agent for human diagnostics.",
      attempts,
    );
    await recordResilienceIntelStreamLine(
      "> [IRONLOCK] Transient Sidecar pod scheduling — read-only forensic lane (drill)",
      tid,
    );
    await updateRemoteSupportDrillAgentOp(ctx, tid, {
      status: AgentOperationStatus.PENDING,
      attemptCount: 3,
      lastError: null,
      snapshot: {
        ...operatorSnapshot,
        transientSidecarDeployed: true,
        awaitingJitAccessGrant: true,
      } as Prisma.InputJsonValue,
    });
    await recordRemoteSupportWorkforceHandoff(
      ctx,
      tid,
      "IRONTECH",
      "[T4_REMEDIATION_IRONTECH] Irontech (11) — Sidecar tunnel; awaiting Tier-3 JIT grant",
    );

    console.log("[S4] Halting for Human Authorization...");
    const haltPatch: Record<string, Prisma.InputJsonValue> = {
      remoteSupportJitAwaitingGrant: true,
      ...(injectAttribution
        ? {
            chaosInjectAttribution: {
              userId: injectAttribution.userId,
              displayName: injectAttribution.displayName,
            } as unknown as Prisma.InputJsonValue,
          }
        : {}),
    };
    await applyRemoteSupportDrillStatus(
      ctx,
      tid,
      ThreatState.MITIGATED,
      "IRONTECH_REMOTE_SUPPORT_PENDING_GRANT",
      haltPatch,
    );
    revalidateDashboardAndIntegrityPath();

    console.log(`[S4 HALT] Threat ${tid} — awaiting JIT grant (no auto-resolve).`);
    return { success: true };
  } catch (error) {
    console.error(`[SCENARIO 4 CRASHED] Threat ${threatId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Scenario 4 resume — Stage 4 via JIT grant: Sidecar engineer session, 4s hotfix window, probe teardown, RESOLVED.
 */
export async function resumeIsolatedRemoteSupportDrill(
  threatId: string,
  attribution?: IntegrityForensicAttribution | null,
): Promise<IrontechDrillPersistenceResult> {
  try {
    const tid = threatId.trim();
    if (!tid) {
      console.log("[S4 RESUME SKIP] empty threatId");
      return { success: false, error: "Missing threat id." };
    }

    console.log(
      `[S4 RESUME] Threat ${tid} — Stage 4 Sidecar session; hotfix window ${REMOTE_SUPPORT_STAGE_4_MS}ms`,
    );

    const ctx = await resolveRemoteSupportDrillCtx(tid);
    if (!ctx) {
      return { success: false, error: "Threat not found." };
    }

    const ingestionRaw = await fetchRemoteSupportDrillIngestion(ctx, tid);
    const live = parseIrontechLiveFromIngestion(ingestionRaw);
    if (!live || live.attempts.length < 3) {
      console.error("[S4 RESUME] Missing irontechLive history after Sidecar halt; aborting.");
      throw new Error("Cannot resume remote support drill: missing live stream state.");
    }
    const attempts: IrontechLiveAttemptEntry[] = live.attempts.map((a) => ({ ...a }));
    let seq = live.streamSeq;
    const nowIso = () => new Date().toISOString();
    const operatorSnapshot = {
      operatorId: INTERNAL_DRILL_OPERATOR_ID,
      phase: "REMOTE_SUPPORT_DRILL",
    } satisfies Record<string, string>;

    const stage4Line =
      "> [IRONFRAME] Stage 4/4 — Human engineer connected via Sidecar. Pushing hotfix… Deleting Sidecar forensic probe.";
    seq += 1;
    await persistRemoteSupportLivePatch(ctx, tid, seq, stage4Line, attempts);
    await recordResilienceIntelStreamLine(stage4Line, tid);
    await updateRemoteSupportDrillAgentOp(ctx, tid, {
      status: AgentOperationStatus.PENDING,
      attemptCount: 3,
      lastError: null,
      snapshot: {
        ...operatorSnapshot,
        jitGrantReceivedAt: new Date().toISOString(),
        sidecarEngineerSession: true,
      } as Prisma.InputJsonValue,
    });

    await new Promise((r) => setTimeout(r, REMOTE_SUPPORT_STAGE_4_MS));

    attempts.push({
      attempt: 4,
      max: REMOTE_SUPPORT_ATTEMPT_MAX,
      error:
        "Sidecar session COMPLETE — hotfix deployed; Transient Sidecar forensic probe DELETED; diagnostic tunnel collapsed; platform stable (simulated).",
      at: nowIso(),
    });
    seq += 1;
    await persistRemoteSupportLivePatch(
      ctx,
      tid,
      seq,
      "> [IRONFRAME] Stage 4/4 — HOTFIX APPLIED — SIDECAR PROBE DELETED — TUNNEL CLOSED",
      attempts,
    );
    await updateRemoteSupportDrillAgentOp(ctx, tid, {
      status: AgentOperationStatus.COMPLETED,
      attemptCount: 4,
      lastError: null,
      snapshot: {
        ...operatorSnapshot,
        sidecarTornDownAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    });
    await recordResilienceIntelStreamLine(
      "> [IRONFRAME] Stage 4/4 — Sidecar teardown ACK — drill complete",
      tid,
    );

    console.log("[S4] Resolving DB...");
    const createdAt = await fetchRemoteSupportDrillCreatedAt(ctx, tid);
    const recoveredAt = new Date().toISOString();
    const forensic = await integrityForensicIngestionFields(recoveredAt, attribution);
    const resolvePatch: Record<string, Prisma.InputJsonValue> = {
      ...forensic,
      ...chaosIntegrityLedgerPatch("REMOTE_SUPPORT", createdAt, recoveredAt),
      remoteSupportJitAwaitingGrant: false,
      chaosRemoteAccessGrantedAt: recoveredAt,
      resolutionJustification:
        "[SIDECAR DRILL COMPLETE] Transient forensic Sidecar removed after hotfix; diagnostic tunnel closed; integrity verified (simulated).",
      lifecycleState: "archived",
      autonomousRecovery: true,
      autonomousRecoveredAt: recoveredAt,
      ironsightBypassed: true,
    };
    await applyRemoteSupportDrillStatus(
      ctx,
      tid,
      ThreatState.RESOLVED,
      "IRONTECH_SCENARIO_REMOTE_SUPPORT_RESOLVED",
      resolvePatch,
      {
        prod: { assigneeId: null },
        shadow: { assigneeId: null },
      },
    );
    await recordRemoteSupportSystemHandoff(
      ctx,
      tid,
      `[${CHAOS_DIRECTIVE.T12_SYSTEM_CONCLUSION}] Sidecar hotfix complete — System/Observer concurrence & purge`,
    );
    if (ctx.plane === "shadow") {
      await logThreatActivity(null, "STATUS_UPDATED", JSON.stringify({
        supervisoryAuthority: INTERNAL_DRILL_OPERATOR_ID,
        executingAgent: INTERNAL_DRILL_AGENT,
        integrityEventType: "IRONTECH_SCENARIO_REMOTE_SUPPORT_RESOLVED",
        source: "IRONTECH_AUTONOMOUS_RESOLUTION",
      }), {
        operatorId: INTERNAL_DRILL_OPERATOR_ID,
        simThreatId: tid,
        isSimulation: true,
      });
    } else {
      await logAutonomousDrillResolutionAudit(tid, "IRONTECH_SCENARIO_REMOTE_SUPPORT_RESOLVED");
    }
    revalidateDashboardAndIntegrityPath();

    console.log(`[SCENARIO 4 SUCCESS] Threat ${tid} is Green.`);
    return { success: true };
  } catch (error) {
    console.error(`[S4 RESUME CRASHED] Threat ${threatId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Scenario 5 (Cascading failure) — 4-stage collapse (2s+2s+3s+3s=10s) → DMZ sever + LKG workforce rebirth → RESOLVED.
 * `attribution` supplies `userId` / `displayName` written into `ingestionDetails` on resolve and on the append-only
 * `ThreatEvent.create` ledger snapshot (`userId`, `integrityAuthorizedUserId`, etc.).
 */
export async function runIsolatedCascadeDrill(
  threatId: string,
  attribution?: IntegrityForensicAttribution | null,
): Promise<IrontechDrillPersistenceResult> {
  try {
    const tid = threatId.trim();
    if (!tid) {
      console.log("[SCENARIO 5 SKIP] empty threatId");
      return { success: false, error: "Missing threat id." };
    }

    console.log(`[SCENARIO 5 START] Threat ${tid} - CASCADING FAILURE DETECTED`);

    const operatorSnapshot = {
      operatorId: INTERNAL_DRILL_OPERATOR_ID,
      phase: "CASCADING_FAILURE_DRILL",
    } satisfies Record<string, string>;

    let seq = 0;
    const attempts: IrontechLiveAttemptEntry[] = [];
    const nowIso = () => new Date().toISOString();

    await prisma.agentOperation.upsert({
      where: { threatId_agentName: { threatId: tid, agentName: INTERNAL_DRILL_AGENT } },
      create: {
        threatId: tid,
        agentName: INTERNAL_DRILL_AGENT,
        status: AgentOperationStatus.PENDING,
        attemptCount: 1,
        snapshot: operatorSnapshot as Prisma.InputJsonValue,
      },
      update: {
        status: AgentOperationStatus.PENDING,
        attemptCount: 1,
        lastError: null,
        snapshot: operatorSnapshot as Prisma.InputJsonValue,
      },
    });

    seq += 1;
    await persistIrontechLivePatch(
      tid,
      seq,
      "> [IRONCORE] Stage 1/4 — orchestrator polling primary mesh; telemetry bus nominal",
      attempts,
    );
    await recordResilienceIntelStreamLine(
      "> [IRONCAST] Mesh supervisor — heartbeat watchdog armed (cascade drill)",
      tid,
    );

    console.log(
      "[S5] Stage 1: Primary node offline. Ironcore orchestrator dropping telemetry...",
    );
    await new Promise((r) => setTimeout(r, CASCADE_DRILL_STAGE_1_MS));

    attempts.push({
      attempt: 1,
      max: CASCADE_ATTEMPT_MAX,
      error:
        "CRITICAL — Primary mesh node OFFLINE; Ironcore orchestrator dropping telemetry; east-west consensus heartbeats FLATLINED; edge reroute saturated (simulated).",
      at: nowIso(),
    });
    seq += 1;
    await persistIrontechLivePatch(
      tid,
      seq,
      "> [IRONCORE] Stage 1/4 — FAILED: NODE LOST — telemetry storm collapsing",
      attempts,
    );
    await prisma.agentOperation.update({
      where: { threatId_agentName: { threatId: tid, agentName: INTERNAL_DRILL_AGENT } },
      data: {
        status: AgentOperationStatus.RETRYING,
        attemptCount: 1,
        lastError: attempts[0]?.error ?? "Stage 1 failed",
      },
    });
    await recordResilienceIntelStreamLine(
      "> [GRIDCORE] ALERT — shard load vectors spiking; lateral movement suspected",
      tid,
    );

    console.log(
      "[S5] Stage 2: Lateral spread detected. 19-Agent Workforce destabilizing. Capacity 99%.",
    );
    await new Promise((r) => setTimeout(r, CASCADE_DRILL_STAGE_2_MS));

    attempts.push({
      attempt: 2,
      max: CASCADE_ATTEMPT_MAX,
      error:
        "CRITICAL — Lateral spread; 19-Agent WORKFORCE destabilizing; orchestration mesh desync; capacity 99%; memory + DB pool collapse imminent (simulated).",
      at: nowIso(),
    });
    seq += 1;
    await persistIrontechLivePatch(
      tid,
      seq,
      "> [GRIDCORE] Stage 2/4 — 19-AGENT WORKFORCE UNSTABLE — CAPACITY 99% — CASCADE ACCELERATING",
      attempts,
    );
    await prisma.agentOperation.update({
      where: { threatId_agentName: { threatId: tid, agentName: INTERNAL_DRILL_AGENT } },
      data: {
        status: AgentOperationStatus.RETRYING,
        attemptCount: 2,
        lastError: attempts[1]?.error ?? "Stage 2 failed",
      },
    });
    await recordResilienceIntelStreamLine(
      "> [IRONGATE] WATCH COMMAND — terminal cascade threshold ARMED",
      tid,
    );

    console.log(
      "[S5] Stage 3: TERMINAL CASCADE IMMINENT. Irongate triggering mandatory DMZ Sever. Tenant Isolated.",
    );
    await new Promise((r) => setTimeout(r, CASCADE_DRILL_STAGE_3_MS));

    attempts.push({
      attempt: 3,
      max: CASCADE_ATTEMPT_MAX,
      error:
        "ACTION — TERMINAL CASCADE IMMINENT; Irongate MANDATORY DMZ SEVER; tenant ISOLATED; east-west amputation IN PROGRESS (simulated).",
      at: nowIso(),
    });
    seq += 1;
    await persistIrontechLivePatch(
      tid,
      seq,
      "> [IRONGATE] Stage 3/4 — MANDATORY DMZ SEVER — TENANT ISOLATED — BLADES CLOSING",
      attempts,
    );
    await prisma.agentOperation.update({
      where: { threatId_agentName: { threatId: tid, agentName: INTERNAL_DRILL_AGENT } },
      data: {
        status: AgentOperationStatus.PENDING,
        attemptCount: 3,
        lastError: null,
        snapshot: {
          ...operatorSnapshot,
          dmzSeverInProgressAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
    await recordResilienceIntelStreamLine(
      "> [IRONGATE] DMZ sever lane ACTIVE — tenant boundary isolating",
      tid,
    );

    // Dynamic import keeps `node:fs` / `node:path` off the graph for isomorphic imports of this module.
    const fsMod = await import("node:fs");
    const pathMod = await import("node:path");
    const lkgLocalFallback = pathMod.join(process.cwd(), ...LKG_LOCAL_MANIFEST_REL);
    let lkgAttestationIroncoreSha256: string | undefined;

    const tryReadLkgWithReadFileSync = (p: string): string | null => {
      try {
        if (!fsMod.existsSync(p)) {
          return null;
        }
        const st = fsMod.statSync(p);
        if (!st.isFile()) {
          return null;
        }
        return fsMod.readFileSync(p, "utf8");
      } catch (e) {
        const err = e as NodeJS.ErrnoException;
        if (
          err?.code === "EISDIR" ||
          err?.code === "EACCES" ||
          err?.code === "ENOENT" ||
          err?.code === "EPERM" ||
          err?.code === "UNKNOWN"
        ) {
          return null;
        }
        return null;
      }
    };

    const manifestTxt: string | null = tryReadLkgWithReadFileSync(lkgLocalFallback);

    if (manifestTxt == null) {
      console.error(
        "[S5] GRC CRITICAL: No LKG manifest at ./storage/manifest/lkg_signatures.json. Rebirth Failed.",
      );
      return { success: false, error: "Vault Offline" };
    }

    try {
      console.log("[S5] GRC ATTESTATION: LKG from local storage (./storage/manifest/).");
      const manifest = JSON.parse(manifestTxt) as {
        agents?: Array<{ name?: string; sha256?: string }>;
      };
      const ironcoreEntry = manifest.agents?.find(
        (a) => (a.name ?? "").toLowerCase() === "ironcore",
      );
      if (typeof ironcoreEntry?.sha256 === "string" && ironcoreEntry.sha256.trim()) {
        lkgAttestationIroncoreSha256 = ironcoreEntry.sha256.trim();
      }
    } catch {
      // JSON parse error — rebirth continues; UI omits checksum
    }
    await recordResilienceIntelStreamLine(
      "> [GRC] LKG attestation manifest present — verify window (G: or local notary path)",
      tid,
    );
    await new Promise((r) => setTimeout(r, LKG_VAULT_VERIFY_SIM_MS));

    console.log(
      "[S5] Stage 4: Lockdown confirmed. Irontech executing total Workforce Rebirth from LKG Gold Images. Restoring all 19 agents to verified state.",
    );
    await new Promise((r) => setTimeout(r, CASCADE_DRILL_STAGE_4_MS));

    attempts.push({
      attempt: 4,
      max: CASCADE_ATTEMPT_MAX,
      error:
        "COMPLETED — Lockdown confirmed; Restoring from LKG Gold Images — Irontech rebirthing full 19-agent workforce to verified state via Irongate DMZ bypass lane (simulated).",
      at: nowIso(),
    });
    seq += 1;
    await persistIrontechLivePatch(
      tid,
      seq,
      "> [IRONTECH] Stage 4/4 — WORKFORCE REBIRTH — Restoring from LKG Gold Images — all 19 agents to verified state",
      attempts,
    );
    await prisma.agentOperation.update({
      where: { threatId_agentName: { threatId: tid, agentName: INTERNAL_DRILL_AGENT } },
      data: {
        status: AgentOperationStatus.COMPLETED,
        attemptCount: 4,
        lastError: null,
        snapshot: {
          ...operatorSnapshot,
          workforceRebornFromLkgAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
    await recordResilienceIntelStreamLine(
      "> [IRONTECH] Stage 4/4 — LKG rebirth ACK — workforce signature matches gold images",
      tid,
    );

    console.log("[S5] Resolving DB — workforce reborn from LKG...");
    const row = await prisma.threatEvent.findUnique({
      where: { id: tid },
      select: {
        ingestionDetails: true,
        createdAt: true,
        tenantCompanyId: true,
        score: true,
        targetEntity: true,
        sourceAgent: true,
        financialRisk_cents: true,
      },
    });
    if (!row) {
      console.error(`[S5] Threat ${tid} not found; cannot resolve.`);
      return { success: false, error: "Operational threat row not found for cascade resolve." };
    }
    const recoveredAt = new Date().toISOString();
    const forensic = await integrityForensicIngestionFields(recoveredAt, attribution);
    const ledgerTitle = `Scenario 5: Cascading Failure Rebirth — ${recoveredAt}`;
    const chaosLedger = chaosIntegrityLedgerPatch("CASCADING_FAILURE", row.createdAt, recoveredAt);
    const attestationHash = lkgAttestationIroncoreSha256?.trim() ?? null;
    const recoverySec = chaosLedger.integrityLedgerRecoverySeconds;

    /** Append-only Integrity Hub row: new PK every run (operational card still updated below). */
    const ledgerIngestionPayload: Record<string, Prisma.InputJsonValue> = {
      ...forensic,
      ...chaosLedger,
      integrityHubLedgerEntry: true,
      sourceChaosThreatId: tid,
      resolutionJustification:
        "SYSTEM REBORN: Cascading failure halted. Full workforce restored from LKG snapshots via Irongate DMZ bypass.",
      cascadeResolutionKind: "LKG_WORKFORCE_REBIRTH",
      cascadeNotRepairedState: false,
      lifecycleState: "archived",
      autonomousRecovery: true,
      autonomousRecoveredAt: recoveredAt,
      ironsightBypassed: true,
      ...(attestationHash ? { lkgAttestationIroncoreSha256: attestationHash, attestationHash } : {}),
      recoveryTimeSeconds: recoverySec,
      recoveryTimeFormatted: `${recoverySec.toFixed(1)}s`,
    };

    const merged = mergeIngestionDetailsPatch(row.ingestionDetails ?? null, {
      ...forensic,
      ...chaosLedger,
      resolutionJustification:
        "SYSTEM REBORN: Cascading failure halted. Full workforce restored from LKG snapshots via Irongate DMZ bypass.",
      cascadeResolutionKind: "LKG_WORKFORCE_REBIRTH",
      cascadeNotRepairedState: false,
      lifecycleState: "archived",
      autonomousRecovery: true,
      autonomousRecoveredAt: recoveredAt,
      ironsightBypassed: true,
      ...(attestationHash ? { lkgAttestationIroncoreSha256: attestationHash } : {}),
    });

    let newLedgerRow: { id: string };
    try {
      const created = await prisma.$transaction(async (tx) => {
        const createdRow = await tx.threatEvent.create({
          data: {
            title: ledgerTitle,
            sourceAgent: row.sourceAgent?.trim() || "IRONCHAOS_LEDGER",
            score: row.score,
            targetEntity: row.targetEntity,
            financialRisk_cents: row.financialRisk_cents,
            tenantCompanyId: row.tenantCompanyId,
            status: ThreatState.RESOLVED,
            assigneeId: INTERNAL_DRILL_OPERATOR_ID,
            /** Triage SLA metadata only — no app job deletes ThreatEvent by TTL. */
            ttlSeconds: 259200,
            aiReport: "IRONCHAOS: Scenario 5 immutable ledger append (resolved).",
            ingestionDetails: JSON.stringify(ledgerIngestionPayload),
          },
        });
        await transitionThreatStatus({
          threatId: tid,
          newStatus: ThreatState.RESOLVED,
          actorUserId: INTERNAL_DRILL_OPERATOR_ID,
          eventType: "IRONTECH_SCENARIO_CASCADE_RESOLVED",
          extraChanges: {
            ingestionDetails: merged,
            assigneeId: INTERNAL_DRILL_OPERATOR_ID,
          },
          tx,
        });
        return createdRow;
      });
      newLedgerRow = created;
    } catch (error) {
      console.error("GRC PERSISTENCE ERROR:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    if (!newLedgerRow?.id) {
      return { success: false, error: "Ledger append did not return a row id." };
    }

    await logAutonomousDrillResolutionAudit(tid, "IRONTECH_SCENARIO_CASCADE_RESOLVED");
    revalidateDashboardAndIntegrityPath();

    console.log(`[SCENARIO 5 SUCCESS] Threat ${tid} — workforce reborn from LKG.`);
    return { success: true, recordId: newLedgerRow.id };
  } catch (error) {
    console.error(`[SCENARIO 5 CRASHED] Threat ${threatId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function saveCheckpoint(
  agentId: string,
  threatId: string,
  state: unknown,
): Promise<void> {
  const tid = threatId.trim();
  const agent = agentId.trim();
  if (!tid || !agent) return;
  const payload: Prisma.InputJsonValue = {
    preExecution: state as Prisma.InputJsonValue,
    savedAt: new Date().toISOString(),
  };
  await prisma.agentOperation.upsert({
    where: { threatId_agentName: { threatId: tid, agentName: agent } },
    create: {
      threatId: tid,
      agentName: agent,
      status: AgentOperationStatus.PENDING,
      attemptCount: 0,
      snapshot: payload,
    },
    update: { snapshot: payload },
  });
}

/**
 * Minimal retry harness for manual mitigation (e.g. fourth attempt with `maxAttempts: 1`).
 */
export async function executeWithRetry(
  agentName: string,
  threatId: string,
  actionFn: () => Promise<void>,
  options?: ExecuteWithRetryOptions,
): Promise<ExecuteWithRetryResult> {
  const agent = agentName.trim();
  const tid = threatId.trim();
  if (!agent || !tid) {
    return { ok: false, completed: false, error: "Missing agentName or threatId." };
  }

  const maxAttempts = options?.maxAttempts ?? 3;

  await prisma.agentOperation.upsert({
    where: { threatId_agentName: { threatId: tid, agentName: agent } },
    create: {
      threatId: tid,
      agentName: agent,
      status: AgentOperationStatus.PENDING,
      attemptCount: 0,
    },
    update: {},
  });

  const chaosTagged =
    options?.bypassChaosTestTag ? false : await threatIsChaosTest(tid);
  if (chaosTagged) {
    await poisonAgentOperationWithChaos(tid, agent, 1);
    return { ok: false, escalated: true, error: "CHAOS_INTERRUPTED" };
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await actionFn();
      await prisma.agentOperation.update({
        where: { threatId_agentName: { threatId: tid, agentName: agent } },
        data: {
          status: AgentOperationStatus.COMPLETED,
          attemptCount: attempt,
          lastError: null,
        },
      });
      const teRow = await prisma.threatEvent.findUnique({
        where: { id: tid },
        select: { ingestionDetails: true, createdAt: true },
      });
      const recoveredAt = new Date().toISOString();
      const forensic = await integrityForensicIngestionFields(recoveredAt);
      let chaosLedgerExtra: Record<string, Prisma.InputJsonValue> = {};
      if (teRow?.createdAt && teRow.ingestionDetails) {
        try {
          const rec = JSON.parse(teRow.ingestionDetails) as { chaosScenario?: string };
          const scen = typeof rec.chaosScenario === "string" ? rec.chaosScenario.trim().toUpperCase() : "";
          if (
            scen === "INTERNAL" ||
            scen === "HOME_SERVER" ||
            scen === "CLOUD_EXFIL" ||
            scen === "REMOTE_SUPPORT" ||
            scen === "CASCADING_FAILURE"
          ) {
            chaosLedgerExtra = chaosIntegrityLedgerPatch(
              scen as ChaosScenarioIntegrityCode,
              teRow.createdAt,
              recoveredAt,
            ) as unknown as Record<string, Prisma.InputJsonValue>;
          }
        } catch {
          /* non-JSON ingestion — skip chaos ledger fields */
        }
      }
      const merged = mergeIngestionDetailsPatch(teRow?.ingestionDetails ?? null, {
        ...forensic,
        ...chaosLedgerExtra,
        resolutionJustification:
          "[IRONTECH AUTONOMOUS RECOVERY] - System integrity verified and restored via automated patch. No human intervention required.",
        lifecycleState: "archived",
        autonomousRecovery: true,
        autonomousRecoveredAt: recoveredAt,
      });
      await transitionThreatStatus({
        threatId: tid,
        newStatus: ThreatState.RESOLVED,
        actorUserId: agent,
        eventType: "IRONTECH_RETRY_EXECUTION_RESOLVED",
        extraChanges: { ingestionDetails: merged },
      });
      await logAutonomousDrillResolutionAudit(tid, "IRONTECH_RETRY_EXECUTION_RESOLVED", agent);
      revalidateDashboardAndIntegrityPath();
      try {
        const ironbloomSustainability = await recordSustainabilityImpact(tid);
        if (!ironbloomSustainability.ok) console.warn("[Irontech] Ironbloom sustainability hook skipped:", ironbloomSustainability);
      } catch {
        /* non-fatal */
      }
      return { ok: true, completed: true };
    } catch (e) {
      const lastError = e instanceof Error ? e.message : String(e);
      if (attempt < maxAttempts) {
        await prisma.agentOperation.update({
          where: { threatId_agentName: { threatId: tid, agentName: agent } },
          data: {
            status: AgentOperationStatus.RETRYING,
            attemptCount: attempt,
            lastError,
          },
        });
        continue;
      }
      await prisma.agentOperation.update({
        where: { threatId_agentName: { threatId: tid, agentName: agent } },
        data: {
          status: AgentOperationStatus.FAILED,
          attemptCount: attempt,
          lastError,
        },
      });
      await prisma.threatEvent
        .update({ where: { id: tid }, data: { status: ThreatState.MITIGATED } })
        .catch(() => {});
      return { ok: false, escalated: true, error: lastError };
    }
  }
  return { ok: false, completed: false, error: "Retry exhausted." };
}
