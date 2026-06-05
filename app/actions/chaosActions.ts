"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ThreatState } from "@prisma/client";
import {
  getActiveTenantUuidFromCookies,
  getScopedTenantUuidFromCookies,
  resolveTenantUuidForThreatScope,
} from "@/app/utils/serverTenantContext";
import { resolveIntegrityLedgerAuthorizedLabel } from "@/app/utils/serverAuth";
import type { ChaosClientAttribution } from "@/app/utils/chaosClientAttribution";
import { ingressGateway, ingressUsesRiskEventTable } from "@/app/lib/security/ingressGateway";
import { isShadowPlaneActiveFromEnv } from "@/app/utils/shadowPlaneActive";
import { getCompanyIdForActiveTenant, getCompanyIdForTenantUuid } from "@/app/lib/grc/clearanceThreatResolve";
import {
  mergeIngestionDetailsPatch,
  mergeIngestionDetailsPatchJson,
  normalizeIngestionDetailsToString,
  parseIngestionDetailsForMerge,
} from "@/app/utils/ingestionDetailsMerge";
import {
  buildChaosAgentIngressPayload,
  mergeAgentIngressIntoIngestionJson,
} from "@/app/utils/agentIngressJustification";
import {
  finalizeRemoteSupportTechResolution,
  patchRemoteSupportDrillIngestion,
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
  CHAOS_ASSIGNEE_IRONSCRIBE_5,
  CHAOS_ASSIGNEE_IRONTECH_11,
  CHAOS_ASSIGNEE_SYSTEM,
  CHAOS_DIRECTIVE,
} from "@/app/config/chaosShadowAudit";
import {
  appendAssigneeHistory,
  handoffWorkforceAgent,
  strikeForensicGavel,
} from "@/app/services/riskRegistryActions";
import {
  updateRiskRegistry,
} from "@/app/lib/riskRegistryDb";
import { ingestRedTeamAttackToRegistry } from "@/app/services/riskLifecycle";
import { CHAOS_WORKFORCE_ASSIGNEE_LABELS } from "@/app/utils/assignmentChainOfCustody";
import {
  buildSimulationCardRequiredMessage,
  buildSimulationDispatchMessage,
  resolveSimulationCardProduced,
  resolveSimulationForensicLine,
} from "@/app/utils/simulationDispatchOutcome";
import { purgeSimulation } from "@/app/actions/purgeSimulation";
import { clearSimulationStandDown } from "@/app/lib/simulationStandDown";
import { recordResilienceIntelStreamLine } from "@/app/actions/resilienceIntelStreamActions";
import { logThreatActivity } from "@/app/actions/auditActions";
import { updateThreatWithIntegrity } from "@/src/services/threatStateService";
import {
  buildChaosL4LifecyclePatch,
  buildChaosScenario4InitialIngestion,
  canArchiveChaosL4,
  CHAOS_L4_CARD_TITLE,
  CHAOS_L4_WORK_PERFORMED_MIN_CHARS,
  isChaosL4AwaitingJitGrant,
  isChaosL4ReadyForTechClaim,
  isChaosL4TechInvestigating,
  parseChaosL4LifecycleFromIngestion,
} from "@/app/utils/chaosL4Lifecycle";
import { validateIngressContext } from "@/app/middleware/irongateShield";
import {
  commitPhoneHome,
  dispatchRemoteSupportAction,
  sendPhoneHomeEmail,
  type PhoneHomeDiagnosticPacket,
} from "@/app/actions/phoneHomeActions";

/** Primary human authority on Chaos rows (Irontech agents remain executor in `ingestionDetails`). */
const CHAOS_PRIMARY_HUMAN_ASSIGNEE_ID = "User_00";

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
    /** Constitutional finalizing authority on autonomous chaos lifecycle (AuditLog `operatorId` on resolve). */
    supervisoryAuthority: CHAOS_PRIMARY_HUMAN_ASSIGNEE_ID,
    executingAgent: IRONTECH_AGENT_NAME,
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
  /** AuditLog.operatorId: constitutional authority on every lifecycle gate (video / GRC chain). */
  const op = CHAOS_PRIMARY_HUMAN_ASSIGNEE_ID;
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
function resolveChaosCardTitle(scenario: ChaosScenario, scenarioDisplayLabel: unknown): string {
  const scenarioStr =
    scenarioDisplayLabel instanceof Error
      ? scenarioDisplayLabel.message
      : String(scenarioDisplayLabel ?? "");
  const trimmed = scenarioStr.trim().replace(/\s+/g, " ").slice(0, CHAOS_CARD_TITLE_MAX_LEN);
  if (trimmed.length > 0) {
    return trimmed;
  }
  return `${ATTACK_THREAT_TITLE_PREFIX} Poisoned Chaos Threat — Irontech resilience drill`;
}

/** Final row fields applied after immediate draft create (same semantics as former `createChaosThreatBase`). */
function chaosThreatFinalizeData(
  tenantCompanyId: bigint,
  tenantScopeUuid: string,
  scenario: ChaosScenario,
  cardTitle: string,
  opts?: {
    initialAssigneeId?: string | null | undefined;
    /** When true, stamps `entityType: CHAOS_DRILL` for Irontech closure lifecycle (not ATTBOT/KIMBOT/GRCBOT inject). */
    includeChaosDrillEntityType?: boolean;
    systemIntegrityDrillId?: SystemIntegrityDrillId;
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

  const drillLevel = chaosScenarioToInternalDrillLevel(scenarioNorm);
  /**
   * Prisma `assigneeId`: Irongate (14) for generic chaos; `null` for Simulation Bots A–C (dual-key — operator must claim).
   * Constitutional `User_00` remains in ingestion metadata only.
   */
  const assigneeIdOnRow =
    opts === undefined
      ? CHAOS_ASSIGNEE_IRONGATE_14
      : opts.initialAssigneeId === null
        ? null
        : opts.initialAssigneeId === undefined
          ? CHAOS_ASSIGNEE_IRONGATE_14
          : opts.initialAssigneeId;

  const constitutionalSealedAt = new Date().toISOString();
  const agentIngress = buildChaosAgentIngressPayload(scenarioNorm, cardTitle);
  const scopedTenant = tenantScopeUuid.trim();
  const ingestionDetails = mergeAgentIngressIntoIngestionJson(
    {
    sourcePlane: "CHAOS",
    isChaosTest: true,
    incident_type: "CHAOS",
    category: "INFRASTRUCTURE",
    /** Session tenant UUID — used by Active board client filter (zero-bleed). */
    tenantScopeUuid: scopedTenant,
    chaosTenantCompanyId: tenantCompanyId.toString(),
    chaos_level: drillLevel,
    threatCategoryDisplay: "Infrastructure Drift",
    shadowSimulationStatus: "simulated",
    ...(opts?.includeChaosDrillEntityType ? { entityType: CHAOS_DRILL_ENTITY_TYPE } : {}),
    ...(opts?.systemIntegrityDrillId ? { systemIntegrityDrillId: opts.systemIntegrityDrillId } : {}),
    chaosScenario: scenarioNorm,
    chaosScenarioDisplayLabel: cardTitle,
    ...(chaosShadowAgentRoleCaption ? { chaosShadowAgentRoleCaption } : {}),
    grcJustification: chaosDrillGrcJustificationForScenario(scenarioNorm),
    /** Permanent human anchor (GRC): scalar `constitutionalAuthority` + row-level `assigneeId`. */
    constitutionalAuthority: "User_00",
    constitutionalAuthorityMeta: {
      role: "CONSTITUTIONAL_AUTHORITY",
      sealedAt: constitutionalSealedAt,
      pairedIngressAgentId: CHAOS_ASSIGNEE_IRONGATE_14,
    },
    assigned_to: "User_00",
    owner_id: "User_00",
    /** TAS §2 Level-2 DMZ: all chaos ingress attributed to Irongate (Agent 14) at create. */
    dmzIrongateIngress: {
      agentId: CHAOS_ASSIGNEE_IRONGATE_14,
      routedAt: constitutionalSealedAt,
      sanitized: true,
    },
    /** Irontech (Agent 11) — execution / resilience; primary UI owner remains User_00 (`assigneeId`, assigned_to, owner_id). */
    resilienceExecutorAgentId: CHAOS_ASSIGNEE_IRONTECH_11,
    /** Persisted terminal lines; appended by `applyChaosShadowDrillTelemetryStepAction`. */
    chaosShadowAuditLog: [],
    /** GRC agent handoff chain (timestamp, assignee, directive) per 4s transition. */
    chaosAssigneeHandoffHistory: [],
    },
    agentIngress,
  );

  return {
    tenantCompanyId,
    status: ThreatState.IDENTIFIED,
    sourceAgent,
    score: 10,
    title: cardTitle,
    targetEntity: "ChaosLab",
    financialRisk_cents: 0n,
    ttlSeconds: 259200,
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
  ingestionDetails: string | Prisma.JsonValue | null;
  aiReport: string | null;
  assigneeId: string | null;
}): ChaosPipelineThreatPayload {
  const onActiveBoard =
    row.status === ThreatState.CONFIRMED || row.status === ThreatState.MITIGATED;
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
    ingestionDetails: normalizeIngestionDetailsToString(row.ingestionDetails) ?? undefined,
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
  /** Stamped on ingestion when {@link suppressChaosDrillEntityType} (Control Room Simulation Bots A–C). */
  systemIntegrityDrillId?: SystemIntegrityDrillId;
  /** Optional explicit tenant UUID/slug from client active context; server validates and scopes writes to this tenant. */
  tenantUuidOverride?: string;
  /**
   * L4 only: create `IDENTIFIED` row + risk_registry ingress, then run isolated drill from
   * `runRemoteSupportChaosDrillAction` after Attack Velocity hold (client).
   */
  deferRemoteSupportDrill?: boolean;
};

export type InjectChaosThreatSuccess = {
  ok: true;
  threatId: string;
  tenantCompanyId: string;
  pipelineThreat: ChaosPipelineThreatPayload;
  cardProduced: boolean;
  message: string;
  scenarioDisplayName: string;
  forensicLine?: string;
};

export type InjectChaosThreatResult = InjectChaosThreatSuccess | { ok: false; error: string };

export async function injectChaosThreatAction(
  scenario: ChaosScenario = "INTERNAL",
  clientAttribution?: ChaosClientAttribution | null,
  /** Exact `<option>` label from the Control Room dropdown (ThreatEvent / SimThreatEvent title + pipeline header). */
  scenarioDisplayLabel?: unknown,
  options?: InjectChaosThreatOptions,
): Promise<InjectChaosThreatResult> {
  /** Control Room Simulation Bots A–C: session cookie only — never Medshield default. */
  const isControlRoomIntegrityBot = Boolean(options?.systemIntegrityDrillId);
  const tenantFromCookie = await getScopedTenantUuidFromCookies();
  const tenantId = options?.tenantUuidOverride?.trim()
    ? await resolveTenantUuidForThreatScope(options.tenantUuidOverride.trim())
    : tenantFromCookie;
  if (!tenantId) {
    return {
      ok: false,
      error: isControlRoomIntegrityBot
        ? "No active tenant — select tenant in Command Center before chaos inject."
        : "No active tenant — select Command Center scope or pass tenantUuidOverride from session.",
    };
  }
  if (options?.tenantUuidOverride?.trim() && !isControlRoomIntegrityBot) {
    const override = options.tenantUuidOverride.trim();
    const resolvedOverride = await resolveTenantUuidForThreatScope(override);
    if (!resolvedOverride) {
      return {
        ok: false,
        error: `Invalid tenant override for chaos inject: ${override}`,
      };
    }
    if (resolvedOverride !== tenantFromCookie && !isShadowPlaneActiveFromEnv()) {
      return {
        ok: false,
        error: `Tenant override mismatch: cookie ${tenantFromCookie} != override ${resolvedOverride}`,
      };
    }
  }
  await clearSimulationStandDown(tenantId);

  const scenarioNorm = normalizeScenario(scenario);
  if (scenarioNorm === "REMOTE_SUPPORT" && !options?.tenantUuidOverride?.trim()) {
    return {
      ok: false,
      error:
        "Chaos L4 (Remote Support) requires explicit tenant scope from the active session (tenantUuidOverride).",
    };
  }
  const cardTitle = resolveChaosCardTitle(scenarioNorm, scenarioDisplayLabel);
  const deferRemoteSupportDrill =
    scenarioNorm === "REMOTE_SUPPORT" && options?.deferRemoteSupportDrill === true;
  const skipIsolatedDrill =
    deferRemoteSupportDrill || options?.skipIsolatedDrill !== false;

  try {
    let companyId = await getCompanyIdForTenantUuid(tenantId);
    let company =
      companyId != null
        ? await prisma.company.findUnique({
            where: { id: companyId },
            select: { id: true, tenantId: true, name: true, sector: true },
          })
        : null;

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
        select: { id: true, tenantId: true, name: true, sector: true },
      });
      companyId = company.id;
    }

    if (!company?.tenantId?.trim() || company.tenantId.trim() !== tenantId) {
      return { ok: false, error: "Chaos inject blocked: company tenant binding mismatch." };
    }

    const initialAssigneeId = options?.initialAssigneeId;
    const suppressChaosEntity = options?.suppressChaosDrillEntityType === true;
    const includeChaosDrillEntityType =
      !suppressChaosEntity &&
      scenarioNorm !== "INFIL_CRED_STUFFING" &&
      scenarioNorm !== "INFIL_LATERAL_PIVOT" &&
      scenarioNorm !== "PHISH_CEO_FRAUD" &&
      scenarioNorm !== "PHISH_IT_HELPDESK";

    const finalize = chaosThreatFinalizeData(company.id, tenantId, scenarioNorm, cardTitle, {
      ...(initialAssigneeId === undefined ? {} : { initialAssigneeId }),
      includeChaosDrillEntityType,
      ...(options?.systemIntegrityDrillId
        ? { systemIntegrityDrillId: options.systemIntegrityDrillId }
        : {}),
    });

    const created = await ingressGateway.writeThreatEvent(
      finalize as unknown as Prisma.ThreatEventUncheckedCreateInput,
    );
    const threatId = created.id;

    await patchRemoteSupportDrillIngestion(
      threatId,
      {
        sourcePlane: "CHAOS",
        threadId: threatId,
        orchestrationThreadId: threatId,
      },
      "CHAOS_ORCHESTRATION_THREAD_BOUND",
    );

    if (deferRemoteSupportDrill) {
      const reg = await ingestRedTeamAttackToRegistry({
        tenantId,
        title: cardTitle,
        telemetryValue: "Attack velocity",
        sourceAgent: chaosIngressSourceAgent(scenarioNorm),
        payload: parseIngestionDetailsForMerge(finalize.ingestionDetails),
      });
      if (reg?.id) {
        await updateRiskRegistry(reg.id, tenantId, { riskEventId: threatId });
      }
    }

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

    const useRiskEventTable = await ingressUsesRiskEventTable();
    const row = useRiskEventTable
      ? await prisma.riskEvent.findFirst({
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

    const cardProduced = resolveSimulationCardProduced(scenarioNorm, options);
    const forensicLine = cardProduced ? undefined : resolveSimulationForensicLine(scenarioNorm);
    const message = cardProduced
      ? buildSimulationCardRequiredMessage(cardTitle)
      : buildSimulationDispatchMessage(cardTitle, forensicLine ?? "");

    return {
      ok: true,
      threatId,
      tenantCompanyId: company.id.toString(),
      pipelineThreat: mapThreatRowToChaosPipelinePayload(row),
      cardProduced,
      message,
      scenarioDisplayName: cardTitle,
      forensicLine,
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

const SIMULATION_BOT_INTEGRITY_DRILLS: SystemIntegrityDrillId[] = ["attbot", "kimbot", "grcbot"];

function systemIntegrityDrillTitleFragment(
  drillId: SystemIntegrityDrillId,
  waveIndex = 1,
): string {
  const base = `System Integrity Drill — ${drillId.toUpperCase()}`;
  return waveIndex > 1 ? `${base} #${waveIndex}` : base;
}

const OPEN_INTEGRITY_DRILL_STATUSES: ThreatState[] = [
  ThreatState.IDENTIFIED,
  ThreatState.CONFIRMED,
  ThreatState.MITIGATED,
];

function openSystemIntegrityDrillWhere(
  drillId: SystemIntegrityDrillId,
  tenantUuid: string,
  companyId: bigint,
  useRiskEventTable: boolean,
): Prisma.RiskEventWhereInput | Prisma.ThreatEventWhereInput {
  const titleNeedle = drillId.toUpperCase();
  const titleClause = {
    title: { contains: "System Integrity Drill", mode: "insensitive" as const },
    AND: { title: { contains: titleNeedle, mode: "insensitive" as const } },
  };
  if (useRiskEventTable) {
    return {
      tenantId: tenantUuid,
      status: { in: OPEN_INTEGRITY_DRILL_STATUSES },
      ...titleClause,
    };
  }
  return {
    tenantCompanyId: companyId,
    status: { in: OPEN_INTEGRITY_DRILL_STATUSES },
    ...titleClause,
  };
}

async function countOpenSystemIntegrityDrillsForBot(
  drillId: SystemIntegrityDrillId,
): Promise<number> {
  if (!SIMULATION_BOT_INTEGRITY_DRILLS.includes(drillId)) return 0;
  const tenantUuid = await getActiveTenantUuidFromCookies();
  if (!tenantUuid?.trim()) return 0;
  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) return 0;
  const useRiskEventTable = await ingressUsesRiskEventTable();
  const where = openSystemIntegrityDrillWhere(
    drillId,
    tenantUuid.trim(),
    companyId,
    useRiskEventTable,
  );
  return useRiskEventTable
    ? prisma.riskEvent.count({ where: where as Prisma.RiskEventWhereInput })
    : prisma.threatEvent.count({ where: where as Prisma.ThreatEventWhereInput });
}

async function resolveOpenSystemIntegrityDrillRow(
  drillId: SystemIntegrityDrillId,
  threatId: string,
  tenantUuid: string,
  companyId: bigint,
  useRiskEventTable: boolean,
): Promise<void> {
  const resolvedAt = new Date().toISOString();
  const patch = {
    systemIntegrityDrillStandDownAt: resolvedAt,
    chaosDrillResolutionAt: resolvedAt,
  };
  if (useRiskEventTable) {
    const existing = await prisma.riskEvent.findFirst({
      where: { id: threatId, tenantId: tenantUuid },
      select: { ingestionDetails: true },
    });
    const merged = mergeIngestionDetailsPatch(existing?.ingestionDetails ?? null, patch);
    await prisma.riskEvent.update({
      where: { tenantId_id: { tenantId: tenantUuid, id: threatId } },
      data: { status: ThreatState.RESOLVED, ingestionDetails: merged },
    });
    return;
  }
  const existing = await prisma.threatEvent.findFirst({
    where: { id: threatId, tenantCompanyId: companyId },
    select: { ingestionDetails: true },
  });
  const merged = mergeIngestionDetailsPatch(existing?.ingestionDetails ?? null, patch);
  await updateThreatWithIntegrity({
    threatId,
    changes: {
      status: ThreatState.RESOLVED,
      ingestionDetails: merged,
    },
    actorUserId: "system-integrity-stand-down",
    eventType: "SYSTEM_INTEGRITY_DRILL_STAND_DOWN",
  });
}

/** Control Room Simulation Bots A–C: resolve every open integrity drill wave for this bot. */
export async function standDownAllSystemIntegrityDrillsAction(
  drillId: SystemIntegrityDrillId,
): Promise<{ ok: true; threatIds: string[] } | { ok: false; error: string }> {
  if (!SIMULATION_BOT_INTEGRITY_DRILLS.includes(drillId)) {
    return { ok: false, error: "Stand-down applies only to Simulation Bots A–C." };
  }
  const tenantUuid = await getActiveTenantUuidFromCookies();
  if (!tenantUuid?.trim()) {
    return { ok: false, error: "No active tenant." };
  }
  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) {
    return { ok: false, error: "No company scope for active tenant." };
  }
  const useRiskEventTable = await ingressUsesRiskEventTable();
  const where = openSystemIntegrityDrillWhere(
    drillId,
    tenantUuid.trim(),
    companyId,
    useRiskEventTable,
  );
  const rows = useRiskEventTable
    ? await prisma.riskEvent.findMany({
        where: where as Prisma.RiskEventWhereInput,
        select: { id: true },
        orderBy: { createdAt: "asc" },
      })
    : await prisma.threatEvent.findMany({
        where: where as Prisma.ThreatEventWhereInput,
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });
  if (rows.length === 0) {
    return { ok: false, error: `No active ${drillId.toUpperCase()} system integrity drills.` };
  }
  try {
    for (const row of rows) {
      await resolveOpenSystemIntegrityDrillRow(
        drillId,
        row.id,
        tenantUuid.trim(),
        companyId,
        useRiskEventTable,
      );
    }
    revalidatePath("/", "layout");
    return { ok: true, threatIds: rows.map((r) => r.id) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/** @deprecated Prefer {@link standDownAllSystemIntegrityDrillsAction} */
export async function standDownSystemIntegrityDrillAction(
  drillId: SystemIntegrityDrillId,
): Promise<{ ok: true; threatId: string } | { ok: false; error: string }> {
  const result = await standDownAllSystemIntegrityDrillsAction(drillId);
  if (!result.ok) return result;
  return { ok: true, threatId: result.threatIds[result.threatIds.length - 1] ?? "" };
}

export async function triggerSystemIntegrityDrillAction(
  drillId: SystemIntegrityDrillId,
  clientAttribution?: ChaosClientAttribution | null,
): Promise<InjectChaosThreatResult> {
  const scenario = SYSTEM_INTEGRITY_DRILL_TO_SCENARIO[drillId] ?? "INTERNAL";
  const dualKeyHandshake = DUAL_KEY_HANDSHAKE_DRILLS.includes(drillId);
  const suppressChaosDrillEntityType =
    drillId === "attbot" || drillId === "kimbot" || drillId === "grcbot";
  const waveIndex = suppressChaosDrillEntityType
    ? (await countOpenSystemIntegrityDrillsForBot(drillId)) + 1
    : 1;
  const result = await injectChaosThreatAction(
    scenario,
    clientAttribution,
    systemIntegrityDrillTitleFragment(drillId, waveIndex),
    {
      ...(dualKeyHandshake ? { initialAssigneeId: null } : {}),
      suppressChaosDrillEntityType,
      ...(dualKeyHandshake ? { systemIntegrityDrillId: drillId } : {}),
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
      await logSystemIntegrityDrillAudit(drillId, result.threatId, ingressLine);
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
  /^(?:>\s*)?\[(IRONGATE|IRONSCRIBE|IRONTECH|SYSTEM|IRONLOCK|IRONFRAME|IRONCORE|GRIDCORE|IRONCAST|GRC)\]/;
const CHAOS_AUDIT_LINE_MAX = 1600;

/** Phases for persisted `chaosAssigneeHandoffHistory` (supervised telemetry). */
export type ChaosDrillTelemetryPhase =
  | "T0_DMZ_IRONGATE"
  | "T2_REGISTRATION_IRONSCRIBE"
  | "T4_REMEDIATION_IRONTECH"
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

/** Control Room Simulation Bots A–C: Audit Intelligence row (plain-text resilience + CHAOS_AGENT_MOVEMENT). */
async function logSystemIntegrityDrillAudit(
  drillId: SystemIntegrityDrillId,
  threatId: string,
  ingressLine: string,
): Promise<void> {
  const useRiskEventTable = await ingressUsesRiskEventTable();
  const botTag = drillId.toUpperCase();
  const justification = JSON.stringify({
    message: ingressLine,
    terminalLine: ingressLine,
    drillId,
    phase: "SYSTEM_INTEGRITY_DRILL_FIRE",
    assigneeLabel: botTag,
    directiveId: `SIM_BOT_${botTag}`,
  });
  await logThreatActivity(
    useRiskEventTable ? null : threatId,
    "CHAOS_AGENT_MOVEMENT",
    justification,
    {
      operatorId: `SIM_BOT_${botTag}`,
      simThreatId: useRiskEventTable ? threatId : null,
      isSimulation: useRiskEventTable,
    },
  );
}

/** Audit Intelligence stream: one row per supervised chaos handoff (shadow uses `simThreatId`). */
async function logChaosAgentMovementActivity(args: {
  threatId: string;
  useRiskEventTable: boolean;
  step: ChaosShadowDrillTelemetryStep;
}): Promise<void> {
  const { threatId, useRiskEventTable, step } = args;
  const justification = JSON.stringify({
    terminalLine: step.terminalLine,
    message: step.terminalLine,
    directiveId: step.directiveId,
    phase: step.phase,
    assigneeLabel: step.assigneeLabel,
  });
  const summary = `[${step.phase}] ${step.assigneeLabel} · ${step.directiveId}`;
  await logThreatActivity(
    useRiskEventTable ? null : threatId,
    "CHAOS_AGENT_MOVEMENT",
    justification,
    {
      operatorId: IRONTECH_CHAOS_AUDIT_OPERATOR_ID,
      simThreatId: useRiskEventTable ? threatId : null,
      isSimulation: useRiskEventTable,
    },
  );
}

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

  const useRiskEventTable = await ingressUsesRiskEventTable();

  const row = useRiskEventTable
    ? await prisma.riskEvent.findFirst({
        where: { id, tenantCompanyId: companyId },
        select: { ingestionDetails: true, status: true },
      })
    : await prisma.threatEvent.findFirst({
        where: { id, tenantCompanyId: companyId },
        select: { ingestionDetails: true, status: true },
      });

  if (!row) return { ok: false, error: "Threat not found or access denied." };

  const base = parseIngestionDetailsForMerge(row.ingestionDetails);
  const entityOk =
    base.entityType === CHAOS_DRILL_ENTITY_TYPE ||
    base.chaosDrillEntityType === CHAOS_DRILL_ENTITY_TYPE;
  if (!entityOk) {
    return { ok: false, error: "Lifecycle applies only when entityType is CHAOS_DRILL." };
  }

  if (
    row.status === ThreatState.RESOLVED ||
    (typeof base.chaosDrillResolutionAt === "string" && base.chaosDrillResolutionAt.trim())
  ) {
    return { ok: true };
  }

  const level = chaosScenarioToInternalDrillLevel(base.chaosScenario);
  const operatorId = IRONTECH_CHAOS_AUDIT_OPERATOR_ID;
  const plane = useRiskEventTable ? "shadow" : "prod";

  const lifecycleHandoffs: Record<
    1 | 2 | 3 | 4,
    {
      assigneeId: string | null;
      assigneeDisplay: string;
      actorLabel: string;
      phase: string;
      status: ThreatState;
      integrityEventType: string;
    }
  > = {
    1: {
      assigneeId: CHAOS_ASSIGNEE_IRONGATE_14,
      assigneeDisplay: CHAOS_WORKFORCE_ASSIGNEE_LABELS.IRONGATE_14,
      actorLabel: "Irongate (Agent 14)",
      phase: "T0_DMZ_IRONGATE",
      status: ThreatState.IDENTIFIED,
      integrityEventType: "CHAOS_DRILL_LIFECYCLE_STEP1_ASSIGN",
    },
    2: {
      assigneeId: CHAOS_ASSIGNEE_IRONSCRIBE_5,
      assigneeDisplay: CHAOS_WORKFORCE_ASSIGNEE_LABELS.IRONSCRIBE_5,
      actorLabel: "Ironscribe (Agent 5)",
      phase: "T2_REGISTRATION_IRONSCRIBE",
      status: ThreatState.CONFIRMED,
      integrityEventType: "CHAOS_DRILL_LIFECYCLE_STEP2_CONFIRMED",
    },
    3: {
      assigneeId: CHAOS_ASSIGNEE_IRONTECH_11,
      assigneeDisplay: CHAOS_WORKFORCE_ASSIGNEE_LABELS.IRONTECH_11,
      actorLabel: "Irontech (Agent 11)",
      phase: "T4_REMEDIATION_IRONTECH",
      status: ThreatState.MITIGATED,
      integrityEventType: "CHAOS_DRILL_LIFECYCLE_STEP3_SUBMITTED",
    },
    4: {
      assigneeId: CHAOS_ASSIGNEE_SYSTEM,
      assigneeDisplay: CHAOS_WORKFORCE_ASSIGNEE_LABELS.SYSTEM,
      actorLabel: "System/Observer",
      phase: "T12_RESOLUTION_SYSTEM",
      status: ThreatState.RESOLVED,
      integrityEventType: "CHAOS_DRILL_LIFECYCLE_STEP4_RESOLVED",
    },
  };

  const cfg = lifecycleHandoffs[step];

  try {
    const handoff = await appendAssigneeHistory({
      plane,
      threatId: id,
      tenantCompanyId: companyId,
      assigneeId: cfg.assigneeId,
      assigneeDisplay: cfg.assigneeDisplay,
      actorLabel: cfg.actorLabel,
      operatorId,
      phase: cfg.phase,
      narrative:
        step === 4
          ? chaosIrontechLifecycleClosureWorkNote(level)
          : `[CHAOS_DRILL] Gate ${step} — ${cfg.assigneeDisplay}`,
      integrityEventType: cfg.integrityEventType,
      prodExtra: plane === "prod" ? { status: cfg.status } : undefined,
      shadowExtra: plane === "shadow" ? { status: cfg.status } : undefined,
    });
    if (!handoff.ok) {
      return { ok: false, error: handoff.error };
    }

    if (step === 2) {
      await logIrontechChaosDrillGateActivity(id, useRiskEventTable, "THREAT_CONFIRMED", { gate: 2 });
    } else if (step === 3) {
      await logIrontechChaosDrillGateActivity(id, useRiskEventTable, "ATTESTATION_SUBMITTED", {
        gate: 3,
      });
    } else if (step === 4) {
      await logIrontechChaosDrillGateActivity(id, useRiskEventTable, "THREAT_RESOLVED", { gate: 4 });
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
): Promise<{ ok: true; financialRisk_cents: number } | { ok: false; error: string }> {
  const id = threatId?.trim();
  if (!id) return { ok: false, error: "Missing threat id." };

  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) {
    return { ok: false, error: "Missing company context for tenant isolation." };
  }
  const useRiskEventTable = await ingressUsesRiskEventTable();

  for (let s = 1; s <= 4; s++) {
    if (s > 1) {
      await new Promise<void>((r) => setTimeout(r, CHAOS_DRILL_LIFECYCLE_GATE_DELAY_MS));
    }
    const next = await executeChaosDrillIrontechLifecycleStepAction(id, s as 1 | 2 | 3 | 4);
    if (!next.ok) return next;
  }

  const row = useRiskEventTable
    ? await prisma.riskEvent.findFirst({
        where: { id, tenantCompanyId: companyId },
        select: { financialRisk_cents: true },
      })
    : await prisma.threatEvent.findFirst({
        where: { id, tenantCompanyId: companyId },
        select: { financialRisk_cents: true },
      });

  const cents =
    row?.financialRisk_cents != null ? Number(row.financialRisk_cents) : 0;
  return { ok: true, financialRisk_cents: cents };
}

/**
 * Single tenant-isolated transition: terminal line + assignee handoff + row assignee.
 * Uses `getCompanyIdForActiveTenant()` — no cross-tenant writes.
 */
export async function applyChaosShadowDrillTelemetryStepAction(
  threatId: string,
  step: ChaosShadowDrillTelemetryStep,
): Promise<
  | { ok: true; ingestionDetails: string; gavelStruck?: boolean; resolvedAt?: string }
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

  const useRiskEventTable = await ingressUsesRiskEventTable();
  const at = new Date().toISOString();
  const tone = step.terminalTone ?? "amber";

  try {
    const row = useRiskEventTable
      ? await prisma.riskEvent.findFirst({
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
    const mergedJson = mergeIngestionDetailsPatchJson(row.ingestionDetails, patch);
    const mergedStr = mergeIngestionDetailsPatch(row.ingestionDetails, patch);

    const plane = useRiskEventTable ? "shadow" : "prod";
    const isT12 = step.phase === "T12_RESOLUTION_SYSTEM";
    const forensicJustification = `[${step.phase}] ${step.directiveId}: ${trimmed.slice(0, 800)}`;

    const entityFromIngestion =
      (base as { entityType?: unknown }).entityType ??
      (base as { chaosDrillEntityType?: unknown }).chaosDrillEntityType;
    const isChaosDrillRow = entityFromIngestion === CHAOS_DRILL_ENTITY_TYPE;

    const persistenceIngestionShadow: Prisma.InputJsonValue =
      isT12 && isChaosDrillRow
        ? mergeIngestionDetailsPatchJson(mergedJson, {
            chaosDrillEntityType: CHAOS_DRILL_ENTITY_TYPE,
            chaosDrillResolutionAt: at,
          })
        : mergedJson;

    const persistenceIngestionProd: string =
      isT12 && isChaosDrillRow
        ? mergeIngestionDetailsPatch(mergedStr, {
            chaosDrillEntityType: CHAOS_DRILL_ENTITY_TYPE,
            chaosDrillResolutionAt: at,
          })
        : mergedStr;

    const persistenceIngestionForReturn =
      normalizeIngestionDetailsToString(
        useRiskEventTable ? persistenceIngestionShadow : persistenceIngestionProd,
      ) ?? "";

    const isGavel =
      isT12 && step.directiveId === CHAOS_DIRECTIVE.T12_SYSTEM_CONCLUSION;

    const handoffBase = {
      plane,
      threatId: id,
      tenantCompanyId: companyId,
      operatorId: IRONTECH_CHAOS_AUDIT_OPERATOR_ID,
      narrative: forensicJustification,
      ingestionDetails: persistenceIngestionForReturn,
    } as const;

    let gavelStruck = false;
    let resolvedAt: string | undefined;

    if (isGavel) {
      const tenantUuid = await getActiveTenantUuidFromCookies();
      if (!tenantUuid) {
        return { ok: false, error: "Missing tenant context for forensic gavel." };
      }
      const gavel = await strikeForensicGavel({
        ...handoffBase,
        tenantUuid,
        narrative: forensicJustification,
      });
      if (!gavel.ok) return { ok: false, error: gavel.error };
      gavelStruck = true;
      resolvedAt = gavel.resolvedAt;
    } else if (step.phase === "T0_DMZ_IRONGATE") {
      const handoff = await handoffWorkforceAgent("IRONGATE", {
        ...handoffBase,
        integrityEventType: "CHAOS_ASSIGNEE_HANDOFF",
      });
      if (!handoff.ok) return { ok: false, error: handoff.error };
    } else if (step.phase === "T2_REGISTRATION_IRONSCRIBE") {
      const handoff = await handoffWorkforceAgent("IRONSCRIBE", {
        ...handoffBase,
        integrityEventType: "CHAOS_ASSIGNEE_HANDOFF",
      });
      if (!handoff.ok) return { ok: false, error: handoff.error };
    } else if (step.phase === "T4_REMEDIATION_IRONTECH") {
      const handoff = await handoffWorkforceAgent("IRONTECH", {
        ...handoffBase,
        integrityEventType: "CHAOS_ASSIGNEE_HANDOFF",
      });
      if (!handoff.ok) return { ok: false, error: handoff.error };
    } else {
      const handoff = await appendAssigneeHistory({
        ...handoffBase,
        assigneeId: step.assigneeId.trim(),
        assigneeDisplay: step.assigneeLabel,
        actorLabel: step.assigneeLabel.split("·")[0]?.trim() || step.assigneeLabel,
        phase: step.phase,
        integrityEventType: "CHAOS_ASSIGNEE_HANDOFF",
      });
      if (!handoff.ok) return { ok: false, error: handoff.error };
    }

    await logChaosAgentMovementActivity({ threatId: id, useRiskEventTable, step });

    if (isT12) {
      revalidatePath("/");
      revalidatePath("/control-room");
    }
    revalidatePath("/", "layout");
    revalidatePath("/integrity");
    return {
      ok: true,
      ingestionDetails: persistenceIngestionForReturn,
      ...(gavelStruck ? { gavelStruck: true, resolvedAt } : {}),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/** L4 — run isolated remote-support drill after Attack Velocity hold (row must still be `IDENTIFIED`). */
export async function runRemoteSupportChaosDrillAction(
  threatId: string,
  clientAttribution?: ChaosClientAttribution | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = threatId?.trim();
  if (!id) {
    return { ok: false, error: "Missing threat id." };
  }
  try {
    await resolveChaosInjectAttribution(clientAttribution);
    const phaseResult = await applyChaosScenario4AutomatedPhaseAction(id);
    if (!phaseResult.ok) {
      return phaseResult;
    }
    revalidatePath("/", "layout");
    revalidatePath("/integrity");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/**
 * Scenario 4 automated failure phase (Steps 1–3) — pre-computes forensic lines and locks
 * `AWAITING_JIT_GRANT` on an existing chaos row after Attack Velocity hold.
 */
export async function applyChaosScenario4AutomatedPhaseAction(
  threatId: string,
  tenantUuidOverride?: string,
): Promise<{ ok: true; threatId: string } | { ok: false; error: string }> {
  const id = threatId.trim();
  if (!id) return { ok: false, error: "Missing threat id." };

  const simRow = await prisma.riskEvent.findFirst({
    where: { id },
    select: { ingestionDetails: true, tenantCompanyId: true },
  });
  const prodRow = simRow
    ? null
    : await prisma.threatEvent.findUnique({
        where: { id },
        select: { ingestionDetails: true, tenantCompanyId: true },
      });
  const row = simRow ?? prodRow;
  if (!row?.tenantCompanyId) {
    return { ok: false, error: "Threat not found." };
  }

  const existingRaw =
    simRow != null
      ? normalizeIngestionDetailsToString(simRow.ingestionDetails) ?? "{}"
      : (prodRow?.ingestionDetails ?? "{}");

  const base = parseIngestionDetailsForMerge(existingRaw);
  const tenantFromRow =
    typeof base.tenantScopeUuid === "string" ? base.tenantScopeUuid.trim() : "";
  const activeTenantUuid = tenantUuidOverride?.trim()
    ? await resolveTenantUuidForThreatScope(tenantUuidOverride.trim())
    : tenantFromRow || (await getScopedTenantUuidFromCookies());
  if (!activeTenantUuid) {
    return {
      ok: false,
      error: "IRONGATE_SHIELD: Mandatory tenant context execution token missing.",
    };
  }
  validateIngressContext(activeTenantUuid);

  const companyId = row.tenantCompanyId;
  const s4Patch = buildChaosScenario4InitialIngestion(activeTenantUuid, companyId);

  const patchResult = await patchRemoteSupportDrillIngestion(
    id,
    s4Patch,
    "CHAOS_L4_AUTOMATED_PHASE_COMPLETE",
    ThreatState.MITIGATED,
  );
  if (!patchResult.success) {
    return { ok: false, error: patchResult.error };
  }

  return { ok: true, threatId: id };
}

/**
 * Scenario 4 bootstrap — creates a pre-computed L4 threat at `AWAITING_JIT_GRANT` (Steps 1–3 complete).
 */
export async function injectChaosScenario4Action(
  tenantUuidOverride?: string,
): Promise<
  | { ok: true; threatId: string; tenantCompanyId: string }
  | { ok: false; error: string }
> {
  try {
    const activeTenantUuid = tenantUuidOverride?.trim()
      ? await resolveTenantUuidForThreatScope(tenantUuidOverride.trim())
      : await getScopedTenantUuidFromCookies();
    if (!activeTenantUuid) {
      return {
        ok: false,
        error: "IRONGATE_SHIELD: Mandatory tenant context execution token missing.",
      };
    }
    validateIngressContext(activeTenantUuid);

    let companyId = await getCompanyIdForTenantUuid(activeTenantUuid);
    if (companyId == null) {
      await prisma.tenant.upsert({
        where: { id: activeTenantUuid },
        create: {
          id: activeTenantUuid,
          name: "Ironchaos Bootstrap Tenant",
          slug: `chaos-${activeTenantUuid.slice(0, 8)}`,
          industry: "Secure Enclave",
        },
        update: {},
      });
      const company = await prisma.company.create({
        data: {
          name: "Chaos Lab Co",
          sector: "Technology",
          tenantId: activeTenantUuid,
          isTestRecord: true,
        },
        select: { id: true },
      });
      companyId = company.id;
    }

    const agentIngress = buildChaosAgentIngressPayload("REMOTE_SUPPORT", CHAOS_L4_CARD_TITLE);
    const ingestionDetails = mergeAgentIngressIntoIngestionJson(
      buildChaosScenario4InitialIngestion(activeTenantUuid, companyId),
      agentIngress,
    );

    const created = await ingressGateway.writeThreatEvent({
      title: CHAOS_L4_CARD_TITLE,
      sourceAgent: chaosIngressSourceAgent("REMOTE_SUPPORT"),
      score: 10,
      targetEntity: "ChaosLab",
      financialRisk_cents: 0n,
      status: ThreatState.MITIGATED,
      tenantCompanyId: companyId,
      ingestionDetails:
        typeof ingestionDetails === "string" ? ingestionDetails : JSON.stringify(ingestionDetails),
      ttlSeconds: 259_200,
      assigneeId: CHAOS_ASSIGNEE_IRONGATE_14,
      aiReport: "ATTACK_BOT: Controlled chaos ingress (Irontech L4 remote support drill).",
    });

    revalidatePath("/", "layout");
    revalidatePath("/integrity");
    return { ok: true, threatId: created.id, tenantCompanyId: companyId.toString() };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/** Scenario 4 JIT gate — customer analyst grants access; hands off to Ironframe Tech Support (no auto-resolve). */
export async function grantRemoteAccessAction(
  threatId: string,
  clientAttribution?: ChaosClientAttribution | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = threatId?.trim();
  if (!id) {
    return { ok: false, error: "Missing threat id." };
  }

  const simRow = await prisma.riskEvent.findFirst({
    where: { id },
    select: { status: true, ingestionDetails: true, tenantCompanyId: true },
  });
  const prodRow = simRow
    ? null
    : await prisma.threatEvent.findUnique({
        where: { id },
        select: { status: true, ingestionDetails: true },
      });
  const row = simRow ?? prodRow;
  if (!row) {
    return { ok: false, error: "Threat not found." };
  }

  const ingestionRaw =
    simRow != null
      ? normalizeIngestionDetailsToString(simRow.ingestionDetails) ?? "{}"
      : (prodRow?.ingestionDetails ?? "{}");

  const l4 = parseChaosL4LifecycleFromIngestion(ingestionRaw);
  if (!l4) {
    return {
      ok: false,
      error: "Only Scenario 4 (Remote Support) chaos drills use this grant action.",
    };
  }

  const statusRaw = String(row.status ?? "").trim().toUpperCase();
  if (
    statusRaw !== ThreatState.MITIGATED &&
    !isChaosL4AwaitingJitGrant(statusRaw, ingestionRaw)
  ) {
    return { ok: false, error: "Threat is not awaiting remote authorization." };
  }

  if (l4.lifecycleStep !== "AWAITING_JIT_GRANT" && !l4.remoteSupportJitAwaitingGrant) {
    return { ok: false, error: "JIT grant already issued for this ticket." };
  }

  console.log("[S4] Customer analyst granted JIT — handing off to Ironframe Tech Support.");
  try {
    const grantedAt = new Date().toISOString();
    const ledgerAttribution = await resolveChaosInjectAttribution(clientAttribution);
    const handoffPatch = buildChaosL4LifecyclePatch({
      lifecycleStep: "JIT_GRANTED",
      assignedRole: "IRONFRAME_TECH_SUPPORT",
      remoteSupportJitAwaitingGrant: false,
      jitGrantedAt: grantedAt,
      chaosRemoteAccessGrantedAt: grantedAt,
    });
    if (ledgerAttribution.userId) {
      handoffPatch.grantIssuedBy = ledgerAttribution.userId as unknown as Prisma.InputJsonValue;
      handoffPatch.grantIssuedByDisplay =
        ledgerAttribution.displayName as unknown as Prisma.InputJsonValue;
    }

    const patchResult = await patchRemoteSupportDrillIngestion(
      id,
      handoffPatch,
      "CHAOS_L4_JIT_GRANTED",
      ThreatState.MITIGATED,
    );
    if (!patchResult.success) {
      return { ok: false, error: patchResult.error };
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

/** Step 5 — Ironframe Tech Support claims the L4 ticket for investigation. */
export async function claimRemoteSupportTechAction(
  threatId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = threatId?.trim();
  if (!id) return { ok: false, error: "Missing threat id." };

  const simRow = await prisma.riskEvent.findFirst({
    where: { id },
    select: { ingestionDetails: true },
  });
  const prodRow = simRow
    ? null
    : await prisma.threatEvent.findUnique({
        where: { id },
        select: { ingestionDetails: true },
      });
  const row = simRow ?? prodRow;
  if (!row) return { ok: false, error: "Threat not found." };

  const ingestionRaw =
    simRow != null
      ? normalizeIngestionDetailsToString(simRow.ingestionDetails) ?? "{}"
      : (prodRow?.ingestionDetails ?? "{}");

  if (!isChaosL4ReadyForTechClaim(ingestionRaw)) {
    return { ok: false, error: "Ticket is not ready for tech claim (grant access first)." };
  }

  const claimedAt = new Date().toISOString();
  const patchResult = await patchRemoteSupportDrillIngestion(
    id,
    buildChaosL4LifecyclePatch({
      lifecycleStep: "TECH_INVESTIGATING",
      assignedRole: "IRONFRAME_TECH_SUPPORT",
      techClaimedAt: claimedAt,
    }),
    "CHAOS_L4_TECH_CLAIMED",
    ThreatState.MITIGATED,
  );
  if (!patchResult.success) {
    return { ok: false, error: patchResult.error };
  }

  revalidatePath("/", "layout");
  revalidatePath("/integrity");
  return { ok: true };
}

/** Step 6–7 — tech work log + resolve; archives only when role + work-performed gate passes. */
export async function resolveRemoteSupportTechWorkAction(
  threatId: string,
  workPerformed: string,
  clientAttribution?: ChaosClientAttribution | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = threatId?.trim();
  if (!id) return { ok: false, error: "Missing threat id." };

  const trimmed = workPerformed.trim();
  if (trimmed.length < CHAOS_L4_WORK_PERFORMED_MIN_CHARS) {
    return {
      ok: false,
      error: `Work-performed log must be at least ${CHAOS_L4_WORK_PERFORMED_MIN_CHARS} characters.`,
    };
  }

  const simRow = await prisma.riskEvent.findFirst({
    where: { id },
    select: { ingestionDetails: true },
  });
  const prodRow = simRow
    ? null
    : await prisma.threatEvent.findUnique({
        where: { id },
        select: { ingestionDetails: true },
      });
  const row = simRow ?? prodRow;
  if (!row) return { ok: false, error: "Threat not found." };

  const ingestionRaw =
    simRow != null
      ? normalizeIngestionDetailsToString(simRow.ingestionDetails) ?? "{}"
      : (prodRow?.ingestionDetails ?? "{}");

  const l4 = parseChaosL4LifecycleFromIngestion(ingestionRaw);
  if (!l4) {
    return { ok: false, error: "Only Scenario 4 (Remote Support) chaos drills use this action." };
  }
  if (l4.assignedRole !== "IRONFRAME_TECH_SUPPORT") {
    return { ok: false, error: "Only Ironframe Tech Support may close this ticket." };
  }
  if (!isChaosL4TechInvestigating(ingestionRaw)) {
    return { ok: false, error: "Claim the ticket before submitting work performed." };
  }

  if (!canArchiveChaosL4(
    mergeIngestionDetailsPatch(ingestionRaw, { workPerformed: trimmed }),
  )) {
    return {
      ok: false,
      error: "Archive gate blocked — work-performed narrative incomplete.",
    };
  }

  const ledgerAttribution = await resolveChaosInjectAttribution(clientAttribution);
  await patchRemoteSupportDrillIngestion(
    id,
    buildChaosL4LifecyclePatch({ workPerformed: trimmed }),
    "CHAOS_L4_TECH_WORK_LOGGED",
    ThreatState.MITIGATED,
  );

  const finalize = await finalizeRemoteSupportTechResolution(id, trimmed, ledgerAttribution);
  if (!finalize.success) {
    return { ok: false, error: finalize.error };
  }

  revalidatePath("/", "layout");
  revalidatePath("/integrity");
  return { ok: true };
}

/**
 * Phone Home protocol — diagnostic packet + optional Ironcast email when `agentOperationId` is provided.
 * Canonical escalation email path: {@link sendPhoneHomeEmail}.
 */
export async function triggerPhoneHome(
  threatId: string,
  agentOperationId?: string | null,
): Promise<
  | { ok: true; diagnostic: PhoneHomeDiagnosticPacket; email?: { to: string; messageId?: string } }
  | { ok: false; error: string }
> {
  const id = threatId?.trim();
  if (!id) {
    return { ok: false, error: "Missing threat id." };
  }
  const diagnostic = await commitPhoneHome(id);
  const opId = agentOperationId?.trim();
  if (!opId) {
    return { ok: true, diagnostic };
  }
  const sent = await sendPhoneHomeEmail(id, opId);
  if (!sent.success) {
    return { ok: false, error: sent.error };
  }
  return { ok: true, diagnostic, email: { to: sent.to, messageId: sent.messageId } };
}

/**
 * “Despatched human” simulation — remote specialist dispatch + `MITIGATED` queue (`dispatchRemoteSupportAction`).
 */
export async function despatchedHumanSim(threatId: string) {
  return dispatchRemoteSupportAction(threatId);
}
