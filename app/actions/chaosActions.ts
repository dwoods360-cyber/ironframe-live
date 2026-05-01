"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ThreatState } from "@prisma/client";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { resolveIntegrityLedgerAuthorizedLabel } from "@/app/utils/serverAuth";
import type { ChaosClientAttribution } from "@/app/utils/chaosClientAttribution";
import { ingressGateway, readSimulationPlaneEnabled } from "@/app/lib/security/ingressGateway";
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
import {
  CHAOS_ASSIGNEE_IRONGATE_14,
  CHAOS_ASSIGNEE_IRONTECH_11,
} from "@/app/config/chaosShadowAudit";
import { purgeSimulation } from "@/app/actions/purgeSimulation";
import { clearSimulationStandDown } from "@/app/lib/simulationStandDown";
import { recordResilienceIntelStreamLine } from "@/app/actions/resilienceIntelStreamActions";
import { executeAgentAction } from "@/app/actions/threatActions";
import { logThreatActivity } from "@/app/actions/auditActions";
import { updateThreatWithIntegrity } from "@/src/services/threatStateService";

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
  | "CLOUD_EXFIL"
  | "INFIL_CRED_STUFFING"
  | "INFIL_LATERAL_PIVOT"
  | "PHISH_CEO_FRAUD"
  | "PHISH_IT_HELPDESK";

export type SystemIntegrityDrillId =
  | "attbot"
  | "kimbot"
  | "grcbot"
  | "chaos1"
  | "chaos2"
  | "chaos3"
  | "chaos4"
  | "chaos5"
  | "infilbot"
  | "phishbot";

const SYSTEM_INTEGRITY_DRILL_TO_SCENARIO: Record<SystemIntegrityDrillId, ChaosScenario> = {
  attbot: "INTERNAL",
  kimbot: "HOME_SERVER",
  grcbot: "REMOTE_SUPPORT",
  chaos1: "INTERNAL",
  chaos2: "HOME_SERVER",
  chaos3: "CLOUD_EXFIL",
  chaos4: "REMOTE_SUPPORT",
  chaos5: "CASCADING_FAILURE",
  infilbot: "INFIL_CRED_STUFFING",
  phishbot: "PHISH_CEO_FRAUD",
};

function chaosIngressSourceAgent(scenario: ChaosScenario): string {
  if (scenario === "INFIL_CRED_STUFFING" || scenario === "INFIL_LATERAL_PIVOT") {
    return "INFILBOT_SIMULATION";
  }
  if (scenario === "PHISH_CEO_FRAUD" || scenario === "PHISH_IT_HELPDESK") {
    return "PHISHBOT_SIMULATION";
  }
  return ATTACK_SOURCE;
}

function normalizeScenario(scenario: ChaosScenario): ChaosScenario {
  if (
    scenario === "INTERNAL" ||
    scenario === "HOME_SERVER" ||
    scenario === "REMOTE_SUPPORT" ||
    scenario === "CASCADING_FAILURE" ||
    scenario === "CLOUD_EXFIL" ||
    scenario === "INFIL_CRED_STUFFING" ||
    scenario === "INFIL_LATERAL_PIVOT" ||
    scenario === "PHISH_CEO_FRAUD" ||
    scenario === "PHISH_IT_HELPDESK"
  ) {
    return scenario;
  }
  return "INTERNAL";
}

/** Matches ingestion `entityType` / `chaosDrillEntityType` for Irontech Levels 1–5 dropdown drills only. */
const CHAOS_DRILL_ENTITY_TYPE = "CHAOS_DRILL" as const;

/** Async spacing between gates when `runChaosDrillIrontechLifecycleGatedAction` runs the full path server-side. */
const CHAOS_DRILL_LIFECYCLE_GATE_DELAY_MS = 5000;

const IRONTECH_AGENT_NAME = "Irontech";
const IRONTECH_AGENT_TITLE = "Infrastructure & Resilience";
const IRONTECH_AGENT_ACTOR = `${IRONTECH_AGENT_NAME} — ${IRONTECH_AGENT_TITLE}`;
/** Persisted assignee audit copy (Quick Fix lifecycle step 1). */
const IRONTECH_ASSIGNEE_AUDIT_DISPLAY = `${IRONTECH_AGENT_NAME} | ${IRONTECH_AGENT_TITLE}`;
/** AuditLog.operatorId, WorkNote.operatorId, integrity ledger actor for Irontech chaos closure / telemetry. */
const IRONTECH_CHAOS_AUDIT_OPERATOR_ID = IRONTECH_AGENT_NAME;

function chaosScenarioToInternalDrillLevel(scenario: unknown): number {
  const s = typeof scenario === "string" ? scenario.trim() : "";
  switch (s) {
    case "INTERNAL":
      return 1;
    case "HOME_SERVER":
      return 2;
    case "CLOUD_EXFIL":
      return 3;
    case "REMOTE_SUPPORT":
      return 4;
    case "CASCADING_FAILURE":
      return 5;
    default:
      return 1;
  }
}

function chaosIrontechLifecycleClosureWorkNote(level: number): string {
  return [
    "🤖 [AGENT LOG]",
    `AUTHORITY: ${IRONTECH_AGENT_NAME} (${IRONTECH_AGENT_TITLE})`,
    `ACTION: Internal Chaos Level ${level} Neutralization`,
    "NARRATIVE: State synchronized to LKG. Gated lifecycle (5s) verified.",
  ].join("\n");
}

function chaosIrontechLifecycleLogDetails(extra: Record<string, unknown>): string {
  return JSON.stringify({
    agentName: IRONTECH_AGENT_NAME,
    agentTitle: IRONTECH_AGENT_TITLE,
    actor: IRONTECH_AGENT_ACTOR,
    ...extra,
  });
}

async function logIrontechChaosDrillGateActivity(
  threatId: string,
  isSim: boolean,
  actionName: string,
  extra: Record<string, unknown>,
): Promise<void> {
  const details = chaosIrontechLifecycleLogDetails(extra);
  const op = IRONTECH_CHAOS_AUDIT_OPERATOR_ID;
  if (isSim) {
    await logThreatActivity(null, actionName, details, {
      isSimulation: true,
      simThreatId: threatId,
      operatorId: op,
    });
    return;
  }
  await logThreatActivity(threatId, actionName, details, { operatorId: op });
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
  if (scenario === "INFIL_CRED_STUFFING") {
    return "SYSTEM TEST: InfilBot shadow credential stuffing. Validating lateral ingress detection (simulation).";
  }
  if (scenario === "INFIL_LATERAL_PIVOT") {
    return "SYSTEM TEST: InfilBot lateral pivot attempt. Validating east-west movement containment (simulation).";
  }
  if (scenario === "PHISH_CEO_FRAUD") {
    return "SYSTEM TEST: PhishBot CEO fraud (urgent wire). Validating executive impersonation controls (simulation).";
  }
  if (scenario === "PHISH_IT_HELPDESK") {
    return "SYSTEM TEST: PhishBot IT helpdesk trap. Validating credential harvest / ticket spoof handling (simulation).";
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
  opts?: {
    initialAssigneeId?: string | null | undefined;
    /** When true, stamps `entityType: CHAOS_DRILL` for Irontech closure lifecycle (not ATTBOT/KIMBOT/GRCBOT inject). */
    includeChaosDrillEntityType?: boolean;
  },
) {
  const scenarioNorm = normalizeScenario(scenario);
  const sourceAgent = chaosIngressSourceAgent(scenarioNorm);
  const aiReport =
    sourceAgent === "INFILBOT_SIMULATION"
      ? "INFILBOT_SIMULATION: Controlled infiltr drill (shadow plane)."
      : sourceAgent === "PHISHBOT_SIMULATION"
        ? "PHISHBOT_SIMULATION: Controlled social-engineering drill (shadow plane)."
        : "ATTACK_BOT: Controlled chaos ingress (Irontech resilience drill).";
  const chaosShadowAgentRoleCaption =
    sourceAgent === "INFILBOT_SIMULATION"
      ? ("09 — InfilBot" as const)
      : sourceAgent === "PHISHBOT_SIMULATION"
        ? ("10 — PhishBot" as const)
        : null;

  const ingestionDetails = JSON.stringify({
    isChaosTest: true,
    ...(opts?.includeChaosDrillEntityType ? { entityType: CHAOS_DRILL_ENTITY_TYPE } : {}),
    chaosScenario: scenarioNorm,
    chaosScenarioDisplayLabel: cardTitle,
    ...(chaosShadowAgentRoleCaption ? { chaosShadowAgentRoleCaption } : {}),
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
  const assigneeIdOnRow =
    opts === undefined
      ? CHAOS_ASSIGNEE_IRONGATE_14
      : opts.initialAssigneeId === null
        ? null
        : opts.initialAssigneeId === undefined
          ? CHAOS_ASSIGNEE_IRONGATE_14
          : opts.initialAssigneeId;

  return {
    tenantCompanyId,
    status: ThreatState.PIPELINE,
    sourceAgent,
    score: 10,
    title: cardTitle,
    targetEntity: "ChaosLab",
    financialRisk_cents: 0n,
    ttlSeconds: 259200,
    /** Birth owner: Irongate (14) for generic chaos; `null` for dual-key (KIM/GRC/ATT) so pipeline is Unassigned. */
    assigneeId: assigneeIdOnRow,
    ingestionDetails,
    aiReport,
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
    row.status === ThreatState.SUBMITTED ||
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
      row.sourceAgent === "INFILBOT_SIMULATION"
        ? "INFILBOT_SIMULATION: Credential / lateral movement simulation."
        : row.sourceAgent === "PHISHBOT_SIMULATION"
          ? "PHISHBOT_SIMULATION: Phishing / personnel simulation."
          : "ATTACK_BOT: Controlled chaos ingress. Monitoring Irontech Retry-3 and Phone Home.",
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
  /**
   * When `null`, created threat has no `assignee_id` (pipeline shows Unassigned) — KIM/GRC/ATT system integrity.
   * When omitted, default birth owner is Irongate (Agent 14) per DMZ ingress.
   */
  initialAssigneeId?: string | null;
  /**
   * When true, do not stamp `ingestionDetails.entityType: CHAOS_DRILL` (ATTBOT/KIMBOT/GRCBOT system integrity only).
   */
  suppressChaosDrillEntityType?: boolean;
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
  await clearSimulationStandDown(tenantId);

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

    const initialAssigneeId = options?.initialAssigneeId;
    const suppressChaosEntity = options?.suppressChaosDrillEntityType === true;
    const includeChaosDrillEntityType =
      !suppressChaosEntity &&
      scenarioNorm !== "INFIL_CRED_STUFFING" &&
      scenarioNorm !== "INFIL_LATERAL_PIVOT" &&
      scenarioNorm !== "PHISH_CEO_FRAUD" &&
      scenarioNorm !== "PHISH_IT_HELPDESK";
    const finalize = chaosThreatFinalizeData(company.id, scenarioNorm, cardTitle, {
      ...(initialAssigneeId === undefined ? {} : { initialAssigneeId }),
      includeChaosDrillEntityType,
    });
    const isSim = await readSimulationPlaneEnabled();

    const created = await ingressGateway.writeThreatEvent(
      finalize as unknown as Prisma.ThreatEventUncheckedCreateInput,
    );
    const threatId = created.id;

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

/**
 * Control Room red-team chip trigger. Normalizes 01-10 drill ids to canonical chaos scenarios.
 */
/** KIM/GRC/ATT Full Spectrum: no Irongate auto-assign at birth — operator must claim. */
const DUAL_KEY_HANDSHAKE_DRILLS: SystemIntegrityDrillId[] = ["attbot", "kimbot", "grcbot"];

export async function triggerSystemIntegrityDrillAction(
  drillId: SystemIntegrityDrillId,
  clientAttribution?: ChaosClientAttribution | null,
): Promise<
  | { ok: true; threatId: string; tenantCompanyId: string; pipelineThreat: ChaosPipelineThreatPayload }
  | { ok: false; error: string }
> {
  const scenario = SYSTEM_INTEGRITY_DRILL_TO_SCENARIO[drillId] ?? "INTERNAL";
  const dualKeyHandshake = DUAL_KEY_HANDSHAKE_DRILLS.includes(drillId);
  const suppressChaosDrillEntityType =
    drillId === "attbot" || drillId === "kimbot" || drillId === "grcbot";
  const result = await injectChaosThreatAction(
    scenario,
    clientAttribution,
    `System Integrity Drill — ${drillId.toUpperCase()}`,
    {
      ...(dualKeyHandshake ? { initialAssigneeId: null } : {}),
      suppressChaosDrillEntityType,
    },
  );
  if (result.ok) {
    const ingressLineByDrillId: Partial<Record<SystemIntegrityDrillId, string>> = {
      attbot:
        "> [ATTBOT] CRITICAL: External breach simulation initiated. Ironsight scanning blast radius...",
      kimbot:
        "> [KIMBOT] STRESS: High-volume risk ingestion detected. Ironwatch monitoring latency...",
      grcbot:
        "> [GRCBOT] GOVERNANCE: Policy alignment drill started. Irontally mapping frameworks...",
    };
    const ingressLine = ingressLineByDrillId[drillId];
    if (ingressLine) {
      await recordResilienceIntelStreamLine(ingressLine, result.threatId);
    }
  }
  return result;
}

/** Tactical control-room purge endpoint for active simulation data. */
export async function clearAllThreatsAction(): Promise<{ ok: boolean; message: string }> {
  return purgeSimulation();
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
 * Irontech Quick Fix (`entityType === CHAOS_DRILL` only): one atomic DB step + `logThreatActivity`.
 * Prefer `runChaosDrillIrontechLifecycleGatedAction` for the full 5s-spaced path in one call.
 * `revalidatePath('/')` runs only after step 4.
 */
export async function executeChaosDrillIrontechLifecycleStepAction(
  threatId: string,
  step: 1 | 2 | 3 | 4,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = threatId?.trim();
  if (!id) return { ok: false, error: "Missing threat id." };

  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) {
    return { ok: false, error: "Missing company context for tenant isolation." };
  }

  const isSim = await readSimulationPlaneEnabled();

  const row = isSim
    ? await prisma.simThreatEvent.findFirst({
        where: { id, tenantCompanyId: companyId },
        select: { ingestionDetails: true },
      })
    : await prisma.threatEvent.findFirst({
        where: { id, tenantCompanyId: companyId },
        select: { ingestionDetails: true },
      });

  if (!row) return { ok: false, error: "Threat not found or access denied." };

  const base = parseIngestionDetailsForMerge(row.ingestionDetails);
  const entityOk =
    base.entityType === CHAOS_DRILL_ENTITY_TYPE ||
    base.chaosDrillEntityType === CHAOS_DRILL_ENTITY_TYPE;
  if (!entityOk) {
    return { ok: false, error: "Lifecycle applies only when entityType is CHAOS_DRILL." };
  }

  const level = chaosScenarioToInternalDrillLevel(base.chaosScenario);
  const operatorId = IRONTECH_CHAOS_AUDIT_OPERATOR_ID;

  try {
    await prisma.$transaction(async (tx) => {
      if (step === 1) {
        if (isSim) {
          await tx.simThreatEvent.update({
            where: { id },
            data: { assigneeId: CHAOS_ASSIGNEE_IRONTECH_11 },
          });
        } else {
          await updateThreatWithIntegrity({
            threatId: id,
            changes: { assigneeId: CHAOS_ASSIGNEE_IRONTECH_11 },
            actorUserId: operatorId,
            eventType: "CHAOS_DRILL_LIFECYCLE_STEP1_ASSIGN",
            tx,
          });
        }
      } else if (step === 2) {
        if (isSim) {
          await tx.simThreatEvent.update({
            where: { id },
            data: {
              status: ThreatState.CONFIRMED,
              assigneeId: CHAOS_ASSIGNEE_IRONTECH_11,
            },
          });
        } else {
          await updateThreatWithIntegrity({
            threatId: id,
            changes: {
              status: ThreatState.CONFIRMED,
              assigneeId: CHAOS_ASSIGNEE_IRONTECH_11,
            },
            actorUserId: operatorId,
            eventType: "CHAOS_DRILL_LIFECYCLE_STEP2_CONFIRMED",
            tx,
          });
        }
      } else if (step === 3) {
        if (isSim) {
          await tx.simThreatEvent.update({
            where: { id },
            data: {
              status: ThreatState.SUBMITTED,
              assigneeId: CHAOS_ASSIGNEE_IRONTECH_11,
            },
          });
        } else {
          await updateThreatWithIntegrity({
            threatId: id,
            changes: {
              status: ThreatState.SUBMITTED,
              assigneeId: CHAOS_ASSIGNEE_IRONTECH_11,
            },
            actorUserId: operatorId,
            eventType: "CHAOS_DRILL_LIFECYCLE_STEP3_SUBMITTED",
            tx,
          });
        }
      } else {
        if (isSim) {
          await tx.simThreatEvent.update({
            where: { id },
            data: {
              status: ThreatState.RESOLVED,
              assigneeId: CHAOS_ASSIGNEE_IRONTECH_11,
            },
          });
        } else {
          await updateThreatWithIntegrity({
            threatId: id,
            changes: {
              status: ThreatState.RESOLVED,
              assigneeId: CHAOS_ASSIGNEE_IRONTECH_11,
            },
            actorUserId: operatorId,
            eventType: "CHAOS_DRILL_LIFECYCLE_STEP4_RESOLVED",
            tx,
          });
        }
        if (!isSim) {
          await tx.workNote.create({
            data: {
              threatId: id,
              text: chaosIrontechLifecycleClosureWorkNote(level),
              operatorId,
            },
          });
        }
      }
    });

    if (step === 1) {
      await logIrontechChaosDrillGateActivity(id, isSim, "ASSIGNEE_CHANGE", {
        gate: 1,
        assigneeDisplay: IRONTECH_ASSIGNEE_AUDIT_DISPLAY,
      });
    } else if (step === 2) {
      await logIrontechChaosDrillGateActivity(id, isSim, "THREAT_CONFIRMED", { gate: 2 });
    } else if (step === 3) {
      await logIrontechChaosDrillGateActivity(id, isSim, "ATTESTATION_SUBMITTED", { gate: 3 });
    } else {
      await logIrontechChaosDrillGateActivity(id, isSim, "THREAT_RESOLVED", { gate: 4 });
    }

    if (step === 4) {
      revalidatePath("/");
    }

    return { ok: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/**
 * `CHAOS_DRILL` only: executes gates 1–4 with `CHAOS_DRILL_LIFECYCLE_GATE_DELAY_MS` between gates (server-side).
 * `revalidatePath("/")` runs only after gate 4.
 */
export async function runChaosDrillIrontechLifecycleGatedAction(
  threatId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = threatId?.trim();
  if (!id) return { ok: false, error: "Missing threat id." };

  for (let s = 1; s <= 4; s++) {
    if (s > 1) {
      await new Promise<void>((r) => setTimeout(r, CHAOS_DRILL_LIFECYCLE_GATE_DELAY_MS));
    }
    const next = await executeChaosDrillIrontechLifecycleStepAction(id, s as 1 | 2 | 3 | 4);
    if (!next.ok) return next;
  }
  return { ok: true };
}

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
    const isT12 = step.phase === "T12_RESOLUTION_SYSTEM";
    const forensicJustification = `[${step.phase}] ${step.directiveId}: ${trimmed.slice(0, 800)}`;

    const entityFromIngestion =
      (base as { entityType?: unknown }).entityType ??
      (base as { chaosDrillEntityType?: unknown }).chaosDrillEntityType;
    const isChaosDrillRow = entityFromIngestion === CHAOS_DRILL_ENTITY_TYPE;

    const persistenceIngestion =
      isT12 && isChaosDrillRow
        ? mergeIngestionDetailsPatch(merged, {
            chaosDrillEntityType: CHAOS_DRILL_ENTITY_TYPE,
            chaosDrillResolutionAt: at,
          })
        : merged;

    if (isT12 && isChaosDrillRow) {
      await prisma.$transaction(async (tx) => {
        if (isSim) {
          await tx.simThreatEvent.update({
            where: { id },
            data: {
              assigneeId: assigneeUpdate,
              ingestionDetails: persistenceIngestion,
            },
          });
        } else {
          await updateThreatWithIntegrity({
            threatId: id,
            changes: {
              assigneeId: assigneeUpdate,
              ingestionDetails: persistenceIngestion,
            },
            actorUserId: IRONTECH_CHAOS_AUDIT_OPERATOR_ID,
            eventType: "CHAOS_DRILL_T12_TELEMETRY_MERGE",
            tx,
          });
        }
      });
      return { ok: true, ingestionDetails: persistenceIngestion };
    }

    if (isT12) {
      const prodChangesLegacy: Prisma.ThreatEventUpdateInput | undefined = !isSim
        ? {
            assigneeId: assigneeUpdate,
            ingestionDetails: persistenceIngestion,
            status: ThreatState.RESOLVED,
          }
        : undefined;
      const shadowChangesLegacy: Prisma.SimThreatEventUpdateInput | undefined = isSim
        ? {
            assigneeId: assigneeUpdate,
            ingestionDetails: persistenceIngestion,
            status: ThreatState.RESOLVED,
          }
        : undefined;
      const autonomyT12 = await executeAgentAction({
        plane: isSim ? "shadow" : "prod",
        threatId: id,
        tenantCompanyId: companyId,
        operatorId: IRONTECH_CHAOS_AUDIT_OPERATOR_ID,
        justification: forensicJustification,
        auditAction: "STATE_TRANSITION",
        integrityEventType: "CHAOS_TELEMETRY_T12_FORENSIC_CLOSE_LEGACY",
        prodChanges: prodChangesLegacy,
        shadowChanges: shadowChangesLegacy,
      });
      if (!autonomyT12.ok) {
        return { ok: false, error: autonomyT12.error };
      }
      revalidatePath("/");
      revalidatePath("/control-room");
      revalidatePath("/", "layout");
      return { ok: true, ingestionDetails: persistenceIngestion };
    }

    const prodChanges: Prisma.ThreatEventUpdateInput | undefined = !isSim
      ? {
          assigneeId: assigneeUpdate,
          ingestionDetails: persistenceIngestion,
        }
      : undefined;

    const shadowChanges: Prisma.SimThreatEventUpdateInput | undefined = isSim
      ? {
          assigneeId: assigneeUpdate,
          ingestionDetails: persistenceIngestion,
        }
      : undefined;

    const autonomy = await executeAgentAction({
      plane: isSim ? "shadow" : "prod",
      threatId: id,
      tenantCompanyId: companyId,
      operatorId: IRONTECH_CHAOS_AUDIT_OPERATOR_ID,
      justification: forensicJustification,
      auditAction: "ASSIGNEE_CHANGE",
      integrityEventType: "CHAOS_ASSIGNEE_HANDOFF",
      prodChanges,
      shadowChanges,
    });

    if (!autonomy.ok) {
      return { ok: false, error: autonomy.error };
    }

    revalidatePath("/", "layout");
    return { ok: true, ingestionDetails: persistenceIngestion };
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
