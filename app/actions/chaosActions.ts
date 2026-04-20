"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ThreatState } from "@prisma/client";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { resolveIntegrityLedgerAuthorizedLabel } from "@/app/utils/serverAuth";
import type { ChaosClientAttribution } from "@/app/utils/chaosClientAttribution";
import { readSimulationPlaneEnabled } from "@/app/lib/security/ingressGateway";
import { getCompanyIdForActiveTenant } from "@/app/lib/grc/clearanceThreatResolve";
import { mergeIngestionDetailsPatch, parseIngestionDetailsForMerge } from "@/app/utils/ingestionDetailsMerge";
import {
  resumeIsolatedRemoteSupportDrill,
  runIsolatedCascadeDrill,
  runIsolatedEscalationDrill,
  runIsolatedHomeServerDrill,
  runIsolatedInternalDrill,
  runIsolatedRemoteSupportDrill,
  type IntegrityForensicAttribution,
} from "@/app/utils/irontechResilience";
import { ATTACK_SOURCE, ATTACK_THREAT_TITLE_PREFIX } from "@/app/config/agents";
import { CHAOS_ASSIGNEE_IRONGATE_14 } from "@/app/config/chaosShadowAudit";

/** Human-triggered chaos: prefer client-captured Supabase / cookie id; else same-request server session. */
async function resolveChaosInjectAttribution(
  client: ChaosClientAttribution | null | undefined,
): Promise<IntegrityForensicAttribution> {
  if (client?.userId?.trim()) {
    const uid = client.userId.trim();
    return {
      userId: uid,
      displayName: client.displayName?.trim() || uid,
    };
  }
  return resolveIntegrityLedgerAuthorizedLabel();
}

const GLOBAL_ID = "global";
export type ChaosScenario =
  | "INTERNAL"
  | "HOME_SERVER"
  | "REMOTE_SUPPORT"
  | "CASCADING_FAILURE"
  | "CLOUD_EXFIL";

function normalizeScenario(scenario: ChaosScenario): ChaosScenario {
  if (
    scenario === "INTERNAL" ||
    scenario === "HOME_SERVER" ||
    scenario === "REMOTE_SUPPORT" ||
    scenario === "CASCADING_FAILURE" ||
    scenario === "CLOUD_EXFIL"
  ) {
    return scenario;
  }
  return "INTERNAL";
}

/** GRC panel reads `ingestionDetails.grcJustification` (no top-level `justification` on ThreatEvent). */
function chaosDrillGrcJustificationForScenario(scenario: ChaosScenario): string {
  if (scenario === "HOME_SERVER") {
    return "SYSTEM TEST: Home Server Chaos Drill. Validating Irontech multi-attempt remote recovery.";
  }
  if (scenario === "CLOUD_EXFIL") {
    return "SYSTEM TEST: Cloud Exfiltration Drill. Validating Ironlock hard quarantine and escalation.";
  }
  if (scenario === "REMOTE_SUPPORT") {
    return "SYSTEM TEST: Remote Support Drill. Validating secure diagnostic tunnel hand-off for complex internal faults.";
  }
  if (scenario === "CASCADING_FAILURE") {
    return "SYSTEM TEST: Cascading Failure Drill. Validating Irongate lockdown and Ironcast mass alerting.";
  }
  return "SYSTEM TEST: Internal Chaos Drill. Validating Irontech autonomous recovery.";
}

const CENTS_PER_MILLION = 100_000_000;

/** Serializable pipeline card for `useRiskStore.getState().upsertPipelineThreat` (Attack Velocity until Acknowledge). */
export type ChaosPipelineThreatPayload = {
  id: string;
  name: string;
  loss: number;
  score: number;
  industry?: string;
  source?: string;
  description?: string;
  createdAt?: string;
  threatStatus?: string;
  lifecycleState?: "pipeline" | "active" | "confirmed" | "resolved";
  assigneeId?: string;
  ingestionDetails?: string;
  aiReport?: string | null;
};

const CHAOS_CARD_TITLE_MAX_LEN = 240;

/** Primary header for Attack Velocity — exact dropdown label when provided by the client. */
function resolveChaosCardTitle(
  scenario: ChaosScenario,
  scenarioDisplayLabel: string | null | undefined,
): string {
  const trimmed = (scenarioDisplayLabel ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, CHAOS_CARD_TITLE_MAX_LEN);
  if (trimmed.length > 0) {
    return trimmed;
  }
  return `${ATTACK_THREAT_TITLE_PREFIX} Poisoned Chaos Threat — Irontech resilience drill`;
}

/** Final row fields applied after immediate draft create (same semantics as former `createChaosThreatBase`). */
function chaosThreatFinalizeData(
  tenantCompanyId: bigint,
  scenario: ChaosScenario,
  cardTitle: string,
) {
  const scenarioNorm = normalizeScenario(scenario);
  const ingestionDetails = JSON.stringify({
    isChaosTest: true,
    chaosScenario: scenarioNorm,
    chaosScenarioDisplayLabel: cardTitle,
    grcJustification: chaosDrillGrcJustificationForScenario(scenarioNorm),
    /** TAS §2 Level-2 DMZ: all chaos ingress attributed to Irongate (Agent 14) at create. */
    dmzIrongateIngress: {
      agentId: CHAOS_ASSIGNEE_IRONGATE_14,
      routedAt: new Date().toISOString(),
      sanitized: true,
    },
    /** Persisted terminal lines; appended by `applyChaosShadowDrillTelemetryStepAction`. */
    chaosShadowAuditLog: [],
    /** GRC agent handoff chain (timestamp, assignee, directive) per 4s transition. */
    chaosAssigneeHandoffHistory: [],
  });
  return {
    tenantCompanyId,
    status: ThreatState.PIPELINE,
    sourceAgent: ATTACK_SOURCE,
    score: 10,
    title: cardTitle,
    targetEntity: "ChaosLab",
    financialRisk_cents: 0n,
    ttlSeconds: 259200,
    /** Birth owner: Irongate (Agent 14) — DMZ sanitization lane. */
    assigneeId: CHAOS_ASSIGNEE_IRONGATE_14,
    ingestionDetails,
    aiReport: "ATTACK_BOT: Controlled chaos ingress (Irontech resilience drill).",
  } as const;
}

function mapThreatRowToChaosPipelinePayload(row: {
  id: string;
  title: string;
  sourceAgent: string;
  score: number;
  targetEntity: string;
  financialRisk_cents: bigint;
  createdAt: Date;
  status: ThreatState;
  ingestionDetails: string | null;
  aiReport: string | null;
  assigneeId: string | null;
}): ChaosPipelineThreatPayload {
  const onActiveBoard =
    row.status === ThreatState.ACTIVE ||
    row.status === ThreatState.CONFIRMED ||
    row.status === ThreatState.ESCALATED ||
    row.status === ThreatState.PENDING_REMOTE_INTERVENTION;
  return {
    id: row.id,
    name: row.title,
    loss: Number(row.financialRisk_cents) / CENTS_PER_MILLION,
    score: row.score,
    industry: row.targetEntity,
    source: row.sourceAgent,
    description:
      "ATTACK_BOT: Controlled chaos ingress. Monitoring Irontech Retry-3 and Phone Home.",
    createdAt: row.createdAt.toISOString(),
    threatStatus: row.status,
    lifecycleState: onActiveBoard ? "active" : "pipeline",
    assigneeId: row.assigneeId ?? undefined,
    ingestionDetails: row.ingestionDetails ?? undefined,
    aiReport: row.aiReport,
  };
}

export async function getChaosConfig() {
  return prisma.chaosConfig.upsert({
    where: { id: GLOBAL_ID },
    create: {
      id: GLOBAL_ID,
      isActive: false,
      failureRate: 0.35,
    },
    update: {},
  });
}

export async function setIronchaosActive(isActive: boolean) {
  await prisma.chaosConfig.upsert({
    where: { id: GLOBAL_ID },
    create: {
      id: GLOBAL_ID,
      isActive,
      failureRate: 0.35,
    },
    update: { isActive },
  });
  revalidatePath("/");
  return { success: true as const, isActive };
}

export type InjectChaosThreatOptions = {
  /**
   * When true (default), skip server-side Irontech resilience drills so the row stays in a client-orchestrated
   * shadow audit + acknowledge path. Set false to restore legacy drill auto-resolution.
   */
  skipIsolatedDrill?: boolean;
};

export async function injectChaosThreatAction(
  scenario: ChaosScenario = "INTERNAL",
  clientAttribution?: ChaosClientAttribution | null,
  /** Exact `<option>` label from the Control Room dropdown (ThreatEvent / SimThreatEvent title + pipeline header). */
  scenarioDisplayLabel?: string | null,
  options?: InjectChaosThreatOptions,
): Promise<
  | { ok: true; threatId: string; tenantCompanyId: string; pipelineThreat: ChaosPipelineThreatPayload }
  | { ok: false; error: string }
> {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) {
    return { ok: false, error: "No active tenant." };
  }

  const scenarioNorm = normalizeScenario(scenario);
  const cardTitle = resolveChaosCardTitle(scenarioNorm, scenarioDisplayLabel);
  const skipIsolatedDrill = options?.skipIsolatedDrill !== false;

  try {
    let company = await prisma.company.findFirst({
      where: { tenantId },
    });

    if (!company) {
      await prisma.tenant.upsert({
        where: { id: tenantId },
        create: {
          id: tenantId,
          name: "Ironchaos Bootstrap Tenant",
          slug: `chaos-${tenantId}`,
          industry: "Secure Enclave",
        },
        update: {},
      });
      company = await prisma.company.create({
        data: {
          name: "Chaos Lab Co",
          sector: "Technology",
          tenantId,
          isTestRecord: true,
        },
      });
    }

    const finalize = chaosThreatFinalizeData(company.id, scenarioNorm, cardTitle);
    const isSim = await readSimulationPlaneEnabled();

    const draft = isSim
      ? await prisma.simThreatEvent.create({
          data: finalize,
          select: { id: true },
        })
      : await prisma.threatEvent.create({
          data: finalize,
          select: { id: true },
        });

    const threatId = draft.id;

    if (!skipIsolatedDrill) {
      const ledgerAttribution = await resolveChaosInjectAttribution(clientAttribution);
      let drillResult;
      if (scenarioNorm === "INTERNAL") {
        drillResult = await runIsolatedInternalDrill(threatId, ledgerAttribution);
      } else if (scenarioNorm === "HOME_SERVER") {
        drillResult = await runIsolatedHomeServerDrill(threatId, ledgerAttribution);
      } else if (scenarioNorm === "CLOUD_EXFIL") {
        drillResult = await runIsolatedEscalationDrill(threatId, ledgerAttribution);
      } else if (scenarioNorm === "REMOTE_SUPPORT") {
        drillResult = await runIsolatedRemoteSupportDrill(threatId, ledgerAttribution);
      } else if (scenarioNorm === "CASCADING_FAILURE") {
        drillResult = await runIsolatedCascadeDrill(threatId, ledgerAttribution);
      } else {
        drillResult = await runIsolatedInternalDrill(threatId, ledgerAttribution);
      }

      if (!drillResult.success) {
        return { ok: false, error: drillResult.error };
      }
    }

    revalidatePath("/", "layout");
    revalidatePath("/admin/clearance");
    revalidatePath("/integrity");

    const rowSelect = {
      id: true,
      title: true,
      sourceAgent: true,
      score: true,
      targetEntity: true,
      financialRisk_cents: true,
      createdAt: true,
      status: true,
      ingestionDetails: true,
      aiReport: true,
      assigneeId: true,
    } as const;

    const row = isSim
      ? await prisma.simThreatEvent.findUnique({
          where: { id: threatId },
          select: rowSelect,
        })
      : await prisma.threatEvent.findUnique({
          where: { id: threatId },
          select: rowSelect,
        });
    if (!row) {
      return { ok: false, error: "Threat row missing after chaos inject." };
    }

    return {
      ok: true,
      threatId,
      tenantCompanyId: company.id.toString(),
      pipelineThreat: mapThreatRowToChaosPipelinePayload(row),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/** Optional shell-style `>` then bracketed agent tag (matches historical `irontechResilience` stream lines). */
const CHAOS_AUDIT_LINE_PREFIX =
  /^(?:>\s*)?\[(IRONGATE|IRONTECH|SYSTEM|IRONLOCK|IRONFRAME|IRONCORE|GRIDCORE|IRONCAST|GRC)\]/;
const CHAOS_AUDIT_LINE_MAX = 1600;

/** Phases for persisted `chaosAssigneeHandoffHistory` (supervised telemetry). */
export type ChaosDrillTelemetryPhase =
  | "T0_DMZ_IRONGATE"
  | "T4_ANALYSIS_IRONTECH"
  | "T8_OBSERVATION_IRONTECH"
  | "T12_RESOLUTION_SYSTEM";

export type ChaosShadowDrillTelemetryStep = {
  terminalLine: string;
  /** Default amber; analysis line uses white per PO. */
  terminalTone?: "amber" | "white";
  phase: ChaosDrillTelemetryPhase;
  /** Persisted `assigneeId` on ThreatEvent / SimThreatEvent (tenant-scoped row). */
  assigneeId: string;
  assigneeLabel: string;
  directiveId: string;
  /** When true, sets `chaosObserverConcurrenceVerifiedAt` on the row JSON (GRC). */
  recordObserverConcurrenceVerified?: boolean;
};

/**
 * Single tenant-isolated transition: terminal line + assignee handoff + row assignee.
 * Uses `getCompanyIdForActiveTenant()` — no cross-tenant writes.
 */
export async function applyChaosShadowDrillTelemetryStepAction(
  threatId: string,
  step: ChaosShadowDrillTelemetryStep,
): Promise<
  | { ok: true; ingestionDetails: string }
  | { ok: false; error: string }
> {
  const id = threatId?.trim();
  if (!id) {
    return { ok: false, error: "Missing threat id." };
  }

  const trimmed = step.terminalLine.trim().replace(/\r?\n/g, " ");
  if (!trimmed) {
    return { ok: false, error: "Empty audit line." };
  }
  if (trimmed.length > CHAOS_AUDIT_LINE_MAX) {
    return { ok: false, error: "Audit line exceeds maximum length." };
  }
  if (!CHAOS_AUDIT_LINE_PREFIX.test(trimmed)) {
    return {
      ok: false,
      error:
        "Audit line must start with an allowed agent tag ([IRONGATE], [IRONTECH], [SYSTEM], [IRONLOCK], …).",
    };
  }

  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) {
    return { ok: false, error: "Missing company context for tenant isolation." };
  }

  const isSim = await readSimulationPlaneEnabled();
  const at = new Date().toISOString();
  const tone = step.terminalTone ?? "amber";

  try {
    const row = isSim
      ? await prisma.simThreatEvent.findFirst({
          where: { id, tenantCompanyId: companyId },
          select: { ingestionDetails: true },
        })
      : await prisma.threatEvent.findFirst({
          where: { id, tenantCompanyId: companyId },
          select: { ingestionDetails: true },
        });

    if (!row) {
      return { ok: false, error: "Threat not found or access denied." };
    }

    const base = parseIngestionDetailsForMerge(row.ingestionDetails);
    if (base.isChaosTest !== true) {
      return { ok: false, error: "Not a chaos drill threat." };
    }

    const prevLog = base.chaosShadowAuditLog;
    const auditArr: Array<{ at: string; line: string; tone?: string }> = Array.isArray(prevLog)
      ? (prevLog as Array<{ at: string; line: string; tone?: string }>)
      : [];

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

    const auditEntry = { at, line: trimmed, tone };
    const handoffEntry = {
      at,
      phase: step.phase,
      assigneeId: step.assigneeId,
      assigneeLabel: step.assigneeLabel,
      directiveId: step.directiveId,
    };

    const patch: Record<string, Prisma.InputJsonValue> = {
      chaosShadowAuditLog: [...auditArr, auditEntry] as unknown as Prisma.InputJsonValue,
      chaosAssigneeHandoffHistory: [...handArr, handoffEntry] as unknown as Prisma.InputJsonValue,
    };
    if (step.recordObserverConcurrenceVerified) {
      patch.chaosObserverConcurrenceVerifiedAt = at as unknown as Prisma.InputJsonValue;
    }
    const merged = mergeIngestionDetailsPatch(row.ingestionDetails, patch);

    const assigneeUpdate = step.assigneeId.trim();
    if (isSim) {
      await prisma.simThreatEvent.update({
        where: { id },
        data: {
          assigneeId: assigneeUpdate,
          ingestionDetails: merged,
        },
      });
    } else {
      await prisma.threatEvent.update({
        where: { id },
        data: {
          assigneeId: assigneeUpdate,
          ingestionDetails: merged,
        },
      });
    }

    revalidatePath("/", "layout");
    return { ok: true, ingestionDetails: merged };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/** Scenario 4 JIT gate — user grants diagnostic access; resumes drill and resolves after simulated engineer window. */
export async function grantRemoteAccessAction(
  threatId: string,
  clientAttribution?: ChaosClientAttribution | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = threatId?.trim();
  if (!id) {
    return { ok: false, error: "Missing threat id." };
  }

  const row = await prisma.threatEvent.findUnique({
    where: { id },
    select: { status: true, ingestionDetails: true },
  });
  if (!row) {
    return { ok: false, error: "Threat not found." };
  }
  if (row.status !== ThreatState.PENDING_REMOTE_INTERVENTION) {
    return { ok: false, error: "Threat is not awaiting remote authorization." };
  }

  let chaosScenario: string | null = null;
  try {
    const parsed = JSON.parse(row.ingestionDetails ?? "{}") as { chaosScenario?: unknown };
    const v =
      typeof parsed.chaosScenario === "string" ? parsed.chaosScenario.trim().toUpperCase() : "";
    chaosScenario = v || null;
  } catch {
    chaosScenario = null;
  }
  if (chaosScenario !== "REMOTE_SUPPORT") {
    return {
      ok: false,
      error: "Only Scenario 4 (Remote Support) chaos drills use this grant action.",
    };
  }

  console.log(
    "[S4] User granted JIT access — human engineer on Sidecar; hotfix + forensic probe teardown…",
  );
  try {
    const ledgerAttribution = await resolveChaosInjectAttribution(clientAttribution);
    const resumeResult = await resumeIsolatedRemoteSupportDrill(id, ledgerAttribution);
    if (!resumeResult.success) {
      return { ok: false, error: resumeResult.error };
    }
    revalidatePath("/", "layout");
    revalidatePath("/integrity");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[S4] grantRemoteAccessAction failed:", e);
    return { ok: false, error: message };
  }
}
