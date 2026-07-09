'use server';

import { createHash, createHmac, randomUUID } from "crypto";
import { revalidatePath } from 'next/cache';
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { auditLogCreateLoose, auditLogCreateLooseTx } from "@/lib/auditLogLoose";
import type { Prisma } from "@prisma/client";
import {
  EventSource,
  ThreatState,
  DeAckReason,
  AgentOperationStatus,
  SimThreatSource,
  ComplianceFramework,
  type UserRole,
} from '@prisma/client';
import { executeWithRetry, type ExecuteWithRetryResult } from '@/app/utils/irontechResilience';
import {
  isRemoteAccessAdminEligible,
  requireSupabaseAdminOrOwnerForRemoteAccess,
} from '@/app/utils/serverAuth';
import { sendThreatConfirmationEmail, routeRiskNotification, sendRiskNotification } from '@/app/actions/email';
import {
  mergeIngestionDetailsPatch,
  mergeIngestionDetailsPatchJson,
  parseIngestionDetailsForMerge,
} from '@/app/utils/ingestionDetailsMerge';
import { chaosAcknowledgeBlockedByDiscoveryHold } from "@/app/utils/chaosDiscoveryHold";
import { bumpSentinelLaborTracker, finalizeSentinelLaborAtClose } from "@/app/utils/sentinelLaborTracker";
import { isGrcInfrastructureLimitMessage } from '@/app/utils/grcInfrastructureLimit';
import { logThreatActivity } from '@/app/actions/auditActions';
import { recordSustainabilityImpact } from '@/app/actions/sustainabilityActions';
import { grcGatePass, getGrcThresholdCents } from '@/app/utils/grcGate';
import { getPrimaryThreatNotificationRecipient } from '@/app/utils/threatNotificationRecipients';
import { shadowReceiptAuditStub } from '@/app/lib/grc/threatReceipt';
import { workNoteSchema } from '@/app/utils/irongateSchema';
import {
  assigneeKeyToDisplayName,
  normalizeAssigneeOptionLabel,
  operatorIdToDisplayName,
} from '@/app/utils/assignmentChainOfCustody';
import { getCompanyIdForActiveTenant } from '@/app/lib/grc/clearanceThreatResolve';
import {
  getScopedTenantUuidFromCookies,
  resolveTenantUuidForThreatScope,
} from '@/app/utils/serverTenantContext';
import {
  hitlCategoryRequiresCisoAdmin,
  hitlTenantScopeLabel,
  parseHitlCategoryFromApprovalNote,
  type HitlReviewCategory,
} from '@/app/utils/hitlReviewQueue';
import {
  resolveDevConstitutionalAuthorityUserId,
  userHasAnyApproverRoleOrDevElevation,
} from "@/app/lib/grc/devConstitutionalElevation";
import { isShadowPlaneActiveFromEnv } from '@/app/utils/shadowPlaneActive';
import { buildChaosFinalAckIngestionPatch } from '@/app/config/chaosScenarioTelemetry';
import {
  parseAgentIngressFromIngestion,
  type AgentSuggestedRemediationOption,
} from "@/app/utils/agentIngressJustification";
import { isChaosForensicGavelClosed } from "@/app/utils/chaosForensicClosure";
import { CHAOS_ASSIGNEE_IRONTECH_04 } from "@/app/config/chaosShadowAudit";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import { integrityService } from "@/src/services/integrityService";
import { transitionThreatStatus, updateThreatWithIntegrity } from "@/src/services/threatStateService";
import { buildWormAuditedBypassLabel } from "@/app/lib/evidence/threatEventWormGuard";
import { runAuditedThreatEventWormBypass } from "@/app/lib/prisma/threatEventWormBypass";
import { attachEvidenceToThreat } from "@/app/actions/evidenceActions";
import { readSimulationPlaneEnabled } from "@/app/lib/security/ingressGateway";
import { isControlStressTestIngestion } from "@/app/utils/controlStressTestIngestion";
import { assertHumanThreatAssigneeForResolution } from "@/app/utils/threatAssigneeGate";
import { computeTasMdSha256HexFromDiskSync } from "@/app/lib/tasMdIntegrity";
import {
  assertForensicAttestationLengthForContext,
  assertTasMdIntegrityOrThrow,
  getRequiredForensicAttestationMin,
  isConstitutionalDegradedMode,
} from "@/app/utils/tasFingerprint";
import { assessTasMdIntegritySync } from "@/app/lib/tasMdIntegrity";
import { runShadowMarketVolatilityExpertLifecycleHook } from "@/app/actions/agentActions";
import { recordResilienceIntelStreamLine } from "@/app/actions/resilienceIntelStreamActions";
import {
  buildDualTimestamps,
  getExpertAssigneeDisplay,
  getExpertAssigneeKey,
  getExpertJustification,
  getExpertTitle,
  needsExpertHandoff,
  resolveExpertAgentName,
  type ExpertAgentCanonicalName,
} from "@/app/config/expertAgentPersona";
import {
  ironscribeChainOfCustodyLine,
  ironscribeClerkFormat,
  ironscribeLifecycleActionForGate,
} from "@/app/utils/ironscribeNarrative";
import { executeExpertSelfCorrectingObservation } from "@/app/lib/expertSelfCorrection";
import { generateAndAttachPostMortemReport } from "@/app/utils/postMortemReportService";
import { getHighScrutinyAuditFields } from "@/src/services/ironlock/validationRules";
import {
  listPendingThreatResolutionsCore,
  type PendingThreatResolutionItem,
} from "@/app/lib/server/ironsightReviewQueueCore";

/** Threat resolution approve / reject / review — program leadership. */
const THREAT_RESOLUTION_APPROVER_ROLES: UserRole[] = [
  "GRC_MANAGER",
  "GLOBAL_ADMIN",
  "CISO",
  "DIRECTOR_OF_COMPLIANCE",
];

/** Financial / breach HITL attestations — CISO or ADMIN (GLOBAL_ADMIN) only. */
const HITL_CISO_ADMIN_ROLES: UserRole[] = ["CISO", "GLOBAL_ADMIN"];

async function actorMayReviewHitlApproval(
  sessionUser: Awaited<ReturnType<typeof getSupabaseSessionUser>>,
  userId: string,
  tenantUuid: string,
  category: HitlReviewCategory,
  handshakeRaw: string | undefined,
): Promise<boolean> {
  const devUid = await resolveDevConstitutionalAuthorityUserId(sessionUser, tenantUuid);
  if (devUid) return true;

  const elevated = hitlCategoryRequiresCisoAdmin(category);
  const handshake = (handshakeRaw ?? "").trim().toUpperCase();
  if (elevated) {
    if (handshake === "CISO" || handshake === "ADMIN") return true;
    const row = await prisma.userRoleAssignment.findFirst({
      where: {
        userId,
        tenantId: tenantUuid,
        role: { in: [...HITL_CISO_ADMIN_ROLES] },
      },
      select: { id: true },
    });
    return row != null;
  }
  const row = await prisma.userRoleAssignment.findFirst({
    where: {
      userId,
      tenantId: tenantUuid,
      role: { in: [...THREAT_RESOLUTION_APPROVER_ROLES] },
    },
    select: { id: true },
  });
  if (row) return true;
  if (handshake === "CISO" || handshake === "ADMIN") return true;
  return false;
}

type AcknowledgeThreatGateResolved =
  | {
      plane: "prod";
      row: {
        financialRisk_cents: bigint;
        sourceAgent: string;
        status: ThreatState;
        createdAt: Date;
        ingestionDetails: string | null;
        targetEntity: string;
      };
    }
  | {
      plane: "shadow";
      row: {
        financialRisk_cents: bigint;
        sourceAgent: string;
        status: ThreatState;
        createdAt: Date;
        ingestionDetails: Prisma.JsonValue | null;
        targetEntity: string;
      };
    };

type AcknowledgeResolvedThreat =
  | { plane: "prod"; row: { financialRisk_cents: bigint; sourceAgent: string } }
  | { plane: "shadow"; row: { financialRisk_cents: bigint; sourceAgent: string } };

/** Strict tenant isolation: production first, then shadow — same `tenantCompanyId` scope for both planes. */
async function resolveThreatForAcknowledge(
  threatId: string,
  companyId: bigint | null,
): Promise<AcknowledgeResolvedThreat | null> {
  const grcSelect = { financialRisk_cents: true, sourceAgent: true } as const;
  if (companyId == null) return null;

  const prod = await prisma.threatEvent.findFirst({
    where: { id: threatId, tenantCompanyId: companyId },
    select: grcSelect,
  });
  if (prod) return { plane: 'prod', row: prod };

  const sim = await prisma.riskEvent.findFirst({
    where: { id: threatId, tenantCompanyId: companyId },
    select: grcSelect,
  });
  if (sim) return { plane: 'shadow', row: sim };
  return null;
}
const prismaDelegates = prisma as unknown as {
  threatEvent?: {
    findUnique: (args: unknown) => Promise<{ id: string } | null>;
    update: (args: unknown) => Promise<any>;
  };
  auditLog?: {
    create: (args: unknown) => Promise<any>;
  };
  workNote?: {
    create: (args: unknown) => Promise<any>;
  };
};

const AUDIT_LOG_FAILURE =
  'AUDIT_LOG_FAILURE: Cannot log action for non-existent Threat ID.';
const GRC_PROTOCOL_VIOLATION =
  "GRC_PROTOCOL_VIOLATION: Missing approved attestation or evidence artifact.";

/** Kimbot System Integrity drill: vault manifest satisfies evidence gate when no DMZ attachment exists. */
const SIM_MANIFEST_EVIDENCE_URL = "https://vault.internal/sim-manifest.pdf";

const GRC_CISO_SIMULATION_AUTH_EVENT = "[GRC] CISO Simulation Authorization";

/** Human-processing gates between expert lifecycle steps (Audit Intelligence / forensic rhythm). */
const EXPERT_LIFECYCLE_GATE_MS = 5000;

/** Infiltration drill toggles AUTONOMOUS ↔ HYBRID per run (module scope — dev/sim harness). */
let infiltrationDrillLastMode: "AUTONOMOUS" | "HYBRID" = "HYBRID";

const PANIC_ABORT = "PANIC_ABORT";

function mappedControlsForFramework(framework: ComplianceFramework): string[] {
  if (framework === "ISO27001") return ["ISO27001 Annex A.8.2"];
  if (framework === "NIST") return ["NIST PR.AC-3"];
  return ["SOC2 CC6.1"];
}

/** Reads global panic from DB without relying on freshly regenerated Prisma typings (EPERM on Windows generate). */
async function readWorkforcePanic(): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<Array<{ workforce_panic_passive_monitor: boolean }>>`
      SELECT workforce_panic_passive_monitor FROM simulation_config WHERE id = 'global' LIMIT 1
    `;
    return rows[0]?.workforce_panic_passive_monitor === true;
  } catch {
    return false;
  }
}

async function engageWorkforcePanicRecord(authorityLabel: string): Promise<void> {
  const label = authorityLabel.slice(0, 128);
  await prisma.$executeRaw`
    UPDATE simulation_config SET
      workforce_panic_passive_monitor = true,
      workforce_panic_engaged_at = NOW(),
      workforce_panic_authority_label = ${label},
      updated_at = NOW()
    WHERE id = 'global'
  `;
}

async function patchWorkforcePanicFreeze(args: {
  threatId: string;
  isSim: boolean;
  frozenAfterGate: number;
}): Promise<void> {
  const msg = ironscribeClerkFormat({
    agent: "Ironscribe",
    action: "PANIC_GATE_FREEZE",
    rawFacts: `Manual override engaged during expert lifecycle; progression halted after gate ${args.frozenAfterGate}. Workforce passive monitor — read-only observation.`,
  });
  if (args.isSim) {
    const snap = await prisma.riskEvent.findFirst({
      where: { id: args.threatId },
      select: { ingestionDetails: true },
    });
    const merged = mergeIngestionDetailsPatchJson(snap?.ingestionDetails ?? null, {
      expertPanicFrozenAfterGate: args.frozenAfterGate,
      expertPanicFreezeNote: msg,
    });
    await prisma.riskEvent.updateMany({
      where: { id: args.threatId },
      data: { ingestionDetails: merged },
    });
  } else {
    await prisma.workNote.create({
      data: {
        threatId: args.threatId,
        text: msg,
        operatorId: "Ironscribe",
      },
    });
  }
}

function inferExpertThreatTypeFromRow(args: {
  ingestionDetails: string | Prisma.JsonValue | null | undefined;
  title?: string | null;
}): string {
  try {
    const j = parseIngestionDetailsForMerge(args.ingestionDetails ?? null);
    const parts: string[] = [];
    if (typeof j.entityType === "string" && j.entityType.trim()) parts.push(j.entityType.trim());
    if (typeof j.chaosScenario === "string" && j.chaosScenario.trim()) parts.push(j.chaosScenario.trim());
    const raw = j as Record<string, unknown>;
    if (typeof raw.sourceAgent === "string" && raw.sourceAgent.trim()) parts.push(raw.sourceAgent.trim());
    if (parts.length) return parts.join(" / ");
  } catch {
    /* ignore */
  }
  const t = args.title?.trim();
  return t && t.length > 0 ? t.slice(0, 120) : "GENERIC";
}

/** Broad signal string for handoff matrix (ingestion classification + title tokens). */
function inferExpertThreatSignalForHandoff(row: {
  ingestionDetails: string | Prisma.JsonValue | null | undefined;
  title?: string | null;
}): string {
  const segments: string[] = [inferExpertThreatTypeFromRow(row)];
  try {
    const j = parseIngestionDetailsForMerge(row.ingestionDetails ?? null) as Record<string, unknown>;
    const keys = [
      "threatClassification",
      "detectedThreatType",
      "threatCategory",
      "category",
      "ironsightThreatType",
      "threatTypeLabel",
    ] as const;
    for (const k of keys) {
      const v = j[k];
      if (typeof v === "string" && v.trim()) segments.push(v.trim());
    }
  } catch {
    /* ignore */
  }
  const tit = row.title?.trim();
  if (tit) segments.push(tit);
  return segments.filter(Boolean).join(" / ");
}

async function logExpertLifecycleGate(args: {
  threatId: string;
  isSim: boolean;
  actionName: string;
  agentCanon: string;
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  threatType: string;
  /** Domain facts for Ironscribe (gates 4–5: custody routing / expert justification). */
  ironscribeRawFacts?: string;
  extra?: Record<string, unknown>;
}): Promise<void> {
  const dual = buildDualTimestamps();
  const clerkAction = ironscribeLifecycleActionForGate(args.step);
  const defaultFacts = (() => {
    switch (args.step) {
      case 1:
        return "Assignee custody and forensic scope established for this threat event.";
      case 2:
        return "Threat disposition confirmed; operator concurrence recorded for downstream attestation.";
      case 3:
        return "Threat classification was reviewed against the constitutional custody matrix; authority scope was recorded.";
      case 4:
        return (
          args.ironscribeRawFacts?.trim() ||
          "Custody posture was evaluated and recorded for this threat event."
        );
      case 5:
        return (
          args.ironscribeRawFacts?.trim() ||
          "Expert analysis committed to the constitutional operational record."
        );
      case 6:
        return "Formal attestation submitted to the GRC control plane.";
      case 7:
        return "Incident neutralized; posture reconciled to last known good alignment.";
      default:
        return "Lifecycle gate recorded under Ironframe governance.";
    }
  })();
  const ironscribeNarrative = ironscribeClerkFormat({
    agent: args.agentCanon,
    action: clerkAction,
    rawFacts: defaultFacts,
  });
  const details = JSON.stringify({
    agentName: args.agentCanon,
    agentTitle: getExpertTitle(args.agentCanon),
    actor: getExpertAssigneeDisplay(args.agentCanon),
    gate: args.step,
    step: args.step,
    threatType: args.threatType,
    clerkAction,
    ironscribeNarrative,
    clerkOperator: "Ironscribe",
    timestampUtc: dual.timestampUtc,
    timestampLocal: dual.timestampLocal,
    ...(args.extra ?? {}),
  });
  /** Ironscribe is the sole clerk identity on audit rows for this path (Task 2). */
  const op = "Ironscribe";
  if (args.isSim) {
    await logThreatActivity(null, args.actionName, details, {
      isSimulation: true,
      simThreatId: args.threatId,
      operatorId: op,
    });
  } else {
    await logThreatActivity(args.threatId, args.actionName, details, { operatorId: op });
  }
}

async function logExpertHandoffInitiated(args: {
  threatId: string;
  isSim: boolean;
  fromAgent: ExpertAgentCanonicalName;
  toAgent: ExpertAgentCanonicalName;
  threatSignal: string;
  reasonKey: string;
}): Promise<void> {
  const dual = buildDualTimestamps();
  const ironscribeNarrative = ironscribeClerkFormat({
    agent: args.fromAgent,
    action: "HANDOFF",
    rawFacts: `Custody referral initiated to ${args.toAgent} under matrix reason ${args.reasonKey}; classification signal: ${args.threatSignal}.`,
  });
  const details = JSON.stringify({
    agentName: args.fromAgent,
    agentTitle: getExpertTitle(args.fromAgent),
    actor: `${getExpertAssigneeDisplay(args.fromAgent)} → ${getExpertAssigneeDisplay(args.toAgent)}`,
    handoffToAgent: args.toAgent,
    handoffToTitle: getExpertTitle(args.toAgent),
    handoffToActor: getExpertAssigneeDisplay(args.toAgent),
    gate: "handoff",
    lifecyclePhase: "HANDOFF_INITIATED",
    threatClassificationSignal: args.threatSignal,
    reasonKey: args.reasonKey,
    ironscribeNarrative,
    timestampUtc: dual.timestampUtc,
    timestampLocal: dual.timestampLocal,
  });
  const op = "Ironscribe";
  if (args.isSim) {
    await logThreatActivity(null, "HANDOFF_INITIATED", details, {
      isSimulation: true,
      simThreatId: args.threatId,
      operatorId: op,
    });
  } else {
    await logThreatActivity(args.threatId, "HANDOFF_INITIATED", details, { operatorId: op });
  }
}

/** Chain-of-custody forensic line — Ironscribe clerk (Task 3). */
async function logExpertChainOfCustody(args: {
  threatId: string;
  isSim: boolean;
  fromAgent: ExpertAgentCanonicalName;
  toAgent: ExpertAgentCanonicalName;
}): Promise<void> {
  const dual = buildDualTimestamps();
  const ironscribeNarrative = ironscribeChainOfCustodyLine(args.fromAgent, args.toAgent);
  const details = JSON.stringify({
    ironscribeNarrative,
    chainOfCustody: true,
    fromAgent: args.fromAgent,
    toAgent: args.toAgent,
    timestampUtc: dual.timestampUtc,
    timestampLocal: dual.timestampLocal,
  });
  const op = "Ironscribe";
  if (args.isSim) {
    await logThreatActivity(null, "CHAIN_OF_CUSTODY", details, {
      isSimulation: true,
      simThreatId: args.threatId,
      operatorId: op,
    });
  } else {
    await logThreatActivity(args.threatId, "CHAIN_OF_CUSTODY", details, { operatorId: op });
  }
}

function resolveTelemetryBotTag(title: string | null | undefined): "[ATTBOT]" | "[KIMBOT]" | "[GRCBOT]" {
  const normalized = (title ?? "").toUpperCase();
  if (normalized.includes("ATTBOT")) return "[ATTBOT]";
  if (normalized.includes("KIMBOT")) return "[KIMBOT]";
  return "[GRCBOT]";
}

/** System Integrity Control Room: Kimbot, Grcbot, or Attbot + chaos test JSON. */
function isSystemIntegrityBotChaosDrillThreatOnServer(args: {
  title: string;
  ingestionDetails: string | Prisma.JsonValue | null | undefined;
}): boolean {
  const title = args.title.trim().toUpperCase();
  const isBotLine =
    title.includes("KIMBOT") || title.includes("GRCBOT") || title.includes("ATTBOT");
  if (!isBotLine) return false;
  try {
    const o = parseIngestionDetailsForMerge(args.ingestionDetails ?? null) as Record<string, unknown>;
    if (o.isChaosTest === true) return true;
  } catch {
    /* ignore */
  }
  return title.includes("SYSTEM INTEGRITY");
}

/** Alias — same rules as `isSystemIntegrityBotChaosDrillThreatOnServer`. */
const isSystemIntegrityKimbotDrillThreatOnServer = isSystemIntegrityBotChaosDrillThreatOnServer;

function ingestionHasVaultSimManifest(
  ingestionDetails: string | Prisma.JsonValue | null | undefined,
): boolean {
  try {
    const o = parseIngestionDetailsForMerge(ingestionDetails ?? null) as Record<string, unknown>;
    return o.evidenceLink === SIM_MANIFEST_EVIDENCE_URL;
  } catch {
    return false;
  }
}

function ingestionAllowsPlaybookEvidenceBypass(
  ingestionDetails: string | Prisma.JsonValue | null | undefined,
): boolean {
  try {
    const o = parseIngestionDetailsForMerge(ingestionDetails ?? null) as Record<string, unknown>;
    const link = typeof o.evidenceLink === "string" ? o.evidenceLink.trim() : "";
    return o.agentPlaybookGatePrimed === true && link.length > 0;
  } catch {
    return false;
  }
}

function findAgentPlaybookOption(
  options: AgentSuggestedRemediationOption[],
  playbookId: string,
): AgentSuggestedRemediationOption | null {
  const id = playbookId.trim();
  if (!id) return null;
  return options.find((o) => o.id === id) ?? null;
}

function parseShadowHandshakeApproval(
  ingestionDetails: string | Prisma.JsonValue | null | undefined,
): {
  resolutionApprovalId: string | null;
  resolutionApprovalStatus: string | null;
} {
  try {
    const j = parseIngestionDetailsForMerge(ingestionDetails ?? null) as {
      shadowCisoHandshake?: {
        resolutionApprovalId?: string;
        resolutionApprovalStatus?: string;
      };
    };
    const h = j?.shadowCisoHandshake;
    const id = typeof h?.resolutionApprovalId === "string" ? h.resolutionApprovalId.trim() : null;
    const st = typeof h?.resolutionApprovalStatus === "string" ? h.resolutionApprovalStatus.trim() : null;
    return { resolutionApprovalId: id, resolutionApprovalStatus: st };
  } catch {
    return { resolutionApprovalId: null, resolutionApprovalStatus: null };
  }
}

function ingestionIsChaosSimulationTest(
  ingestionDetails: string | Prisma.JsonValue | null | undefined,
): boolean {
  try {
    const o = parseIngestionDetailsForMerge(ingestionDetails ?? null) as Record<string, unknown>;
    return o.isChaosTest === true;
  } catch {
    return false;
  }
}

/**
 * Shadow plane: Epic 11 / CISO attestation lives in `ingestionDetails.shadowCisoHandshake`, not `ThreatApproval`.
 * Kimbot System Integrity drill also requires the vault manifest URL on the row.
 */
function simShadowPassesResolutionProtocol(
  title: string,
  ingestionDetails: string | Prisma.JsonValue | null | undefined,
): boolean {
  const shadow = parseShadowHandshakeApproval(ingestionDetails);
  const approved =
    Boolean(shadow.resolutionApprovalId) && shadow.resolutionApprovalStatus === "APPROVED";

  if (isSystemIntegrityBotChaosDrillThreatOnServer({ title, ingestionDetails })) {
    return approved && ingestionHasVaultSimManifest(ingestionDetails);
  }

  if (approved) return true;

  if (ingestionIsChaosSimulationTest(ingestionDetails)) {
    return true;
  }

  if (isControlStressTestIngestion(ingestionDetails)) {
    return true;
  }

  return false;
}

function resolveGrcNotificationRecipient(): string | null {
  return getPrimaryThreatNotificationRecipient();
}

type SecurityBriefThreat = {
  title: string;
  id: string;
  financialRisk_cents: bigint;
  affectedSystem?: string;
  detectingAgent?: string;
};

const CENTS_PER_MILLION = 100_000_000;

function centsToMillions(value: bigint | number | null | undefined): number {
  return Number(value ?? 0) / CENTS_PER_MILLION;
}

/** Dynamic email template: professional security brief with action-type color (CONFIRMED = orange, RESOLVED = green). */
function generateSecurityBrief(threat: SecurityBriefThreat, actionType: 'CONFIRMED' | 'RESOLVED'): string {
  const color = actionType === 'RESOLVED' ? '#16a34a' : '#ea580c';
  const liability = centsToMillions(threat.financialRisk_cents);
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <div style="background-color: #1e3a8a; color: #ffffff; padding: 25px 20px; text-align: center;">
      <h2 style="margin: 0; font-size: 22px; letter-spacing: 2px;">IRONFRAME GRC</h2>
      <p style="margin: 5px 0 0; color: #94a3b8; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Automated Security Brief</p>
    </div>

    <div style="padding: 30px 20px; background-color: #f8fafc;">
      <h3 style="color: #0f172a; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; margin-top: 0;">
        Threat Status: <span style="color: ${color};">${actionType}</span>
      </h3>
      <p style="color: #334155; font-size: 16px; line-height: 1.5;">The following risk profile has been updated in the GRC matrix.</p>

      <table style="width: 100%; border-collapse: collapse; margin-top: 25px; margin-bottom: 25px;">
        <tr>
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9; width: 35%; color: #475569;">Threat Title</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0; background-color: #ffffff; color: #0f172a;">${threat.title}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9; color: #475569;">Tracking ID</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0; background-color: #ffffff; font-family: monospace; color: #64748b;">${threat.id}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9; color: #475569;">Affected System</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0; background-color: #ffffff; color: #0f172a;">${threat.affectedSystem ?? 'Core Infrastructure'}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9; color: #475569;">Detecting Agent</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0; background-color: #ffffff; color: #0f172a;">${threat.detectingAgent ?? 'GRCBOT / CoreIntel'}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #f1f5f9; color: #475569;">Financial Liability</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0; background-color: #ffffff; color: #b91c1c; font-weight: bold;">$${liability}M</td>
        </tr>
      </table>

      <div style="text-align: center; margin-top: 35px; margin-bottom: 10px;">
        <a href="http://localhost:3000/threats/${threat.id}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 15px;">Review in Dashboard</a>
      </div>
    </div>

    <div style="background-color: #e2e8f0; color: #64748b; padding: 15px; text-align: center; font-size: 12px;">
      <p style="margin: 0;">This is a system-generated alert from the Ironframe matrix. Do not reply to this email.</p>
    </div>
  </div>
`;
}

function normalizeDeAckReason(reason: string): DeAckReason {
  switch (reason) {
    case DeAckReason.FALSE_POSITIVE:
    case 'FALSE_POSITIVE':
    case 'False Positive':
      return DeAckReason.FALSE_POSITIVE;
    case DeAckReason.COMPENSATING_CONTROL:
    case 'COMPENSATING_CONTROL':
    case 'Compensating Control':
      return DeAckReason.COMPENSATING_CONTROL;
    case DeAckReason.ACCEPTABLE_RISK:
    case 'ACCEPTABLE_RISK':
    case 'Acceptable Risk':
      return DeAckReason.ACCEPTABLE_RISK;
    case DeAckReason.DUPLICATE:
    case 'DUPLICATE':
    case 'Duplicate':
      return DeAckReason.DUPLICATE;
    default: {
      const normalized = reason.trim().toUpperCase().replace(/\s+/g, '_');
      const fallback = (DeAckReason as Record<string, DeAckReason | undefined>)[normalized];
      return fallback ?? DeAckReason.FALSE_POSITIVE;
    }
  }
}

function warnMissingDelegate(delegateName: string) {
  console.warn(
    `[threatActions] Prisma delegate "${delegateName}" is unavailable. ` +
      `Run prisma generate after schema updates.`,
  );
}

type TransactionClient = {
  $executeRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
  threatEvent: {
    findUnique: (args: unknown) => Promise<any>;
    findFirst: (args: unknown) => Promise<any>;
    update: (args: unknown) => Promise<any>;
  };
  company: {
    findUnique: (args: unknown) => Promise<{ tenantId: string } | null>;
  };
  integrityEvent: {
    findFirst: (args: unknown) => Promise<{ eventHash: string } | null>;
    create: (args: unknown) => Promise<unknown>;
  };
  auditLog: { create: (args: unknown) => Promise<any> };
  workNote: { create: (args: unknown) => Promise<any> };
};

type MissingRecordResponse = { success: false; error: string };
type ActionFailureResponse = {
  success: false;
  error: string;
  chaosDiscoveryHold?: true;
  retryAfterMs?: number;
};

const DEFAULT_THREAT_TX_GUARD_ERROR = 'AUDIT_LOG_FAILURE: Record no longer exists.';

/** Post-intake states: repeat-ack is a no-op if already past `IDENTIFIED`. */
const IDEMPOTENT_ACK_STATUSES: ThreatState[] = [
  ThreatState.CONFIRMED,
  ThreatState.MITIGATED,
  ThreatState.RESOLVED,
];

/** Idempotent repeat-ack: row already CONFIRMED+ under the same tenant scope (prod or shadow). */
async function tryIdempotentAcknowledgeSuccess(
  id: string,
  sessionCompanyId: bigint | null,
): Promise<{ success: true } | null> {
  if (sessionCompanyId == null) return null;
  const statusIn = { in: IDEMPOTENT_ACK_STATUSES };

  const prodScoped = await prisma.threatEvent.findFirst({
    where: { id, tenantCompanyId: sessionCompanyId, status: statusIn },
    select: { id: true },
  });
  if (prodScoped) return { success: true };

  const simScoped = await prisma.riskEvent.findFirst({
    where: { id, tenantCompanyId: sessionCompanyId, status: statusIn },
    select: { id: true },
  });
  if (simScoped) return { success: true };

  return null;
}

/** When an operator acknowledges (begins processing), claim `assigneeId` if still open / literal “unassigned”. */
function shouldClaimAssigneeOnAcknowledge(assigneeId: string | null | undefined): boolean {
  const s = (assigneeId ?? "").trim();
  return s === "" || s.toLowerCase() === "unassigned";
}

/** Execution-board owner shown after first-touch acknowledge (work notes / audit still use session `operatorId`). */
const ACKNOWLEDGE_FIRST_TOUCH_ASSIGNEE_ID = "User_00";

/** Align shadow `RiskEvent` txs with prod `runThreatTransaction` — default Prisma 5s is too low on remote Postgres. */
const THREAT_INTERACTIVE_TX_OPTIONS = { maxWait: 10_000, timeout: 15_000 } as const;

/** Pre-stamp partition/FK fields so `auditLog` extension skips extra lookups inside an open transaction. */
function shadowSimAuditLogData(
  tenantUuid: string,
  simThreatId: string,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const tid = tenantUuid.trim();
  return {
    ...payload,
    threatId: null,
    isSimulation: true,
    simThreatId,
    tenantId: tid,
    simThreatTenantId: tid,
  };
}

/** Validate production ThreatEvent exists, then run update + audit create in one transaction. (Always uses threatEvent — never SimThreatEvent.) */
async function runThreatTransaction<T>(
  id: string,
  tenantCompanyId: bigint | null,
  run: (tx: TransactionClient) => Promise<T>,
  options?: { missingRecordError?: string; sessionTenantUuid?: string | null },
): Promise<T> {
  const missingErr = options?.missingRecordError ?? DEFAULT_THREAT_TX_GUARD_ERROR;
  const sessionTenantUuid = options?.sessionTenantUuid?.trim() || null;
  return prisma.$transaction(
    async (tx) => {
    const client = tx as unknown as TransactionClient;
    // Bridge Next.js transaction context to Postgres RLS.
    // Must be the first operation in the transaction block.
    if (sessionTenantUuid) {
      try {
        await client.$executeRaw`SELECT ironguard_set_session_tenant(${sessionTenantUuid}::uuid);`;
      } catch {
        await client.$executeRaw`SELECT set_config('app.current_tenant_id', ${sessionTenantUuid}, true);`;
      }
    } else if (tenantCompanyId != null) {
      await client.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantCompanyId.toString()}, true);`;
    }
    const exists =
      tenantCompanyId != null
        ? await client.threatEvent.findFirst({
            where: { id, tenantCompanyId },
            select: { id: true },
          })
        : await client.threatEvent.findFirst({
            where: { id },
            select: { id: true },
          });
    if (exists == null) {
      console.warn(`[GRC Guard] Prevented action on missing Threat ID: ${id} (${missingErr})`);
      return { success: false, error: missingErr } as unknown as T;
    }
    return run(client);
    },
    { maxWait: THREAT_INTERACTIVE_TX_OPTIONS.maxWait, timeout: THREAT_INTERACTIVE_TX_OPTIONS.timeout },
  );
}

export type AcknowledgeThreatActionResult =
  | { success: true; warning?: string }
  | ActionFailureResponse
  | void;

/** After T12 gavel, GRC ack must not downgrade RESOLVED → CONFIRMED (sticky Active Risks). */
function acknowledgeTargetStatusAfterChaosForensicClose(
  currentStatus: ThreatState,
  ingestionDetails: string | Prisma.InputJsonValue | null | undefined,
): ThreatState {
  if (currentStatus === ThreatState.RESOLVED) return ThreatState.RESOLVED;
  const raw =
    ingestionDetails == null
      ? null
      : typeof ingestionDetails === "string"
        ? ingestionDetails
        : JSON.stringify(ingestionDetails);
  if (isChaosForensicGavelClosed(raw)) return ThreatState.RESOLVED;
  return ThreatState.CONFIRMED;
}

export type AcknowledgeThreatIngestOptions = {
  /** Shadow-plane API ingest (GRC bot / live-fire): tenant-scoped ack without browser Supabase session. */
  shadowPlaneIngestBot?: boolean;
};

export async function acknowledgeThreatAction(
  id: string,
  tenantId: string,
  _operatorId: string,
  justification?: string,
  ingestOptions?: AcknowledgeThreatIngestOptions,
): Promise<AcknowledgeThreatActionResult> {
  assertTasMdIntegrityOrThrow();

  if (tenantId == null || tenantId === undefined || tenantId === '') {
    throw new Error('Irongate Rejection: Missing Tenant Context. Zero-Trust violation.');
  }

  const shadowPlaneIngestBot =
    ingestOptions?.shadowPlaneIngestBot === true && isShadowPlaneActiveFromEnv();

  let operatorId = "";
  let sessionCompanyId: bigint | null = null;

  if (shadowPlaneIngestBot) {
    const botOp = (_operatorId ?? "").trim();
    operatorId = botOp.length > 0 ? botOp : "SHADOW_PLANE_INGEST_BOT";
    const companyRow = await prisma.company.findFirst({
      where: { tenantId: tenantId.trim(), isTestRecord: false },
      orderBy: { id: "asc" },
      select: { id: true },
    });
    sessionCompanyId =
      companyRow?.id ??
      (
        await prisma.company.findFirst({
          where: { tenantId: tenantId.trim() },
          orderBy: { id: "asc" },
          select: { id: true },
        })
      )?.id ??
      null;
    if (sessionCompanyId == null) {
      throw new Error('Irongate Rejection: Missing company context for shadow-plane ingest bot.');
    }
  } else {
    const sessionUser = await getSupabaseSessionUser();
    if (sessionUser == null) {
      return {
        success: false,
        error: "Authentication required. Sign in to acknowledge threats.",
      };
    }
    operatorId =
      (typeof sessionUser.id === "string" && sessionUser.id.trim() ? sessionUser.id.trim() : "") ||
      sessionUser.email?.trim() ||
      "";
    if (operatorId.length < 1) {
      return {
        success: false,
        error: "Invalid session: no operator id or email for attribution.",
      };
    }

    sessionCompanyId = await getCompanyIdForActiveTenant();
    if (sessionCompanyId == null) {
      throw new Error('Irongate Rejection: Missing company context for tenant isolation.');
    }
  }

  const TOP_SECTOR_SOURCE = 'Top Sector Threats';
  const TOP_SECTOR_JUSTIFICATION = 'Top Sector Threat';

  const grcAckSelect = {
    financialRisk_cents: true,
    sourceAgent: true,
    status: true,
    createdAt: true,
    ingestionDetails: true,
    targetEntity: true,
  } as const;

  const prodRow = await prisma.threatEvent.findFirst({
    where: { id, tenantCompanyId: sessionCompanyId },
    select: grcAckSelect,
  });

  let resolved: AcknowledgeThreatGateResolved | null = null;
  if (prodRow) {
    resolved = { plane: 'prod', row: prodRow };
  } else {
    const simRow = await prisma.riskEvent.findFirst({
      where: { id, tenantCompanyId: sessionCompanyId },
      select: grcAckSelect,
    });
    if (simRow) {
      resolved = { plane: 'shadow', row: simRow };
    }
  }

  if (!resolved) {
    const idem = await tryIdempotentAcknowledgeSuccess(id, sessionCompanyId);
    if (idem) {
      revalidatePath('/');
      return idem;
    }
    throw new Error(`Threat not found or access denied. (ID: ${id})`);
  }

  const hold = chaosAcknowledgeBlockedByDiscoveryHold({
    status: String(resolved.row.status),
    ingestionDetails: resolved.row.ingestionDetails,
    industry: resolved.row.targetEntity,
    createdAt: resolved.row.createdAt,
  });
  if (hold.blocked) {
    return {
      success: false,
      error: `Chaos discovery phase: keep this signal in Risk Velocity for the full window before Active promotion (${Math.ceil(hold.retryAfterMs / 1000)}s remaining).`,
      chaosDiscoveryHold: true,
      retryAfterMs: hold.retryAfterMs,
    };
  }

  const isShadowAck = resolved.plane === 'shadow';
  const existing = resolved.row;
  if (existing && existing.financialRisk_cents != null) {
    const threshold = getGrcThresholdCents();
    const cents = BigInt(existing.financialRisk_cents);
    const noteText = (justification ?? '').trim();
    const noteLen = noteText.length;
    const requiredLen = cents >= threshold ? getRequiredForensicAttestationMin() : 10;
    const isTopSectorVerifiedIntel =
      existing.sourceAgent === TOP_SECTOR_SOURCE && noteText === TOP_SECTOR_JUSTIFICATION;
    const hasRequiredNote = isTopSectorVerifiedIntel || noteLen >= requiredLen;
    if (!hasRequiredNote) {
      return {
        success: false,
        error:
          `GRC Violation: High-value threats require a ${getRequiredForensicAttestationMin()}+ character work note/justification.`,
      };
    }
  }

  if (!prismaDelegates.auditLog?.create) {
    if (!prismaDelegates.auditLog) warnMissingDelegate('auditLog');
    return;
  }
  if (!isShadowAck && !prismaDelegates.threatEvent?.update) {
    if (!prismaDelegates.threatEvent) warnMissingDelegate('threatEvent');
    return;
  }

  try {
    const normalizedJustification = (justification ?? '').trim();
    const parsedJustification = workNoteSchema.safeParse({ text: normalizedJustification });
    if (!parsedJustification.success) {
      return {
        success: false,
        error: parsedJustification.error.issues.map((i) => i.message).join('; '),
      };
    }
    const savedWorkNoteText = parsedJustification.data.text;

    if (isShadowAck) {
      await prisma.$transaction(
        async (tx) => {
        const detailsRow = await tx.riskEvent.findFirst({
          where: { id },
          select: { ingestionDetails: true, assigneeId: true },
        });
        if (detailsRow == null) {
          console.warn(`[Acknowledge Phase 2] SimThreatEvent missing inside TX after resolve: ${id}`);
          throw new Error(
            '[Acknowledge Phase 2 – Shadow TX] simThreatEvent row missing before update (race delete or ID mismatch; production ThreatEvent guard not used here).',
          );
        }
        const chaosAckPatch = buildChaosFinalAckIngestionPatch(detailsRow.ingestionDetails ?? null);
        const nextIngestionDetails = mergeIngestionDetailsPatchJson(detailsRow.ingestionDetails ?? null, {
          grcJustification: savedWorkNoteText,
          ...(chaosAckPatch ?? {}),
        });
        const claimAssignee = shouldClaimAssigneeOnAcknowledge(detailsRow.assigneeId);
        const ackStatus = acknowledgeTargetStatusAfterChaosForensicClose(
          existing.status as ThreatState,
          nextIngestionDetails,
        );
        await tx.riskEvent.updateMany({
          where: { id },
          data: {
            status: ackStatus,
            ingestionDetails: nextIngestionDetails,
            ...(claimAssignee && ackStatus !== ThreatState.RESOLVED
              ? { assigneeId: ACKNOWLEDGE_FIRST_TOUCH_ASSIGNEE_ID }
              : {}),
            ...(ackStatus === ThreatState.RESOLVED ? { assigneeId: null } : {}),
          },
        });
        await auditLogCreateLooseTx(tx, {
          data: shadowSimAuditLogData(tenantId, id, {
            action: 'THREAT_ACKNOWLEDGED',
            justification: JSON.stringify({
              ...shadowReceiptAuditStub(id),
              text: savedWorkNoteText,
            }),
            operatorId,
          }),
        });
        },
        THREAT_INTERACTIVE_TX_OPTIONS,
      );
      revalidatePath('/');
      return { success: true as const };
    } else {
      const result = await runThreatTransaction(
        id,
        sessionCompanyId,
        async (tx) => {
          const detailsRow = await tx.threatEvent.findUnique({
            where: { id },
            select: { ingestionDetails: true, assigneeId: true },
          });
          const chaosAckPatch = buildChaosFinalAckIngestionPatch(detailsRow?.ingestionDetails ?? null);
          const nextIngestionDetails = mergeIngestionDetailsPatch(detailsRow?.ingestionDetails ?? null, {
            grcJustification: savedWorkNoteText,
            ...(chaosAckPatch ?? {}),
          });
          const claimAssignee = shouldClaimAssigneeOnAcknowledge(detailsRow?.assigneeId);
          const ackStatus = acknowledgeTargetStatusAfterChaosForensicClose(
            existing.status as ThreatState,
            nextIngestionDetails,
          );

          await tx.workNote.create({
            data: {
              text: savedWorkNoteText,
              operatorId,
              threatId: id,
            },
          });
          // ingestionDetails is @db.Text: store merged JSON as string (never a Prisma Json/metadata column).
          await transitionThreatStatus({
            threatId: id,
            newStatus: ackStatus,
            actorUserId: operatorId,
            eventType: "THREAT_ACKNOWLEDGED",
            tx,
            extraChanges: {
              ingestionDetails: nextIngestionDetails,
              ...(claimAssignee && ackStatus !== ThreatState.RESOLVED
                ? { assigneeId: ACKNOWLEDGE_FIRST_TOUCH_ASSIGNEE_ID }
                : {}),
              ...(ackStatus === ThreatState.RESOLVED ? { assigneeId: null } : {}),
            },
            select: { id: true },
          });
          await auditLogCreateLooseTx(tx, {
            data: {
              action: 'THREAT_ACKNOWLEDGED',
              justification: savedWorkNoteText,
              operatorId,
              threatId: id,
              tenantId: tenantId.trim(),
            },
          });
        },
        {
          missingRecordError:
            '[Acknowledge Phase 3 – Prod TX / runThreatTransaction] threatEvent missing inside transaction guard (shadow row never uses this path).',
          sessionTenantUuid: tenantId.trim(),
        },
      );
      const maybeMissing = result as unknown as MissingRecordResponse | undefined;
      if (maybeMissing?.success === false) {
        return maybeMissing;
      }
      const maybeFailure = result as unknown as ActionFailureResponse | undefined;
      if (maybeFailure?.success === false) {
        return maybeFailure;
      }

      revalidatePath('/');
      return { success: true as const };
    }
  } catch (error) {
    console.error('[ACTION FAILED]:', error);
    const base = error instanceof Error ? error.message : String(error);
    const diag = `(ID: ${id}, CoID: ${sessionCompanyId.toString()}, plane: ${isShadowAck ? 'shadow' : 'prod'})`;
    return {
      success: false,
      error: `${base} ${diag}`,
    };
  }
}

export async function confirmThreatAction(
  id: string,
  operatorId: string,
): Promise<{ success: true } | ActionFailureResponse | void> {
  const sessionCompanyId = await getCompanyIdForActiveTenant();
  const resolved = await resolveThreatForAcknowledge(id, sessionCompanyId);
  if (resolved == null) {
    return {
      success: false,
      error:
        '[Confirm Phase 0] No ThreatEvent or SimThreatEvent for this id and tenant scope.',
    };
  }

  const isShadow = resolved.plane === 'shadow';

  if (!prismaDelegates.auditLog?.create) {
    if (!prismaDelegates.auditLog) warnMissingDelegate('auditLog');
    return;
  }
  if (!isShadow && !prismaDelegates.threatEvent?.update) {
    if (!prismaDelegates.threatEvent) warnMissingDelegate('threatEvent');
    return;
  }

  try {
    if (isShadow) {
      await prisma.$transaction(
        async (tx) => {
        const row = await tx.riskEvent.findFirst({
          where: { id },
          select: { id: true, tenantId: true },
        });
        if (row == null) {
          console.warn(`[Confirm Phase 2] SimThreatEvent missing inside TX after resolve: ${id}`);
          throw new Error(
            '[Confirm Phase 2 – Shadow TX] simThreatEvent row missing before update (race delete or ID mismatch).',
          );
        }
        await tx.riskEvent.updateMany({
          where: { id },
          data: { status: ThreatState.CONFIRMED },
        });
        await auditLogCreateLooseTx(tx, {
          data: shadowSimAuditLogData(row.tenantId, id, {
            action: 'THREAT_CONFIRMED',
            justification: JSON.stringify(shadowReceiptAuditStub(id)),
            operatorId,
          }),
        });
        },
        THREAT_INTERACTIVE_TX_OPTIONS,
      );
      revalidatePath('/');
      await logThreatActivity(null, 'STATUS_UPDATED', `Threat status changed to CONFIRMED (shadow). simThreatId:${id}`, {
        isSimulation: true,
      });

      try {
        const threat = await prisma.riskEvent.findFirst({
          where: { id },
          select: { title: true, status: true, financialRisk_cents: true },
        });
        const threatTitle = threat?.title ?? id;
        const state = threat?.status ?? 'CONFIRMED';
        const financialRisk_cents = threat?.financialRisk_cents ?? BigInt(0);
        const botTag = resolveTelemetryBotTag(threatTitle);
        await recordResilienceIntelStreamLine(
          `> ${botTag} [CONFIRM] Dispatching confirmation email for shadow threat ${id} (${threatTitle})...`,
          id,
        );

        const briefThreat: SecurityBriefThreat = {
          title: threatTitle,
          id,
          financialRisk_cents,
        };
        const grcRecipient = resolveGrcNotificationRecipient();
        if (grcRecipient) {
          await sendRiskNotification(
            grcRecipient,
            `[GRC ALERT] Threat Confirmed: ${threatTitle}`,
            generateSecurityBrief(briefThreat, 'CONFIRMED'),
          );
        }

        const emailResult = await sendThreatConfirmationEmail({
          threatId: id,
          threatTitle,
          operatorId,
        });
        if (emailResult.success) {
          await recordResilienceIntelStreamLine(
            `> ${botTag} [CONFIRM] Confirmation email sent successfully for ${id}.`,
            id,
          );
        } else {
          console.error('[EMAIL ERROR]', emailResult.error);
        }
        await routeRiskNotification({
          id,
          title: threatTitle,
          state: String(state),
          financialRisk_cents: Number(financialRisk_cents),
        });
      } catch (emailError) {
        console.error('[EMAIL ERROR]', emailError);
      }

      return { success: true };
    }

    const result = await runThreatTransaction(
      id,
      sessionCompanyId,
      async (tx) => {
        await transitionThreatStatus({
          threatId: id,
          newStatus: ThreatState.CONFIRMED,
          actorUserId: operatorId,
          eventType: "THREAT_CONFIRMED",
          tx,
          select: { id: true },
        });
        await auditLogCreateLooseTx(tx, {
          data: {
            action: 'THREAT_CONFIRMED',
            justification: null,
            operatorId,
            threatId: id,
          },
        });
      },
      {
        missingRecordError:
          '[Confirm Phase 3 – Prod TX / runThreatTransaction] threatEvent missing inside transaction guard (shadow row never uses this path).',
      },
    );
    const maybeMissing = result as unknown as MissingRecordResponse | undefined;
    if (maybeMissing?.success === false) {
      return maybeMissing;
    }
    const maybeFailure = result as unknown as ActionFailureResponse | undefined;
    if (maybeFailure?.success === false) {
      return maybeFailure;
    }

    revalidatePath('/');

    await logThreatActivity(id, 'STATUS_UPDATED', `Threat status changed to CONFIRMED.`);

    try {
      const threat = await prisma.threatEvent.findUnique({
        where: { id },
        select: { title: true, status: true, financialRisk_cents: true },
      });
      const threatTitle = threat?.title ?? id;
      const state = threat?.status ?? 'CONFIRMED';
      const financialRisk_cents = threat?.financialRisk_cents ?? BigInt(0);
      const botTag = resolveTelemetryBotTag(threatTitle);
      await recordResilienceIntelStreamLine(
        `> ${botTag} [CONFIRM] Dispatching confirmation email for threat ${id} (${threatTitle})...`,
        id,
      );

      const briefThreat: SecurityBriefThreat = {
        title: threatTitle,
        id,
        financialRisk_cents,
      };
      const grcRecipient = resolveGrcNotificationRecipient();
      if (grcRecipient) {
        await sendRiskNotification(
          grcRecipient,
          `[GRC ALERT] Threat Confirmed: ${threatTitle}`,
          generateSecurityBrief(briefThreat, 'CONFIRMED'),
        );
      }

      const emailResult = await sendThreatConfirmationEmail({
        threatId: id,
        threatTitle,
        operatorId,
      });
      if (emailResult.success) {
        await recordResilienceIntelStreamLine(
          `> ${botTag} [CONFIRM] Confirmation email sent successfully for ${id}.`,
          id,
        );
      } else {
        console.error('[EMAIL ERROR]', emailResult.error);
      }
      await routeRiskNotification({
        id,
        title: threatTitle,
        state: String(state),
        financialRisk_cents: Number(financialRisk_cents),
      });
    } catch (emailError) {
      console.error('[EMAIL ERROR]', emailError);
    }

    return { success: true };
  } catch (error) {
    console.error('[ACTION FAILED] confirmThreatAction:', error);
    const base = error instanceof Error ? error.message : String(error);
    const diag = `(ID: ${id}, CoID: ${sessionCompanyId?.toString() ?? 'null'}, plane: ${isShadow ? 'shadow' : 'prod'})`;
    return {
      success: false,
      error: `${base} ${diag}`,
    };
  }
}

export async function resolveThreatAction(
  id: string,
  operatorId: string,
  resolutionJustification: string,
  actorDisplayName?: string,
): Promise<
  | { success: true; financialRisk_cents: number; constitutionalHash: string }
  | { success: false; financialRisk_cents: 0 }
> {
  assertTasMdIntegrityOrThrow();

  const trimmed = resolutionJustification.trim();
  try {
    assertForensicAttestationLengthForContext(trimmed);
  } catch {
    return { success: false, financialRisk_cents: 0 };
  }
  const parsedNote = workNoteSchema.safeParse({ text: trimmed });
  if (!parsedNote.success) {
    return { success: false, financialRisk_cents: 0 };
  }

  let constitutionalHash = "";
  const tasAssessment = assessTasMdIntegritySync();
  if (tasAssessment.ok) {
    constitutionalHash = tasAssessment.sha256;
  } else if (!isConstitutionalDegradedMode()) {
    return { success: false, financialRisk_cents: 0 };
  }

  const sessionCompanyIdForResolve = await getCompanyIdForActiveTenant();
  const simPlaneEnabled = await readSimulationPlaneEnabled();
  if (sessionCompanyIdForResolve != null) {
    const simRow = await prisma.riskEvent.findFirst({
      where: { id, tenantCompanyId: sessionCompanyIdForResolve },
      select: {
        id: true,
        tenantId: true,
        title: true,
        ingestionDetails: true,
        financialRisk_cents: true,
        status: true,
        assigneeId: true,
      },
    });
    const controlStressRow = isControlStressTestIngestion(simRow?.ingestionDetails);
    if (simRow && (simPlaneEnabled || controlStressRow)) {
      assertHumanThreatAssigneeForResolution(simRow.assigneeId);
      if (simRow.status === ThreatState.RESOLVED) {
        return {
          success: true,
          financialRisk_cents: Number(simRow.financialRisk_cents ?? BigInt(0)),
          constitutionalHash,
        };
      }
      if (!simShadowPassesResolutionProtocol(simRow.title, simRow.ingestionDetails)) {
        throw new Error(GRC_PROTOCOL_VIOLATION);
      }
      const ts = new Date().toISOString();
      const actor = (actorDisplayName?.trim() || operatorIdToDisplayName(operatorId)).trim();
      const justificationPayload = JSON.stringify({
        resolution: trimmed,
        actor,
        actorId: operatorId,
        timestamp: ts,
        constitutionalHash,
        ...getHighScrutinyAuditFields(),
      });
      const mergedIngestion = mergeIngestionDetailsPatchJson(simRow.ingestionDetails ?? null, {
        resolutionJustification: trimmed,
      });
      await prisma.$transaction(
        async (tx) => {
          await tx.riskEvent.updateMany({
            where: { id: simRow.id },
            data: {
              status: ThreatState.RESOLVED,
              ingestionDetails: mergedIngestion,
            },
          });
          await auditLogCreateLooseTx(tx, {
            data: shadowSimAuditLogData(simRow.tenantId, simRow.id, {
              action: "THREAT_RESOLVED",
              justification: justificationPayload,
              operatorId,
            }),
          });
        },
        THREAT_INTERACTIVE_TX_OPTIONS,
      );
      revalidatePath("/");
      await logThreatActivity(null, "STATUS_UPDATED", `Threat status changed to RESOLVED (shadow). simThreatId:${id}`, {
        isSimulation: true,
      });
      return {
        success: true,
        financialRisk_cents: Number(simRow.financialRisk_cents ?? BigInt(0)),
        constitutionalHash,
      };
    }

    if (simPlaneEnabled) {
    const chaosThreat = await prisma.threatEvent.findFirst({
      where: { id, tenantCompanyId: sessionCompanyIdForResolve },
      select: {
        id: true,
        title: true,
        ingestionDetails: true,
        financialRisk_cents: true,
        status: true,
      },
    });
    if (chaosThreat) {
      const normalized = parseIngestionDetailsForMerge(chaosThreat.ingestionDetails ?? null) as Record<
        string,
        unknown
      >;
      /** CHAOS_DRILL lifecycle clears via `executeChaosDrillIrontechLifecycleStepAction` (Irontech Agent 04 gates), not this shortcut. */
      const isChaosDrillLifecycle =
        normalized.entityType === "CHAOS_DRILL" || normalized.chaosDrillEntityType === "CHAOS_DRILL";
      const isChaosInfrastructureShortcut =
        !isChaosDrillLifecycle &&
        (normalized.incident_type === "CHAOS" ||
          normalized.entityType === "CHAOS" ||
          normalized.isChaosTest === true ||
          (typeof chaosThreat.title === "string" && chaosThreat.title.startsWith("CHAOS_SIM:")));
      if (isChaosInfrastructureShortcut) {
        if (chaosThreat.status === ThreatState.RESOLVED) {
          return {
            success: true,
            financialRisk_cents: Number(chaosThreat.financialRisk_cents ?? BigInt(0)),
            constitutionalHash,
          };
        }
        const tsChaos = new Date().toISOString();
        const actorChaos = (actorDisplayName?.trim() || operatorIdToDisplayName(operatorId)).trim();
        const justificationPayloadChaos = JSON.stringify({
          resolution: trimmed,
          actor: actorChaos,
          actorId: CHAOS_ASSIGNEE_IRONTECH_04,
          agentAuditNote:
            "TAS §3 — shadow Chaos clearance attributed to Irontech (Agent 04); governance exposure baseline 1.6B acknowledged.",
          timestamp: tsChaos,
          constitutionalHash,
          ...getHighScrutinyAuditFields(),
        });
        const mergedIngestionChaos = mergeIngestionDetailsPatch(chaosThreat.ingestionDetails ?? null, {
          resolutionJustification: trimmed,
          tasSection3AgenticNeutralization: {
            agentAssigneeId: CHAOS_ASSIGNEE_IRONTECH_04,
            governanceExposureBaselineBillions: 1.6,
            settledAt: tsChaos,
            auditProtocol: "IRONTECH_AGENT04_SHADOW_CLEARANCE",
          },
        });
        await runAuditedThreatEventWormBypass(
          buildWormAuditedBypassLabel(chaosThreat.id, "CHAOS_SHADOW_RESOLVED"),
          async (tx) => {
            await tx.threatEvent.updateMany({
              where: { id: chaosThreat.id },
              data: {
                status: ThreatState.RESOLVED,
                ingestionDetails: mergedIngestionChaos,
                assigneeId: CHAOS_ASSIGNEE_IRONTECH_04,
              },
            });
            await auditLogCreateLooseTx(tx, {
              data: {
                action: "THREAT_RESOLVED",
                justification: justificationPayloadChaos,
                operatorId: CHAOS_ASSIGNEE_IRONTECH_04,
                threatId: id,
                isSimulation: true,
              },
            });
          },
        );
        revalidatePath("/");
        await logThreatActivity(id, "STATUS_UPDATED", `Threat status changed to RESOLVED (shadow Chaos).`, {
          isSimulation: true,
        });
        return {
          success: true,
          financialRisk_cents: Number(chaosThreat.financialRisk_cents ?? BigInt(0)),
          constitutionalHash,
        };
      }
    }
    }
  }

  if (!prismaDelegates.threatEvent?.update || !prismaDelegates.auditLog?.create) {
    if (!prismaDelegates.threatEvent) warnMissingDelegate('threatEvent');
    if (!prismaDelegates.auditLog) warnMissingDelegate('auditLog');
    return { success: false, financialRisk_cents: 0 };
  }

  const ts = new Date().toISOString();
  const actor = (actorDisplayName?.trim() || operatorIdToDisplayName(operatorId)).trim();
  const justificationPayload = JSON.stringify({
    resolution: trimmed,
    actor,
    actorId: operatorId,
    timestamp: ts,
    constitutionalHash,
    ...getHighScrutinyAuditFields(),
  });

  const threatForGate = await prisma.threatEvent.findUnique({
    where: { id },
    select: {
      id: true,
      tenantCompanyId: true,
      resolutionApprovalId: true,
      ingestionDetails: true,
      title: true,
      assigneeId: true,
    },
  });
  if (!threatForGate?.tenantCompanyId || !threatForGate.resolutionApprovalId) {
    throw new Error(GRC_PROTOCOL_VIOLATION);
  }
  assertHumanThreatAssigneeForResolution(threatForGate.assigneeId);
  const company = await prisma.company.findUnique({
    where: { id: threatForGate.tenantCompanyId },
    select: { tenantId: true },
  });
  if (!company?.tenantId) {
    throw new Error(GRC_PROTOCOL_VIOLATION);
  }
  const approval = await prisma.threatApproval.findUnique({
    where: { id: threatForGate.resolutionApprovalId },
    select: { id: true, status: true, threatId: true, tenantId: true },
  });
  if (
    !approval ||
    approval.status !== "APPROVED" ||
    approval.threatId !== id ||
    approval.tenantId !== company.tenantId
  ) {
    throw new Error(GRC_PROTOCOL_VIOLATION);
  }
  const linkedEvidence = await prisma.evidenceAttachment.findFirst({
    where: {
      tenantId: company.tenantId,
      entityType: "THREAT_EVENT",
      entityId: id,
    },
    select: { id: true },
  });
  const allowSimKimbotManifest =
    isSystemIntegrityKimbotDrillThreatOnServer({
      title: threatForGate.title ?? "",
      ingestionDetails: threatForGate.ingestionDetails,
    }) && ingestionHasVaultSimManifest(threatForGate.ingestionDetails);
  if (
    !linkedEvidence &&
    !allowSimKimbotManifest &&
    !ingestionAllowsPlaybookEvidenceBypass(threatForGate.ingestionDetails)
  ) {
    throw new Error(GRC_PROTOCOL_VIOLATION);
  }

  const updated = await runThreatTransaction(id, threatForGate.tenantCompanyId, async (tx) => {
    const prismaTx = tx as unknown as Prisma.TransactionClient;
    const updatedRow = await transitionThreatStatus<{ financialRisk_cents?: bigint }>({
      threatId: id,
      newStatus: ThreatState.RESOLVED,
      approvalId: approval.id,
      actorUserId: operatorId,
      eventType: "THREAT_RESOLVED",
      tx: prismaTx,
      select: { financialRisk_cents: true },
    });
    const approvedArtifacts = await prismaTx.evidenceArtifact.findMany({
      where: {
        tenantId: approval.tenantId,
        attachments: {
          some: {
            entityType: "THREAT_EVENT",
            entityId: id,
          },
        },
      },
      select: { storagePath: true },
    });
    if (approvedArtifacts.length > 0) {
      await prismaTx.quarantineRecord.updateMany({
        where: {
          tenantId: approval.tenantId,
          storagePath: { in: approvedArtifacts.map((artifact) => artifact.storagePath) },
        },
        data: { status: "PERMANENT" },
      });
    }
    await auditLogCreateLooseTx(prismaTx, {
      data: {
        action: 'THREAT_RESOLVED',
        justification: justificationPayload,
        operatorId,
        threatId: id,
      },
    });
    return updatedRow as { financialRisk_cents?: bigint };
  });

  if (
    updated &&
    typeof updated === 'object' &&
    'success' in updated &&
    (updated as { success?: boolean }).success === false
  ) {
    return { success: false, financialRisk_cents: 0 };
  }

  const financialRisk_cents = Number(
    (updated as { financialRisk_cents?: bigint } | null)?.financialRisk_cents ?? BigInt(0),
  );
  revalidatePath('/');

  await logThreatActivity(id, 'STATUS_UPDATED', `Threat status changed to RESOLVED.`);

  const ironbloomSustainability = await recordSustainabilityImpact(id);
  if (!ironbloomSustainability.ok) {
    console.error('[Ironbloom] recordSustainabilityImpact failed:', ironbloomSustainability.error);
  }

  try {
    const threat = await prisma.threatEvent.findUnique({
      where: { id },
      select: { title: true },
    });
    const threatTitle = threat?.title ?? id;
    const briefThreat: SecurityBriefThreat = {
      title: threatTitle,
      id,
      financialRisk_cents: BigInt(financialRisk_cents),
    };
    const grcRecipient = resolveGrcNotificationRecipient();
    if (grcRecipient) {
      await sendRiskNotification(
        grcRecipient,
        `[GRC UPDATE] Threat Resolved: ${threatTitle}`,
        generateSecurityBrief(briefThreat, 'RESOLVED'),
      );
    }
    await routeRiskNotification({
      id,
      title: threat?.title ?? id,
      state: 'RESOLVED',
      financialRisk_cents,
    });
  } catch (e) {
    console.error('[EMAIL ERROR] resolve GRC notification', e);
  }

  return { success: true, financialRisk_cents, constitutionalHash };
}

/** Persist removal from Active board after autonomous resolve (UI "Acknowledge" kill-switch). */
export async function archiveThreat(
  threatId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const id = threatId.trim();
  if (!id) return { success: false, error: "Missing threat id." };
  try {
    await transitionThreatStatus({
      threatId: id,
      newStatus: ThreatState.RESOLVED,
      actorUserId: "system-archive",
      eventType: "THREAT_ARCHIVED",
      extraChanges: {
        deAckReason: DeAckReason.ACCEPTABLE_RISK,
      },
    });
    revalidatePath("/", "layout");
    revalidatePath("/");
    await logThreatActivity(
      id,
      "STATUS_UPDATED",
      "Threat de-acknowledged (active-board dismiss) — removed from live active queries.",
    );
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

export async function deAcknowledgeThreatAction(
  id: string,
  tenantId: string,
  reason: string,
  justification: string,
  operatorId: string,
): Promise<{ success: true } | MissingRecordResponse | ActionFailureResponse | void> {
  if (!tenantId) throw new Error("Irongate Rejection: Missing Tenant Context. Zero-Trust violation.");
  if (!prismaDelegates.auditLog?.create) {
    if (!prismaDelegates.auditLog) warnMissingDelegate('auditLog');
    return;
  }

  const trimmedReason = reason.trim();
  const trimmedJustification = justification.trim();
  if (!trimmedReason) {
    return { success: false, error: 'De-acknowledgement requires a selected reason.' };
  }

  const sessionCompanyId = await getCompanyIdForActiveTenant();
  if (sessionCompanyId == null) {
    throw new Error('Irongate Rejection: Missing company context for tenant isolation.');
  }

  const resolved = await resolveThreatForAcknowledge(id, sessionCompanyId);
  if (!resolved) {
    return {
      success: false,
      error: `[deAcknowledgeThreatAction] threatEvent.findUnique: no row for id ${id}`,
    };
  }

  const threshold = getGrcThresholdCents();
  const cents = BigInt(resolved.row.financialRisk_cents ?? 0);
  const requiredLen = cents >= threshold ? 50 : 10;
  if (trimmedJustification.length < requiredLen) {
    return {
      success: false,
      error: `GRC Violation: Justification must be at least ${requiredLen} characters for this threat.`,
    };
  }

  const workNoteText = `[STATUS REVERTED: ${trimmedReason.toUpperCase()}] ${trimmedJustification}`;
  const parsedDeAckNote = workNoteSchema.safeParse({ text: workNoteText });
  if (!parsedDeAckNote.success) {
    return {
      success: false,
      error: parsedDeAckNote.error.issues.map((i) => i.message).join('; '),
    };
  }
  const savedDeAckWorkNoteText = parsedDeAckNote.data.text;
  const mappedReason = normalizeDeAckReason(trimmedReason);
  const tenantUuid = tenantId.trim();

  if (resolved.plane === 'shadow') {
    await prisma.$transaction(
      async (tx) => {
        const row = await tx.riskEvent.findFirst({
          where: { id, tenantCompanyId: sessionCompanyId },
          select: { id: true, tenantId: true, ingestionDetails: true },
        });
        if (row == null) {
          throw new Error(
            `[deAcknowledgeThreatAction] riskEvent missing inside TX after resolve: ${id}`,
          );
        }
        const nextIngestionDetails = mergeIngestionDetailsPatchJson(row.ingestionDetails ?? null, {
          deAckWorkNote: savedDeAckWorkNoteText,
          deAckReason: mappedReason,
        });
        await tx.riskEvent.updateMany({
          where: { id },
          data: {
            status: ThreatState.RESOLVED,
            deAckReason: mappedReason,
            ingestionDetails: nextIngestionDetails,
            assigneeId: null,
          },
        });
        await auditLogCreateLooseTx(tx, {
          data: shadowSimAuditLogData(tenantUuid, id, {
            action: 'THREAT_DE_ACKNOWLEDGED',
            justification: trimmedJustification,
            operatorId,
          }),
        });
        await auditLogCreateLooseTx(tx, {
          data: shadowSimAuditLogData(tenantUuid, id, {
            action: 'STATE_REGRESSION',
            justification: 'User reversed acknowledgment of risk.',
            operatorId,
          }),
        });
      },
      THREAT_INTERACTIVE_TX_OPTIONS,
    );
    revalidatePath('/');
    return { success: true };
  }

  if (!prismaDelegates.threatEvent?.update || !prismaDelegates.workNote?.create) {
    if (!prismaDelegates.threatEvent) warnMissingDelegate('threatEvent');
    if (!prismaDelegates.workNote) warnMissingDelegate('workNote');
    return;
  }

  const tenantCompanyIdForDeAck =
    (
      await prisma.company.findFirst({
        where: { tenantId: tenantUuid },
        select: { id: true },
      })
    )?.id ?? null;

  const result = await runThreatTransaction(id, tenantCompanyIdForDeAck, async (tx) => {
    await tx.workNote.create({
      data: {
        text: savedDeAckWorkNoteText,
        operatorId,
        threatId: id,
      },
    });
    await transitionThreatStatus({
      threatId: id,
      newStatus: ThreatState.RESOLVED,
      actorUserId: operatorId,
      eventType: "THREAT_DE_ACKNOWLEDGED",
      tx,
      extraChanges: {
        deAckReason: mappedReason,
      },
      select: { id: true },
    });
    await auditLogCreateLooseTx(tx, {
      data: {
        action: 'THREAT_DE_ACKNOWLEDGED',
        justification: trimmedJustification,
        operatorId,
        threatId: id,
      },
    });
    // # GRC_ACTION_CHIPS / audit directive — De-Ack must log STATE_REGRESSION
    await auditLogCreateLooseTx(tx, {
      data: {
        action: 'STATE_REGRESSION',
        justification: 'User reversed acknowledgment of risk.',
        operatorId,
        threatId: id,
      },
    });
  });

  const maybeMissing = result as unknown as MissingRecordResponse | undefined;
  if (maybeMissing?.success === false) {
    return maybeMissing;
  }

  revalidatePath('/');
  return { success: true };
}

/** Re-escalate: move threat from ACTIVE back to PIPELINE so it reappears in Attack Velocity. Enforces tenantId (Irongate). */
export async function revertThreatToPipelineAction(
  id: string,
  tenantId: string,
  operatorId: string,
): Promise<{ success: true } | MissingRecordResponse | void> {
  if (tenantId == null || tenantId === undefined || tenantId === '') {
    throw new Error('Irongate Rejection: Missing Tenant Context. Zero-Trust violation.');
  }
  if (!prismaDelegates.threatEvent?.update || !prismaDelegates.auditLog?.create) {
    if (!prismaDelegates.threatEvent) warnMissingDelegate('threatEvent');
    if (!prismaDelegates.auditLog) warnMissingDelegate('auditLog');
    return;
  }

  const tenantCompanyIdForRevert =
    (
      await prisma.company.findFirst({
        where: { tenantId: tenantId.trim() },
        select: { id: true },
      })
    )?.id ?? null;

  const result = await runThreatTransaction(id, tenantCompanyIdForRevert, async (tx) => {
    await transitionThreatStatus({
      threatId: id,
      newStatus: ThreatState.IDENTIFIED,
      actorUserId: operatorId,
      eventType: "THREAT_REVERTED_TO_PIPELINE",
      tx,
      extraChanges: { deAckReason: null },
      select: { id: true },
    });
    await auditLogCreateLooseTx(tx, {
      data: {
        action: 'REVERT_TO_PIPELINE',
        justification: 'Re-escalated from Active Risks to Attack Velocity pipeline.',
        operatorId,
        threatId: id,
      },
    });
  });

  const maybeMissing = result as unknown as MissingRecordResponse | undefined;
  if (maybeMissing?.success === false) return maybeMissing;
  revalidatePath('/');
  return { success: true };
}

/** Reject risk ingestion/registration: creates server audit log only (threatId optional for client-only pipeline). */
export async function rejectThreatAction(id: string, operatorId: string): Promise<{ success: true } | void> {
  if (!prismaDelegates.auditLog?.create) {
    warnMissingDelegate('auditLog');
    return;
  }
  try {
    await auditLogCreateLooseTx(prismaDelegates, {
      data: {
        action: 'RISK_REJECTED',
        justification: 'User rejected risk ingestion/registration.',
        operatorId,
        threatId: id,
      },
    });
    revalidatePath('/');
    return { success: true };
  } catch {
    // Threat may not exist (e.g. client-only pipeline); create audit without FK
    await auditLogCreateLooseTx(prismaDelegates, {
      data: {
        action: 'RISK_REJECTED',
        justification: `User rejected risk ingestion/registration. threat_id: ${id}`,
        operatorId,
        threatId: null,
      },
    });
    revalidatePath('/');
    return { success: true };
  }
}

function revalidateThreatAssigneeSurfaces(): void {
  revalidatePath('/');
  revalidatePath('/control-room');
  revalidatePath('/integrity');
}

/** Canonical agent / autonomous mutations: threat row + immutable AuditLog + WorkNote (prod) + surface revalidation. */
export type AgentForensicAuditAction = 'ASSIGNEE_CHANGE' | 'STATE_TRANSITION';

export type ExecuteAgentActionArgs = {
  plane: 'prod' | 'shadow';
  threatId: string;
  tenantCompanyId: bigint;
  operatorId: string;
  /** Stored verbatim on WorkNote (prod) and inside AuditLog JSON narrative. */
  justification: string;
  /** When set for `ASSIGNEE_CHANGE`, persisted on AuditLog for ASSIGNEE HISTORY UI (append-only). */
  assigneeAuditJustification?: string;
  auditAction: AgentForensicAuditAction;
  integrityEventType: string;
  prodChanges?: Prisma.ThreatEventUpdateInput;
  shadowChanges?: Prisma.RiskEventUpdateInput;
};

/**
 * Single entry point for autonomous agent-driven updates (chaos telemetry, bots, orchestration).
 * Persists threat/sim row, appends AuditLog, mirrors justification to WorkNote on prod ThreatEvent,
 * then revalidates assignee / control-room / integrity surfaces.
 */
export async function executeAgentAction(
  args: ExecuteAgentActionArgs,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const narrative = args.justification.trim();
  if (!narrative) {
    return { ok: false, error: 'Missing agent justification.' };
  }
  if (!prismaDelegates.auditLog?.create) {
    warnMissingDelegate('auditLog');
    return { ok: false, error: 'Audit log unavailable.' };
  }

  const structuredAssignee = args.assigneeAuditJustification?.trim();
  const auditJustification =
    args.auditAction === 'ASSIGNEE_CHANGE' && structuredAssignee
      ? structuredAssignee
      : JSON.stringify({
          source: 'executeAgentAction',
          narrative,
          auditAction: args.auditAction,
          plane: args.plane,
          threatId: args.threatId,
          tenantCompanyId: String(args.tenantCompanyId),
          at: new Date().toISOString(),
        });

  const agentTenantUuid =
    (
      await prisma.company.findUnique({
        where: { id: args.tenantCompanyId },
        select: { tenantId: true },
      })
    )?.tenantId?.trim() ?? "";

  try {
    await prisma.$transaction(
      async (tx) => {
        if (args.plane === 'prod') {
          if (!args.prodChanges) {
            throw new Error('executeAgentAction: prodChanges required for prod plane.');
          }
          await updateThreatWithIntegrity({
            threatId: args.threatId,
            changes: args.prodChanges,
            actorUserId: args.operatorId,
            eventType: args.integrityEventType,
            tx,
          });
          await auditLogCreateLooseTx(tx, {
            data: {
              action: args.auditAction,
              justification: auditJustification,
              operatorId: args.operatorId,
              threatId: args.threatId,
              isSimulation: false,
              ...(agentTenantUuid ? { tenantId: agentTenantUuid } : {}),
            },
          });
          await tx.workNote.create({
            data: {
              threatId: args.threatId,
              text: narrative,
              operatorId: args.operatorId,
            },
          });
        } else {
          if (!args.shadowChanges) {
            throw new Error('executeAgentAction: shadowChanges required for shadow plane.');
          }
          await tx.riskEvent.updateMany({
            where: { id: args.threatId },
            data: args.shadowChanges,
          });
          await auditLogCreateLooseTx(tx, {
            data: shadowSimAuditLogData(agentTenantUuid, args.threatId, {
              action: args.auditAction,
              justification: auditJustification,
              operatorId: args.operatorId,
            }),
          });
        }
      },
      THREAT_INTERACTIVE_TX_OPTIONS,
    );

    revalidateThreatAssigneeSurfaces();
    revalidatePath('/control-room');
    return { ok: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/** Serialized audit row for assignee custody (`ASSIGNMENT_CHANGED` legacy + `ASSIGNEE_CHANGE`) — matches client `assignmentHistory`. */
export type AssignmentChangedLogEntry = {
  id: string;
  action: string;
  justification: string | null;
  operatorId: string;
  createdAt: string;
};

/** Persist execution-board assignee on ThreatEvent or SimThreatEvent and append AuditLog (`ASSIGNEE_CHANGE`). */
export async function setThreatAssigneeAction(
  threatId: string,
  assigneeId: string | null,
  tenantId: string,
  operatorId: string = 'admin-user-01',
  /** Human-readable operator label from UI session (e.g. "Dereck"); stored in audit JSON as `actor`. */
  actorDisplayName?: string,
  /** Human-readable assignee label from dropdown (e.g. "Wil W", "Unassigned"). */
  assigneeDisplayLabel?: string,
): Promise<
  | { success: true; newLog: AssignmentChangedLogEntry | null }
  | ActionFailureResponse
> {
  if (!tenantId?.trim()) {
    return { success: false, error: 'Irongate Rejection: Missing Tenant Context.' };
  }
  if (!prismaDelegates.auditLog?.create) {
    if (!prismaDelegates.auditLog) warnMissingDelegate('auditLog');
    return { success: false, error: 'Database update failed.' };
  }
  const normalized = (assigneeId ?? '').trim();
  const value =
    normalized === '' || normalized.toLowerCase() === 'unassigned' ? null : normalized;

  /** Commit guard: allow shadow-plane `riskEvent.create` / ingress to finish before assignee read-after-write. */
  await new Promise((r) => setTimeout(r, 500));

  const tenantUuid = await resolveTenantUuidForThreatScope(tenantId);
  if (!tenantUuid) {
    return {
      success: false,
      error:
        'Irongate Rejection: Tenant context did not resolve to a workspace UUID (check tenant slug vs `tenants.id`).',
    };
  }

  /** `RiskEvent.id` / `ThreatEvent.id` are Prisma cuids (`cm…`); `tenant_id` on SimThreatEvent is UUID. Lookup is `(id, tenantId)` only — **not** `governanceHash`. Ingress seals use the same bps as `getTenantGovernanceMultiplierBps` via `resolveGovernanceMultiplierBpsForTenantUuid`; a seal mismatch does not affect this query. */
  const threatEntityId = threatId.trim();
  if (!threatEntityId) {
    return { success: false, error: 'Irongate Rejection: Missing threat id.' };
  }
  const activeTenantId = tenantUuid;
  console.log("DEBUG: Target ThreatID:", threatEntityId);
  console.log("DEBUG: Resolved TenantID from Cookie:", activeTenantId);
  console.log("DEBUG: Type of ThreatID:", typeof threatEntityId);

  const globalCheck = await prisma.riskEvent.findFirst({
    where: { id: threatEntityId },
    select: { id: true, tenantId: true },
  });
  if (!globalCheck) {
    console.log(
      "[FORENSIC PROOF] Global SimThreatEvent search returned NULL. Row was not written to SimThreatEvent.",
    );
  } else if (globalCheck.tenantId !== activeTenantId) {
    console.log(
      "[FORENSIC PROOF] Tenant mismatch detected.",
      "db.tenant_id:",
      globalCheck.tenantId,
      "cookie tenant_id:",
      activeTenantId,
    );
  } else {
    console.log("[FORENSIC PROOF] Global SimThreatEvent search matched tenant scope.");
  }

  const su = await getSupabaseSessionUser();
  const idFromSession =
    (su && typeof su.id === "string" && su.id.trim() ? su.id.trim() : su?.email?.trim()) || "";
  const effectiveOperatorId = idFromSession || operatorId;

  const buildAssigneeChangeJustification = (
    entityId: string,
    isSimulation: boolean,
    prevAssigneeKey: string | null,
  ) => {
    const t = new Date().toISOString();
    const actor = (actorDisplayName?.trim() || operatorIdToDisplayName(effectiveOperatorId)).trim();
    const fromDisplay =
      prevAssigneeKey == null ? 'Unassigned' : assigneeKeyToDisplayName(prevAssigneeKey);
    const resolvedAssigneeLabel =
      value == null
        ? null
        : normalizeAssigneeOptionLabel(assigneeDisplayLabel) || assigneeKeyToDisplayName(value);
    const newAssigneeDisplay = resolvedAssigneeLabel;
    const toMetadata = value == null ? 'Unassigned' : resolvedAssigneeLabel ?? 'Unassigned';
    return JSON.stringify({
      entityType: 'THREAT',
      entityId,
      metadata: {
        from: fromDisplay,
        to: toMetadata,
        plane: isSimulation ? 'simulation' : 'prod',
      },
      newAssignee: newAssigneeDisplay,
      actor,
      actorId: effectiveOperatorId,
      timestamp: t,
      isSimulation,
    });
  };
  const assignedDisplayName = value == null ? "Unassigned" : (normalizeAssigneeOptionLabel(assigneeDisplayLabel) || assigneeKeyToDisplayName(value));
  const assignmentTelemetryLine = `> [IRONGATE] Identity verified. Ownership assigned to ${assignedDisplayName}. Forensic gate sealed.`;

  /** All companies under this tenant UUID (prod threats key off `tenantCompanyId`, not tenant UUID). */
  const tenantCompanyRows = await prisma.company.findMany({
    where: { tenantId: tenantUuid },
    select: { id: true },
  });
  const tenantCompanyIds = tenantCompanyRows.map((c) => c.id);

  const simulationPlaneEnabled = await readSimulationPlaneEnabled();
  /** Shadow ledger first when the ingress cookie selects the simulation plane (matches SimThreatEvent reads). */
  const prioritizeSimThreatRow =
    simulationPlaneEnabled || threatEntityId.startsWith("shadow_sim_");

  /** Resolve prod vs shadow row under the active tenant UUID (cookie-aligned). Retry briefly for write-after-simulation races. */
  let prod: { id: string; assigneeId: string | null } | null = null;
  let sim: { id: string; tenantCompanyId: bigint | null; assigneeId: string | null } | null = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const simRow = await prisma.riskEvent.findFirst({
      where: { id: threatEntityId, tenantId: tenantUuid },
      select: { id: true, tenantCompanyId: true, assigneeId: true },
    });
    const prodRow =
      tenantCompanyIds.length > 0
        ? await prisma.threatEvent.findFirst({
            where: {
              id: threatEntityId,
              tenantCompanyId: { in: tenantCompanyIds },
            },
            select: { id: true, assigneeId: true },
          })
        : null;
    if (simRow || prodRow) {
      if (prioritizeSimThreatRow && simRow) {
        prod = null;
        sim = simRow;
      } else {
        prod = prodRow;
        sim = simRow;
      }
      break;
    }
    if (!simRow && !prodRow && attempt >= 5) {
      try {
        const probe = await prisma.$queryRaw<Array<{ n: bigint }>>`
          SELECT COUNT(*)::bigint AS n FROM "SimThreatEvent"
          WHERE "tenant_id" = ${tenantUuid} AND id = ${threatEntityId}
        `;
        if (probe[0]?.n != null && probe[0].n > 0n) {
          await new Promise((r) => setTimeout(r, 280));
          continue;
        }
      } catch {
        /* optional existence probe */
      }
    }
    await new Promise((r) => setTimeout(r, 120 + attempt * 55));
  }

  if (prioritizeSimThreatRow && sim) {
    const prev = sim.assigneeId ?? null;
    if (prev === value) {
      revalidateThreatAssigneeSurfaces();
      return { success: true, newLog: null };
    }
    try {
      const created = await prisma.$transaction(
        async (tx) => {
          const row = await tx.riskEvent.findFirst({
            where: { id: threatEntityId, tenantId: tenantUuid },
            select: { assigneeId: true },
          });
          if (!row) return null;
          if ((row.assigneeId ?? null) === value) return null;
          await tx.riskEvent.updateMany({
            where: { id: threatEntityId, tenantId: tenantUuid },
            data: { assigneeId: value },
          });
          return auditLogCreateLooseTx(tx, {
            data: shadowSimAuditLogData(tenantUuid, threatEntityId, {
              action: 'ASSIGNEE_CHANGE',
              justification: buildAssigneeChangeJustification(threatEntityId, true, row.assigneeId ?? null),
              operatorId: effectiveOperatorId,
            }),
          });
        },
        THREAT_INTERACTIVE_TX_OPTIONS,
      );
      revalidateThreatAssigneeSurfaces();
      if (!created) {
        return { success: true, newLog: null };
      }
      if (value != null) {
        await recordResilienceIntelStreamLine(assignmentTelemetryLine, threatEntityId);
      }
      return {
        success: true,
        newLog: {
          id: created.id,
          action: created.action,
          justification: created.justification,
          operatorId: created.operatorId,
          createdAt: created.createdAt.toISOString(),
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save assignee.';
      return { success: false, error: message };
    }
  }

  if (prod) {
    if (!prismaDelegates.threatEvent?.update) {
      if (!prismaDelegates.threatEvent) warnMissingDelegate('threatEvent');
      return { success: false, error: 'Database update failed.' };
    }
    const prev = prod.assigneeId ?? null;
    if (prev === value) {
      revalidateThreatAssigneeSurfaces();
      return { success: true, newLog: null };
    }
    try {
      const created = await prisma.$transaction(
        async (tx) => {
          const existing = await tx.threatEvent.findUnique({
            where: { id: threatEntityId },
            select: { assigneeId: true },
          });
          if (!existing) return null;
          if ((existing.assigneeId ?? null) === value) return null;
          await updateThreatWithIntegrity({
            threatId: threatEntityId,
            changes: { assigneeId: value },
            actorUserId: effectiveOperatorId,
            eventType: "THREAT_ASSIGNEE_CHANGED",
            tx,
            select: { id: true },
          });
          return auditLogCreateLooseTx(tx, {
            data: {
              action: 'ASSIGNEE_CHANGE',
              justification: buildAssigneeChangeJustification(threatEntityId, false, existing.assigneeId ?? null),
              operatorId: effectiveOperatorId,
              threatId: threatEntityId,
              isSimulation: false,
              tenantId: tenantUuid,
            },
          });
        },
        THREAT_INTERACTIVE_TX_OPTIONS,
      );
      revalidateThreatAssigneeSurfaces();
      if (!created) {
        return { success: true, newLog: null };
      }
      if (value != null) {
        await recordResilienceIntelStreamLine(assignmentTelemetryLine, threatEntityId);
      }
      return {
        success: true,
        newLog: {
          id: created.id,
          action: created.action,
          justification: created.justification,
          operatorId: created.operatorId,
          createdAt: created.createdAt.toISOString(),
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save assignee.';
      return { success: false, error: message };
    }
  }

  if (sim) {
    const prev = sim.assigneeId ?? null;
    if (prev === value) {
      revalidateThreatAssigneeSurfaces();
      return { success: true, newLog: null };
    }
    try {
      const created = await prisma.$transaction(
        async (tx) => {
          const row = await tx.riskEvent.findFirst({
            where: { id: threatEntityId, tenantId: tenantUuid },
            select: { assigneeId: true },
          });
          if (!row) return null;
          if ((row.assigneeId ?? null) === value) return null;
          await tx.riskEvent.updateMany({
            where: { id: threatEntityId, tenantId: tenantUuid },
            data: { assigneeId: value },
          });
          return auditLogCreateLooseTx(tx, {
            data: shadowSimAuditLogData(tenantUuid, threatEntityId, {
              action: 'ASSIGNEE_CHANGE',
              justification: buildAssigneeChangeJustification(threatEntityId, true, row.assigneeId ?? null),
              operatorId: effectiveOperatorId,
            }),
          });
        },
        THREAT_INTERACTIVE_TX_OPTIONS,
      );
      revalidateThreatAssigneeSurfaces();
      if (!created) {
        return { success: true, newLog: null };
      }
      if (value != null) {
        await recordResilienceIntelStreamLine(assignmentTelemetryLine, threatEntityId);
      }
      return {
        success: true,
        newLog: {
          id: created.id,
          action: created.action,
          justification: created.justification,
          operatorId: created.operatorId,
          createdAt: created.createdAt.toISOString(),
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save assignee.';
      return { success: false, error: message };
    }
  }

  let sqlProbeSimExists = false;
  try {
    const lastProbe = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM "SimThreatEvent"
      WHERE "tenant_id" = ${tenantUuid} AND id = ${threatEntityId}
    `;
    sqlProbeSimExists = Boolean(lastProbe[0]?.n != null && lastProbe[0]!.n > 0n);
  } catch {
    sqlProbeSimExists = false;
  }

  if (!globalCheck) {
    console.error("VERDICT: ROW_NOT_WRITTEN - Simulation failed to persist.");
  } else if (globalCheck.tenantId !== activeTenantId) {
    console.error("VERDICT: TENANT_MISMATCH - Cookie and DB entry do not align.");
  } else {
    console.error("VERDICT: SCOPED_LOOKUP_OK_BUT_UPDATE_FAILED - Check Prisma transaction state.");
  }

  return {
    success: false,
    error: `[setThreatAssigneeAction] No ThreatEvent or SimThreatEvent for threatId ${threatEntityId} in tenant ${tenantUuid.slice(0, 8)}… scope (confirm simulation row committed and tenant cookie matches).${sqlProbeSimExists ? " Raw SQL sees SimThreatEvent row — ORM tenant/id mismatch or session scope." : ""}`,
  };
}

export async function addWorkNoteAction(threatId: string, text: string, operatorId: string): Promise<{ success: true } | { success: false; error: string }> {
  if (!prismaDelegates.workNote) {
    warnMissingDelegate('workNote');
    return { success: false, error: 'Work notes are not available.' };
  }
  const { workNoteSchema } = await import('@/app/utils/irongateSchema');
  const parsed = workNoteSchema.safeParse({ text });
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join('; ');
    return { success: false, error: msg };
  }
  const trimmedText = parsed.data.text;
  try {
    await prismaDelegates.workNote.create({
      data: {
        text: trimmedText,
        operatorId,
        threatId,
      },
    });
    const auditOperator =
      operatorId.trim().toLowerCase() === "user_00" ? "User_00" : operatorId.trim();
    await logThreatActivity(
      threatId,
      "ASSIGNEE_COMMENT",
      JSON.stringify({
        source: "WORK_NOTE_MIRROR",
        workNoteText: trimmedText,
        constitutionalAuthority: auditOperator === "User_00" ? "User_00" : undefined,
      }),
      { operatorId: auditOperator },
    );
    return { success: true };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'P2003') {
      return {
        success: false,
        error: `[appendWorkNoteToThreat] FK P2003: threatEvent id ${threatId} missing — save pipeline threat first`,
      };
    }
    const message = err instanceof Error ? err.message : 'Failed to save note.';
    return { success: false, error: message };
  }
}

export async function saveAIReportToThreat(threatId: string, aiReport: string): Promise<{ success: true } | { success: false; error: string }> {
  if (!prismaDelegates.threatEvent?.update || !prismaDelegates.auditLog?.create) {
    if (!prismaDelegates.threatEvent) warnMissingDelegate('threatEvent');
    if (!prismaDelegates.auditLog) warnMissingDelegate('auditLog');
    return { success: false, error: 'Database update failed' };
  }
  try {
    await runThreatTransaction(threatId, null, async (tx) => {
      await updateThreatWithIntegrity({
        threatId,
        changes: { aiReport },
        actorUserId: "CoreIntel",
        eventType: "AI_REPORT_SAVED",
        tx,
        select: { id: true },
      });
      await auditLogCreateLooseTx(tx, {
        data: {
          action: 'AI_REPORT_SAVED',
          justification: null,
          operatorId: 'CoreIntel',
          threatId,
        },
      });
    });
    await logThreatActivity(
      threatId,
      'AI_REPORT_SAVED',
      'CoreIntel Agent completed analysis and saved findings.',
    );
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('[DB_SAVE_ERROR] Failed to save AI report:', error);
    return { success: false, error: 'Database update failed' };
  }
}

const IRONTECH_AGENT_NAME = "Irontech";

export type ManualRecoveryPayload = {
  threatId: string;
  threatTitle: string;
  agentOperationId: string | null;
  failures: Array<{ attempt: number; error: string; at?: string }>;
  recipeSummary: string;
  diagnosticJson: string;
  threatStatus: string;
  remoteTechId: string | null;
  isRemoteAccessAuthorized: boolean;
  /** True when recorded failures indicate provider quota / rate limits (Sprint 6.19). */
  infrastructureLimitDetected: boolean;
};

/** Data for Manual Recovery overlay (failed attempts + diagnostic / Ironintel context). */
export async function getManualRecoveryData(
  threatId: string,
): Promise<ManualRecoveryPayload | { error: string }> {
  const tid = threatId.trim();
  const threat = await prisma.threatEvent.findUnique({
    where: { id: tid },
    select: {
      title: true,
      status: true,
      isRemoteAccessAuthorized: true,
      remoteTechId: true,
      ingestionDetails: true,
    },
  });
  if (!threat)
    return { error: `[getManualRecoveryData] threatEvent.findUnique: no row for threatId ${tid}` };
  const op = await prisma.agentOperation.findUnique({
    where: { threatId_agentName: { threatId: tid, agentName: IRONTECH_AGENT_NAME } },
  });
  const snap = op?.snapshot as Record<string, unknown> | null;
  const failures = Array.isArray(snap?.failures)
    ? (snap!.failures as ManualRecoveryPayload["failures"])
    : [];
  const dh = snap?.diagnosticHierarchy;
  let recipeSummary = "Remediation context appears in the diagnostic block below.";
  if (typeof dh === "object" && dh !== null) {
    const o = dh as Record<string, unknown>;
    if (typeof o.remediationSummary === "string") recipeSummary = o.remediationSummary;
    else if (typeof o.summary === "string") recipeSummary = o.summary;
    else recipeSummary = JSON.stringify(dh, null, 2).slice(0, 2500);
  }
  const failureProbe = failures.map((f) => f.error).join("\n");
  const infrastructureLimitDetected =
    isGrcInfrastructureLimitMessage(failureProbe) ||
    isGrcInfrastructureLimitMessage(String(threat.ingestionDetails ?? ""));
  return {
    threatId: tid,
    threatTitle: threat.title,
    agentOperationId: op?.id ?? null,
    failures,
    recipeSummary,
    diagnosticJson: JSON.stringify(snap ?? {}, null, 2).slice(0, 8000),
    threatStatus: String(threat.status),
    remoteTechId: threat.remoteTechId ?? null,
    isRemoteAccessAuthorized: threat.isRemoteAccessAuthorized,
    infrastructureLimitDetected,
  };
}

/**
 * GRC: acknowledge provider quota/rate-limit, reset Irontech AgentOperation to pending, return threat to ACTIVE.
 */
export async function acknowledgeGrcInfrastructureLimitAndResetAgent(
  threatId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const tid = threatId.trim();
  if (!tid) {
    return { success: false, error: "Missing threat id." };
  }
  const threat = await prisma.threatEvent.findUnique({
    where: { id: tid },
    select: { ingestionDetails: true },
  });
  if (!threat) {
    return {
      success: false,
      error: `[acknowledgeGrcInfrastructureLimitAndResetAgent] threatEvent.findUnique: no row for ${tid}`,
    };
  }
  const op = await prisma.agentOperation.findUnique({
    where: { threatId_agentName: { threatId: tid, agentName: IRONTECH_AGENT_NAME } },
  });
  const snap =
    op?.snapshot && typeof op.snapshot === "object" && op.snapshot !== null
      ? (op.snapshot as Record<string, unknown>)
      : {};
  const failures = Array.isArray(snap.failures)
    ? (snap.failures as Array<{ error?: string }>)
    : [];
  const probe = failures.map((f) => String(f.error ?? "")).join("\n");
  const ingProbe = String(threat.ingestionDetails ?? "");
  if (
    !isGrcInfrastructureLimitMessage(probe) &&
    !isGrcInfrastructureLimitMessage(ingProbe)
  ) {
    return {
      success: false,
      error:
        "No infrastructure quota or rate-limit error is recorded for this threat. Use standard recovery actions.",
    };
  }
  const base = parseIngestionDetailsForMerge(threat.ingestionDetails);
  delete base.irontechLive;
  base.grcInfrastructureLimitAcknowledgedAt = new Date().toISOString();
  const nextSnap: Record<string, unknown> = { ...snap, failures: [] };
  await prisma.$transaction(async (tx) => {
    await transitionThreatStatus({
      threatId: tid,
      newStatus: ThreatState.CONFIRMED,
      actorUserId: "grc-desktop",
      eventType: "GRC_INFRA_RESET_ACTIVE",
      tx,
      extraChanges: {
        ingestionDetails: JSON.stringify(base),
      },
    });
    if (op) {
      await tx.agentOperation.update({
        where: { id: op.id },
        data: {
          status: AgentOperationStatus.PENDING,
          lastError: null,
          attemptCount: 0,
          snapshot: nextSnap as Prisma.InputJsonValue,
        },
      });
    } else {
      await tx.agentOperation.updateMany({
        where: { threatId: tid, agentName: IRONTECH_AGENT_NAME },
        data: {
          status: AgentOperationStatus.PENDING,
          lastError: null,
          attemptCount: 0,
        },
      });
    }
  });
  await auditLogCreateLoose({
    data: {
      action: "GRC_INFRASTRUCTURE_LIMIT_ACKNOWLEDGED",
      justification:
        "GRC acknowledged Gemini/provider quota or rate-limit; Irontech reset to pending; threat returned to ACTIVE.",
      operatorId: "grc-desktop",
      threatId: tid,
    },
  });
  revalidatePath("/");
  return { success: true };
}

export type ManualMitigationFourthAttemptResult =
  | { success: true }
  | { success: false; fourthAttemptFailed: true; error: string }
  | { success: false; fourthAttemptFailed: false; error: string };

function summarizeFourthAttemptResult(result: ExecuteWithRetryResult): ManualMitigationFourthAttemptResult {
  if (result.ok && result.completed) {
    return { success: true };
  }
  if (!result.ok && "escalated" in result && result.escalated) {
    return { success: false, fourthAttemptFailed: true, error: result.error };
  }
  const err =
    !result.ok && "error" in result ? result.error : "Mitigation attempt did not complete.";
  return { success: false, fourthAttemptFailed: false, error: err };
}

/** One mitigation attempt after manual review (bypasses chaos-test auto-fail tag). */
export async function manualMitigationFourthAttempt(
  threatId: string,
): Promise<ManualMitigationFourthAttemptResult> {
  const tid = threatId.trim();
  await transitionThreatStatus({
    threatId: tid,
    newStatus: ThreatState.CONFIRMED,
    actorUserId: "grc-desktop",
    eventType: "MANUAL_MITIGATION_REARMED",
  });
  await prisma.agentOperation.updateMany({
    where: { threatId: tid, agentName: IRONTECH_AGENT_NAME },
    data: {
      status: AgentOperationStatus.PENDING,
      attemptCount: 0,
      lastError: null,
    },
  });
  const result = await executeWithRetry(IRONTECH_AGENT_NAME, tid, async () => {}, {
    maxAttempts: 1,
    bypassChaosTestTag: true,
  });
  revalidatePath("/");
  return summarizeFourthAttemptResult(result);
}

/**
 * Desktop recovery: resolve threat, complete AgentOperation, audit the authorizing operator.
 */
export async function authorizeManualResolution(
  threatId: string,
  operatorId: string,
  /** When ≥50 chars, used as audit resolution text; else default desktop-recovery template. */
  resolutionJustificationOverride?: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const tid = threatId.trim();
  const op = operatorId.trim() || "operator-unknown";
  const override = resolutionJustificationOverride?.trim() ?? "";
  const justification =
    override.length >= 50
      ? override
      : `Manual resolution authorized by operator ${op} after Irontech Phone Home escalation. ` +
        "Threat closed via desktop recovery (GRC). ".repeat(2);
  const r = await resolveThreatAction(tid, op, justification, op);
  if (!r.success) {
    return { success: false, error: "Resolution rejected (check justification length)." };
  }
  await prisma.agentOperation.updateMany({
    where: { threatId: tid, agentName: IRONTECH_AGENT_NAME },
    data: { status: AgentOperationStatus.COMPLETED, lastError: null },
  });
  await auditLogCreateLoose({
    data: {
      action: "MANUAL_RESOLUTION_AUTHORIZED",
      justification: `Desktop recovery: operator ${op} authorized closure after escalation.`,
      operatorId: op,
      threatId: tid,
    },
  });
  revalidatePath("/");
  return { success: true };
}

/**
 * Toggle remote access — **Admin/Owner (or IRONFRAME_REMOTE_ACCESS_ADMIN_EMAILS) + Supabase session only**.
 */
export async function toggleRemoteAccessAuthorization(
  threatId: string,
): Promise<
  { success: true; isRemoteAccessAuthorized: boolean } | { success: false; error: string }
> {
  const tid = threatId.trim();
  if (!tid) {
    return { success: false, error: "Missing threat id." };
  }
  let userId: string;
  try {
    userId = await requireSupabaseAdminOrOwnerForRemoteAccess();
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
  const row = await prisma.threatEvent.findUnique({
    where: { id: tid },
    select: { isRemoteAccessAuthorized: true },
  });
  if (!row) {
    return {
      success: false,
      error: `[toggleRemoteAccessAuthorization] threatEvent.findUnique: no row for ${tid}`,
    };
  }
  const next = !row.isRemoteAccessAuthorized;
  await updateThreatWithIntegrity({
    threatId: tid,
    changes: { isRemoteAccessAuthorized: next },
    actorUserId: userId,
    eventType: "REMOTE_ACCESS_AUTHORIZATION",
  });
  await auditLogCreateLoose({
    data: {
      action: "REMOTE_ACCESS_AUTHORIZATION",
      operatorId: userId,
      threatId: tid,
      justification: JSON.stringify({
        isRemoteAccessAuthorized: next,
        source: "dashboard_admin_owner",
      }),
    },
  });
  console.log(
    `> [GRC] Remote access ${next ? "granted" : "revoked"} by dashboard user ${userId.slice(0, 8)}…`,
  );
  revalidatePath("/");
  return { success: true, isRemoteAccessAuthorized: next };
}

/** Client: enable/disable Authorize Remote Access UI (server enforces the same rules). */
export async function getRemoteAccessAdminEligibility(): Promise<{ eligible: boolean }> {
  const eligible = await isRemoteAccessAdminEligible();
  return { eligible };
}

function parseSyntheticEmployeeIdFromIngestion(ingestionDetails: string | null | undefined): string | null {
  if (!ingestionDetails || !ingestionDetails.trim()) return null;
  try {
    const parsed = JSON.parse(ingestionDetails) as { syntheticEmployeeId?: unknown };
    if (typeof parsed.syntheticEmployeeId === "string" && parsed.syntheticEmployeeId.trim()) {
      return parsed.syntheticEmployeeId.trim();
    }
  } catch {
    return null;
  }
  return null;
}

async function resolveThreatTargetClearance(
  tx: Prisma.TransactionClient,
  threatId: string,
  targetEntity: string | null | undefined,
  ingestionDetails: string | null | undefined,
): Promise<number | null> {
  const syntheticEmployeeId = parseSyntheticEmployeeIdFromIngestion(ingestionDetails);
  if (syntheticEmployeeId) {
    const direct = await tx.syntheticEmployee.findUnique({
      where: { id: syntheticEmployeeId },
      select: { clearanceLevel: true },
    });
    if (typeof direct?.clearanceLevel === "number") {
      return direct.clearanceLevel;
    }
  }

  const normalizedTarget = typeof targetEntity === "string" ? targetEntity.trim() : "";
  if (!normalizedTarget) return null;

  const byEmail = await tx.syntheticEmployee.findFirst({
    where: { email: normalizedTarget },
    select: { clearanceLevel: true },
  });
  if (typeof byEmail?.clearanceLevel === "number") {
    return byEmail.clearanceLevel;
  }

  const fallbackThreat = await tx.threatEvent.findUnique({
    where: { id: threatId },
    select: { targetEntity: true },
  });
  const fallbackEmail = fallbackThreat?.targetEntity?.trim() ?? "";
  if (!fallbackEmail) return null;
  const fallback = await tx.syntheticEmployee.findFirst({
    where: { email: fallbackEmail },
    select: { clearanceLevel: true },
  });
  return typeof fallback?.clearanceLevel === "number" ? fallback.clearanceLevel : null;
}

export async function requestThreatResolution(
  threatId: string,
  resolutionNote: string,
  artifactId?: string,
): Promise<{ success: true; approvalId: string } | { success: false; error: string }> {
  const requestedId = threatId.trim();
  const note = resolutionNote.trim();
  if (!requestedId) return { success: false, error: "Missing threat id." };
  if (note.length < 10) {
    return { success: false, error: "Resolution note must be at least 10 characters." };
  }

  const user = await getSupabaseSessionUser();
  if (!user?.id?.trim()) {
    return { success: false, error: "Authentication required." };
  }
  const requestedByUserId = user.id.trim();

  try {
    const tid = await resolveThreatIdForResolutionRequest(requestedId);
    if (!tid) return { success: false, error: "Threat not found for this target." };

    const threat = await prisma.threatEvent.findUnique({
      where: { id: tid },
      select: { id: true, tenantCompanyId: true },
    });
    if (!threat) return { success: false, error: "Threat not found." };
    if (threat.tenantCompanyId == null) {
      return { success: false, error: "Threat is missing tenant company context." };
    }

    const company = await prisma.company.findUnique({
      where: { id: threat.tenantCompanyId },
      select: { tenantId: true },
    });
    if (!company?.tenantId) {
      return { success: false, error: "Unable to resolve tenant for threat." };
    }

    const normalizedArtifactId = artifactId?.trim() || "";

    const created = await prisma.$transaction(async (tx) => {
      const threatForClearance = await tx.threatEvent.findUnique({
        where: { id: tid },
        select: { targetEntity: true, ingestionDetails: true },
      });
      if (!threatForClearance) {
        throw new Error("Threat not found.");
      }

      const targetClearance = await resolveThreatTargetClearance(
        tx,
        tid,
        threatForClearance.targetEntity,
        threatForClearance.ingestionDetails,
      );
      if (targetClearance != null && targetClearance >= 4 && !normalizedArtifactId) {
        throw new Error("PROTOCOL_VIOLATION_EVIDENCE_REQUIRED");
      }

      const approval = await tx.threatApproval.create({
        data: {
          threatId: tid,
          tenantId: company.tenantId,
          status: "PENDING",
          requestedByUserId,
          approvalNote: note,
          approvalPayloadHash: null,
        },
        select: { id: true },
      });

      const ledgerEntry = await integrityService.logEvent(tx, {
        tenantId: company.tenantId,
        eventType: "THREAT_RESOLUTION_REQUESTED",
        entityType: "THREAT_APPROVAL",
        entityId: approval.id,
        actorUserId: requestedByUserId,
        payload: {
          threatId: tid,
          requestedByUserId,
          resolutionNote: note,
          artifactId: normalizedArtifactId || null,
        },
        source: EventSource.SYSTEM,
      });
      await tx.threatApproval.update({
        where: { id: approval.id },
        data: { approvalPayloadHash: ledgerEntry.payloadHash },
      });
      return approval;
    });
    if (normalizedArtifactId) {
      const attachment = await attachEvidenceToThreat(
        normalizedArtifactId,
        tid,
        `Resolution request linkage. approvalId:${created.id}`,
      );
      if (!attachment.success) {
        await prisma.threatApproval.delete({ where: { id: created.id } });
        return { success: false, error: attachment.error };
      }
    }

    revalidatePath("/");
    return { success: true, approvalId: created.id as string };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to request resolution.";
    return { success: false, error: message };
  }
}

export async function approveThreatResolution(
  approvalId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const aid = approvalId.trim();
  if (!aid) return { success: false, error: "Missing approval id." };

  const user = await getSupabaseSessionUser();
  const approverUserId = user?.id?.trim() ?? "";
  if (!approverUserId) {
    return { success: false, error: "Authentication required." };
  }

  try {
    const approval = await prisma.threatApproval.findUnique({
      where: { id: aid },
      select: {
        id: true,
        status: true,
        tenantId: true,
        threatId: true,
        approvalNote: true,
        threat: {
          select: {
            id: true,
            targetEntity: true,
            ingestionDetails: true,
          },
        },
      },
    });
    if (!approval) return { success: false, error: "Approval record not found." };

    const jar = await cookies();
    const handshakeRole = jar.get(HANDSHAKE_ROLE_COOKIE)?.value;
    const hitlCategory = parseHitlCategoryFromApprovalNote(approval.approvalNote);

    const mayReview = await actorMayReviewHitlApproval(
      user,
      approverUserId,
      approval.tenantId,
      hitlCategory,
      handshakeRole,
    );
    if (!mayReview) {
      return {
        success: false,
        error: hitlCategoryRequiresCisoAdmin(hitlCategory)
          ? "CISO or ADMIN role required for financial / breach HITL attestations."
          : "Only GRC_MANAGER, GLOBAL_ADMIN, CISO, or DIRECTOR_OF_COMPLIANCE can approve.",
      };
    }

    if (approval.status === "APPROVED") {
      return { success: true };
    }

    const syntheticEmployeeId = parseSyntheticEmployeeIdFromIngestion(
      approval.threat?.ingestionDetails ?? null,
    );

    await prisma.$transaction(async (tx) => {
      const targetClearance = await resolveThreatTargetClearance(
        tx,
        approval.threatId as string,
        approval.threat?.targetEntity,
        approval.threat?.ingestionDetails,
      );
      const evidenceAttachment = await tx.evidenceAttachment.findFirst({
        where: {
          tenantId: approval.tenantId,
          entityType: "THREAT_EVENT",
          entityId: approval.threatId as string,
        },
        select: { id: true },
      });
      if (targetClearance != null && targetClearance >= 4 && !evidenceAttachment) {
        throw new Error("PROTOCOL_VIOLATION_EVIDENCE_REQUIRED");
      }

      await tx.threatApproval.update({
        where: { id: aid },
        data: {
          status: "APPROVED",
          approvedByUserId: approverUserId,
          approvedAt: new Date(),
        },
      });

      await updateThreatWithIntegrity({
        threatId: approval.threatId as string,
        changes: ({ resolutionApprovalId: aid } as Prisma.ThreatEventUpdateInput),
        actorUserId: approverUserId,
        eventType: "THREAT_RESOLUTION_LINKED_APPROVAL",
        tx,
      });

      if (syntheticEmployeeId) {
        await tx.syntheticEmployee.update({
          where: { id: syntheticEmployeeId },
          data: {
            isBreached: false,
            status: "PROTECTED",
          },
        });
      } else if (typeof approval.threat?.targetEntity === "string" && approval.threat.targetEntity.trim()) {
        await tx.syntheticEmployee.updateMany({
          where: { email: approval.threat.targetEntity.trim() },
          data: {
            isBreached: false,
            status: "PROTECTED",
          },
        });
      }

      await integrityService.createLedgerEntry(tx, {
        tenantId: approval.tenantId as string,
        eventType:
          hitlCategory === "ALE_CIRCUIT_BREAKER"
            ? "HITL_ALE_REMEDIATION_APPROVED"
            : "THREAT_RESOLUTION_APPROVED",
        entityType: "THREAT_APPROVAL",
        entityId: aid,
        actorUserId: approverUserId,
        payload: {
          threatId: approval.threatId,
          approvedByUserId: approverUserId,
          hitlCategory,
          ...(hitlCategory === "ALE_CIRCUIT_BREAKER"
            ? {
                pendingLedgerCents: (() => {
                  try {
                    const j = parseIngestionDetailsForMerge(
                      approval.threat?.ingestionDetails ?? null,
                    ) as { hitlReview?: { pendingLedgerCents?: string } };
                    return j?.hitlReview?.pendingLedgerCents ?? null;
                  } catch {
                    return null;
                  }
                })(),
              }
            : {}),
        },
        source: EventSource.SYSTEM,
      });
    });

    revalidatePath("/");
    revalidatePath("/integrity");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to approve resolution.";
    return { success: false, error: message };
  }
}

const HANDSHAKE_ROLE_COOKIE = "ironframe-handshake-role";

function isKimbotSimulationIngestion(ingestionDetails: string | null | undefined, sourceAgent: string): boolean {
  const src = (sourceAgent ?? "").toUpperCase();
  if (src.includes("KIMBOT")) return true;
  try {
    const j = JSON.parse(ingestionDetails ?? "{}") as Record<string, unknown>;
    if (j?.simulator === "KIMBOT" || j?.simulator === "ATTBOT") return true;
    if (j?.category === "SIMULATION") return true;
  } catch {
    /* ignore */
  }
  return false;
}

async function actorMayAttestAsCiso(
  sessionUser: Awaited<ReturnType<typeof getSupabaseSessionUser>>,
  userId: string,
  tenantUuid: string,
  handshakeRaw: string | undefined,
): Promise<boolean> {
  const devUid = await resolveDevConstitutionalAuthorityUserId(sessionUser, tenantUuid);
  if (devUid) return true;
  if ((handshakeRaw ?? "").trim().toUpperCase() === "CISO") return true;
  const row = await prisma.userRoleAssignment.findFirst({
    where: {
      userId,
      tenantId: tenantUuid,
      role: { in: ["CISO", "GRC_MANAGER"] },
    },
    select: { id: true },
  });
  return row != null;
}

/**
 * Lab / handshake: CISO attestation that primes `resolutionApprovalId` so an ADMIN-class operator can Resolve (Epic 11).
 * Shadow plane stores attestation on `ingestionDetails.shadowCisoHandshake`; prod uses `ThreatApproval` + link.
 */
export async function generateCisoApproval(
  threatId: string,
): Promise<{ success: true; approvalId: string } | { success: false; error: string }> {
  const tid = threatId.trim();
  if (!tid) return { success: false, error: "Missing threat id." };

  const user = await getSupabaseSessionUser();
  const uid = user?.id?.trim() ?? "";
  if (!uid) return { success: false, error: "Authentication required." };

  const jar = await cookies();
  const handshakeRole = jar.get(HANDSHAKE_ROLE_COOKIE)?.value;

  try {
    const sim = await readSimulationPlaneEnabled();
    if (sim) {
      const row = await prisma.riskEvent.findFirst({
        where: { id: tid },
        select: { id: true, ingestionDetails: true, sourceAgent: true, tenantCompanyId: true },
      });
      if (!row) return { success: false, error: "Shadow threat not found." };
      if (!row.tenantCompanyId) {
        return { success: false, error: "Shadow threat is missing tenant company context." };
      }
      const company = await prisma.company.findUnique({
        where: { id: row.tenantCompanyId },
        select: { tenantId: true },
      });
      if (!company?.tenantId) return { success: false, error: "Unable to resolve tenant for shadow threat." };
      const may = await actorMayAttestAsCiso(user, uid, company.tenantId, handshakeRole);
      if (!may) {
        return {
          success: false,
          error: "CISO identity required: use Control Room [CISO] or sign in with a CISO/GRC_MANAGER assignment.",
        };
      }
      const approvalId = `shadow-ciso-${randomUUID()}`;
      const secret =
        process.env.HANDSHAKE_ATTESTATION_SECRET?.trim() ||
        process.env.PRIVATE_KEY?.trim()?.slice(0, 48) ||
        "ironframe-dev-handshake-attestation";
      const attestationSignature = createHmac("sha256", secret)
        .update(`${tid}:${approvalId}:${uid}`)
        .digest("hex");
      const merged = mergeIngestionDetailsPatchJson(row.ingestionDetails ?? null, {
        shadowCisoHandshake: {
          resolutionApprovalId: approvalId,
          resolutionApprovalStatus: "APPROVED",
          approvedByUserId: uid,
          approvedAt: new Date().toISOString(),
          attestationSignature,
        },
      });
      await prisma.riskEvent.updateMany({
        where: { id: tid },
        data: { ingestionDetails: merged },
      });
      revalidatePath("/");
      return { success: true, approvalId };
    }

    const threat = await prisma.threatEvent.findUnique({
      where: { id: tid },
      select: {
        id: true,
        tenantCompanyId: true,
        sourceAgent: true,
        ingestionDetails: true,
        resolutionApprovalId: true,
        targetEntity: true,
      },
    });
    if (!threat) return { success: false, error: "Threat not found." };
    if (threat.tenantCompanyId == null) {
      return { success: false, error: "Threat is missing tenant company context." };
    }
    const company = await prisma.company.findUnique({
      where: { id: threat.tenantCompanyId },
      select: { tenantId: true },
    });
    if (!company?.tenantId) return { success: false, error: "Unable to resolve tenant for threat." };

    const may = await actorMayAttestAsCiso(user, uid, company.tenantId, handshakeRole);
    if (!may) {
      return {
        success: false,
        error: "CISO identity required: use Control Room [CISO] or sign in with a CISO/GRC_MANAGER assignment.",
      };
    }

    if (threat.resolutionApprovalId) {
      const existing = await prisma.threatApproval.findUnique({
        where: { id: threat.resolutionApprovalId },
        select: { id: true, status: true },
      });
      if (existing?.status === "APPROVED") {
        return { success: true, approvalId: existing.id };
      }
    }

    const skipEvidenceForSimKimbot = isKimbotSimulationIngestion(threat.ingestionDetails, threat.sourceAgent);

    const approvalIdOut = await prisma.$transaction(async (tx) => {
      if (!skipEvidenceForSimKimbot) {
        const targetClearance = await resolveThreatTargetClearance(
          tx,
          tid,
          threat.targetEntity,
          threat.ingestionDetails,
        );
        const evidenceAttachment = await tx.evidenceAttachment.findFirst({
          where: {
            tenantId: company.tenantId,
            entityType: "THREAT_EVENT",
            entityId: tid,
          },
          select: { id: true },
        });
        if (targetClearance != null && targetClearance >= 4 && !evidenceAttachment) {
          throw new Error("PROTOCOL_VIOLATION_EVIDENCE_REQUIRED");
        }
      }

      const approval = await tx.threatApproval.create({
        data: {
          threatId: tid,
          tenantId: company.tenantId,
          status: "APPROVED",
          requestedByUserId: uid,
          approvedByUserId: uid,
          approvedAt: new Date(),
          approvalNote: "CISO handshake attestation (generateCisoApproval).",
          approvalPayloadHash: null,
        },
        select: { id: true },
      });

      const ledgerEntry = await integrityService.logEvent(tx, {
        tenantId: company.tenantId,
        eventType: "THREAT_RESOLUTION_APPROVED",
        entityType: "THREAT_APPROVAL",
        entityId: approval.id,
        actorUserId: uid,
        payload: {
          threatId: tid,
          handshake: "generateCisoApproval",
        },
        source: EventSource.SYSTEM,
      });

      await tx.threatApproval.update({
        where: { id: approval.id },
        data: { approvalPayloadHash: ledgerEntry.payloadHash },
      });

      await updateThreatWithIntegrity({
        threatId: tid,
        changes: { resolutionApprovalId: approval.id } as Prisma.ThreatEventUpdateInput,
        actorUserId: uid,
        eventType: "THREAT_RESOLUTION_LINKED_APPROVAL",
        tx,
      });

      const syntheticEmployeeId = parseSyntheticEmployeeIdFromIngestion(threat.ingestionDetails);
      if (syntheticEmployeeId) {
        await tx.syntheticEmployee.update({
          where: { id: syntheticEmployeeId },
          data: { isBreached: false, status: "PROTECTED" },
        });
      } else {
        const email = typeof threat.targetEntity === "string" ? threat.targetEntity.trim() : "";
        if (email) {
          await tx.syntheticEmployee.updateMany({
            where: { email },
            data: { isBreached: false, status: "PROTECTED" },
          });
        }
      }
      return approval.id;
    });

    revalidatePath("/");
    revalidatePath("/integrity");
    return { success: true, approvalId: approvalIdOut };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate CISO approval.";
    return { success: false, error: message };
  }
}

/**
 * Analyst selects an agent-provided playbook option — binds resolution text, evidence manifest, and
 * (shadow/sim) CISO handshake so RESOLVE THREAT passes GRC_PROTOCOL_VIOLATION without manual typing.
 */
export async function primeAgentPlaybookSelectionAction(
  threatId: string,
  playbookId: string,
): Promise<
  | { success: true; approvalId: string; resolutionText: string }
  | { success: false; error: string }
> {
  const tid = threatId.trim();
  const pid = playbookId.trim();
  if (!tid) return { success: false, error: "Missing threat id." };
  if (!pid) return { success: false, error: "Missing playbook option id." };

  const user = await getSupabaseSessionUser();
  const uid = user?.id?.trim() ?? "";
  if (!uid) return { success: false, error: "Authentication required." };

  try {
    const sim = await readSimulationPlaneEnabled();
    const ingestionRaw = sim
      ? (
          await prisma.riskEvent.findFirst({
            where: { id: tid },
            select: { ingestionDetails: true, tenantCompanyId: true },
          })
        )?.ingestionDetails
      : (
          await prisma.threatEvent.findUnique({
            where: { id: tid },
            select: { ingestionDetails: true, tenantCompanyId: true, resolutionApprovalId: true },
          })
        )?.ingestionDetails;

    const normalizedIngestion =
      ingestionRaw == null
        ? null
        : typeof ingestionRaw === "string"
          ? ingestionRaw
          : JSON.stringify(ingestionRaw);

    const agentIngress = parseAgentIngressFromIngestion(normalizedIngestion);
    if (!agentIngress || agentIngress.suggestedRemediationOptions.length === 0) {
      return {
        success: false,
        error: "No agent suggested remediation options on this threat.",
      };
    }

    const option = findAgentPlaybookOption(agentIngress.suggestedRemediationOptions, pid);
    if (!option) {
      return { success: false, error: "Unknown playbook option." };
    }

    const approvalId = `playbook-${randomUUID()}`;
    const secret =
      process.env.HANDSHAKE_ATTESTATION_SECRET?.trim() ||
      process.env.PRIVATE_KEY?.trim()?.slice(0, 48) ||
      "ironframe-dev-handshake-attestation";
    const attestationSignature = createHmac("sha256", secret)
      .update(`${tid}:${approvalId}:${uid}:${option.id}`)
      .digest("hex");

    const patch = {
      evidenceLink: SIM_MANIFEST_EVIDENCE_URL,
      agentPlaybookGatePrimed: true,
      selectedPlaybookId: option.id,
      selectedPlaybookLabel: option.label,
      selectedPlaybookResolutionText: option.resolutionText,
      shadowCisoHandshake: {
        resolutionApprovalId: approvalId,
        resolutionApprovalStatus: "APPROVED",
        approvedByUserId: uid,
        approvedAt: new Date().toISOString(),
        attestationSignature,
        agentPlaybookAuthorization: true,
      },
    } as const;

    const mergedJson = mergeIngestionDetailsPatchJson(normalizedIngestion ?? null, patch);
    const mergedString = mergeIngestionDetailsPatch(normalizedIngestion ?? null, patch);

    if (sim) {
      await prisma.riskEvent.updateMany({
        where: { id: tid },
        data: { ingestionDetails: mergedJson },
      });
      revalidatePath("/");
      return { success: true, approvalId, resolutionText: option.resolutionText };
    }

    const threat = await prisma.threatEvent.findUnique({
      where: { id: tid },
      select: {
        id: true,
        tenantCompanyId: true,
        resolutionApprovalId: true,
      },
    });
    if (!threat?.tenantCompanyId) {
      return { success: false, error: "Threat not found." };
    }
    const company = await prisma.company.findUnique({
      where: { id: threat.tenantCompanyId },
      select: { tenantId: true },
    });
    if (!company?.tenantId) {
      return { success: false, error: "Unable to resolve tenant for threat." };
    }

    let linkedApprovalId = threat.resolutionApprovalId?.trim() || approvalId;

    if (!threat.resolutionApprovalId) {
      const approval = await prisma.threatApproval.create({
        data: {
          threatId: tid,
          tenantId: company.tenantId,
          status: "APPROVED",
          requestedByUserId: uid,
          approvedByUserId: uid,
          approvedAt: new Date(),
          approvalNote: `Agent playbook "${option.label}" (${option.id})`,
          approvalPayloadHash: null,
        },
        select: { id: true },
      });
      linkedApprovalId = approval.id;
      await updateThreatWithIntegrity({
        threatId: tid,
        changes: {
          resolutionApprovalId: approval.id,
          ingestionDetails: mergedString,
        } as Prisma.ThreatEventUpdateInput,
        actorUserId: uid,
        eventType: "THREAT_RESOLUTION_LINKED_APPROVAL",
      });
    } else {
      await updateThreatWithIntegrity({
        threatId: tid,
        changes: { ingestionDetails: mergedString },
        actorUserId: uid,
        eventType: "THREAT_INGESTION_DETAILS_MERGED",
      });
      linkedApprovalId = threat.resolutionApprovalId;
    }

    revalidatePath("/");
    revalidatePath("/integrity");
    return { success: true, approvalId: linkedApprovalId, resolutionText: option.resolutionText };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to apply agent playbook selection.";
    return { success: false, error: message };
  }
}

/**
 * Analyst enters custom manual justification — binds resolution text, evidence manifest, and
 * (shadow/sim) CISO handshake so RESOLVE THREAT passes GRC_PROTOCOL_VIOLATION without a playbook option.
 */
export async function primeManualJustificationAction(
  threatId: string,
  justificationText: string,
): Promise<
  | { success: true; approvalId: string; resolutionText: string }
  | { success: false; error: string }
> {
  const tid = threatId.trim();
  const trimmed = justificationText.trim();
  if (!tid) return { success: false, error: "Missing threat id." };
  try {
    assertForensicAttestationLengthForContext(trimmed);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Justification too short.";
    return { success: false, error: message };
  }

  const user = await getSupabaseSessionUser();
  const uid = user?.id?.trim() ?? "";
  if (!uid) return { success: false, error: "Authentication required." };

  try {
    const sim = await readSimulationPlaneEnabled();
    const ingestionRaw = sim
      ? (
          await prisma.riskEvent.findFirst({
            where: { id: tid },
            select: { ingestionDetails: true, tenantCompanyId: true },
          })
        )?.ingestionDetails
      : (
          await prisma.threatEvent.findUnique({
            where: { id: tid },
            select: { ingestionDetails: true, tenantCompanyId: true, resolutionApprovalId: true },
          })
        )?.ingestionDetails;

    const normalizedIngestion =
      ingestionRaw == null
        ? null
        : typeof ingestionRaw === "string"
          ? ingestionRaw
          : JSON.stringify(ingestionRaw);

    const approvalId = `manual-${randomUUID()}`;
    const secret =
      process.env.HANDSHAKE_ATTESTATION_SECRET?.trim() ||
      process.env.PRIVATE_KEY?.trim()?.slice(0, 48) ||
      "ironframe-dev-handshake-attestation";
    const attestationSignature = createHmac("sha256", secret)
      .update(`${tid}:${approvalId}:${uid}:MANUAL_INPUT`)
      .digest("hex");

    const patch = {
      evidenceLink: SIM_MANIFEST_EVIDENCE_URL,
      agentPlaybookGatePrimed: true,
      selectedPlaybookId: "MANUAL_INPUT",
      selectedPlaybookLabel: "Custom Justification (Manual Text Input)",
      selectedPlaybookResolutionText: trimmed,
      manualJustificationText: trimmed,
      shadowCisoHandshake: {
        resolutionApprovalId: approvalId,
        resolutionApprovalStatus: "APPROVED",
        approvedByUserId: uid,
        approvedAt: new Date().toISOString(),
        attestationSignature,
        agentManualJustificationAuthorization: true,
      },
    } as const;

    const mergedJson = mergeIngestionDetailsPatchJson(normalizedIngestion ?? null, patch);
    const mergedString = mergeIngestionDetailsPatch(normalizedIngestion ?? null, patch);

    if (sim) {
      await prisma.riskEvent.updateMany({
        where: { id: tid },
        data: { ingestionDetails: mergedJson },
      });
      revalidatePath("/");
      return { success: true, approvalId, resolutionText: trimmed };
    }

    const threat = await prisma.threatEvent.findUnique({
      where: { id: tid },
      select: {
        id: true,
        tenantCompanyId: true,
        resolutionApprovalId: true,
      },
    });
    if (!threat?.tenantCompanyId) {
      return { success: false, error: "Threat not found." };
    }
    const company = await prisma.company.findUnique({
      where: { id: threat.tenantCompanyId },
      select: { tenantId: true },
    });
    if (!company?.tenantId) {
      return { success: false, error: "Unable to resolve tenant for threat." };
    }

    let linkedApprovalId = threat.resolutionApprovalId?.trim() || approvalId;

    if (!threat.resolutionApprovalId) {
      const approval = await prisma.threatApproval.create({
        data: {
          threatId: tid,
          tenantId: company.tenantId,
          status: "APPROVED",
          requestedByUserId: uid,
          approvedByUserId: uid,
          approvedAt: new Date(),
          approvalNote: "Custom manual justification (agent ingress escape hatch)",
          approvalPayloadHash: null,
        },
        select: { id: true },
      });
      linkedApprovalId = approval.id;
      await updateThreatWithIntegrity({
        threatId: tid,
        changes: {
          resolutionApprovalId: approval.id,
          ingestionDetails: mergedString,
        } as Prisma.ThreatEventUpdateInput,
        actorUserId: uid,
        eventType: "THREAT_RESOLUTION_LINKED_APPROVAL",
      });
    } else {
      await updateThreatWithIntegrity({
        threatId: tid,
        changes: { ingestionDetails: mergedString },
        actorUserId: uid,
        eventType: "THREAT_INGESTION_DETAILS_MERGED",
      });
      linkedApprovalId = threat.resolutionApprovalId;
    }

    revalidatePath("/");
    revalidatePath("/integrity");
    return { success: true, approvalId: linkedApprovalId, resolutionText: trimmed };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to apply manual justification.";
    return { success: false, error: message };
  }
}

/**
 * Kimbot System Integrity drill: CISO step — persist vault manifest URL, shadow handshake (sim) or
 * approved ThreatApproval + IntegrityEvent (prod), so Admin can execute resolution without GRC_PROTOCOL_VIOLATION.
 */
export async function generateSimulationApproval(
  threatId: string,
): Promise<{ success: true; approvalId: string } | { success: false; error: string }> {
  const tid = threatId.trim();
  if (!tid) return { success: false, error: "Missing threat id." };

  const user = await getSupabaseSessionUser();
  const uid = user?.id?.trim() ?? "";
  if (!uid) return { success: false, error: "Authentication required." };

  const jar = await cookies();
  const handshakeRole = jar.get(HANDSHAKE_ROLE_COOKIE)?.value;

  try {
    const sim = await readSimulationPlaneEnabled();
    if (sim) {
      const row = await prisma.riskEvent.findFirst({
        where: { id: tid },
        select: { id: true, title: true, ingestionDetails: true, tenantCompanyId: true },
      });
      if (!row) return { success: false, error: "Shadow threat not found." };
      if (
        !isSystemIntegrityKimbotDrillThreatOnServer({
          title: row.title,
          ingestionDetails: row.ingestionDetails,
        })
      ) {
        return {
          success: false,
          error:
          "Simulation authorization applies only to Kimbot, Grcbot, or Attbot System Integrity drill cards.",
        };
      }
      if (!row.tenantCompanyId) {
        return { success: false, error: "Shadow threat is missing tenant company context." };
      }
      const company = await prisma.company.findUnique({
        where: { id: row.tenantCompanyId },
        select: { tenantId: true },
      });
      if (!company?.tenantId) return { success: false, error: "Unable to resolve tenant for shadow threat." };
      const may = await actorMayAttestAsCiso(user, uid, company.tenantId, handshakeRole);
      if (!may) {
        return {
          success: false,
          error: "CISO identity required: use Control Room [CISO] or sign in with a CISO/GRC_MANAGER assignment.",
        };
      }
      const prev = parseShadowHandshakeApproval(row.ingestionDetails);
      if (
        prev.resolutionApprovalStatus === "APPROVED" &&
        prev.resolutionApprovalId &&
        ingestionHasVaultSimManifest(row.ingestionDetails)
      ) {
        return { success: true, approvalId: prev.resolutionApprovalId };
      }
      const manifestToken = randomUUID();
      const approvalId = `sim-ciso-${manifestToken}`;
      const secret =
        process.env.HANDSHAKE_ATTESTATION_SECRET?.trim() ||
        process.env.PRIVATE_KEY?.trim()?.slice(0, 48) ||
        "ironframe-dev-handshake-attestation";
      const attestationSignature = createHmac("sha256", secret)
        .update(`${tid}:${approvalId}:${uid}`)
        .digest("hex");
      const merged = mergeIngestionDetailsPatchJson(row.ingestionDetails ?? null, {
        evidenceLink: SIM_MANIFEST_EVIDENCE_URL,
        shadowCisoHandshake: {
          resolutionApprovalId: approvalId,
          resolutionApprovalStatus: "APPROVED",
          approvedByUserId: uid,
          approvedAt: new Date().toISOString(),
          attestationSignature,
          simulationAuthorization: true,
        },
      });
      await prisma.$transaction(async (tx) => {
        await tx.riskEvent.updateMany({
          where: { id: tid },
          data: { ingestionDetails: merged },
        });
        await integrityService.logEvent(tx, {
          tenantId: company.tenantId,
          eventType: GRC_CISO_SIMULATION_AUTH_EVENT,
          entityType: "THREAT_EVENT",
          entityId: tid,
          actorUserId: uid,
          payload: {
            threatId: tid,
            evidenceLink: SIM_MANIFEST_EVIDENCE_URL,
            shadowPlane: true,
          },
          source: EventSource.SYSTEM,
        });
      });
      revalidatePath("/");
      return { success: true, approvalId };
    }

    const threat = await prisma.threatEvent.findUnique({
      where: { id: tid },
      select: {
        id: true,
        title: true,
        tenantCompanyId: true,
        sourceAgent: true,
        ingestionDetails: true,
        resolutionApprovalId: true,
        targetEntity: true,
      },
    });
    if (!threat) return { success: false, error: "Threat not found." };
    if (threat.tenantCompanyId == null) {
      return { success: false, error: "Threat is missing tenant company context." };
    }
    if (
      !isSystemIntegrityKimbotDrillThreatOnServer({
        title: threat.title,
        ingestionDetails: threat.ingestionDetails,
      })
    ) {
      return {
        success: false,
        error:
          "Simulation authorization applies only to Kimbot, Grcbot, or Attbot System Integrity drill cards.",
      };
    }
    const company = await prisma.company.findUnique({
      where: { id: threat.tenantCompanyId },
      select: { tenantId: true },
    });
    if (!company?.tenantId) return { success: false, error: "Unable to resolve tenant for threat." };

    const may = await actorMayAttestAsCiso(user, uid, company.tenantId, handshakeRole);
    if (!may) {
      return {
        success: false,
        error: "CISO identity required: use Control Room [CISO] or sign in with a CISO/GRC_MANAGER assignment.",
      };
    }

    if (threat.resolutionApprovalId) {
      const existing = await prisma.threatApproval.findUnique({
        where: { id: threat.resolutionApprovalId },
        select: { id: true, status: true },
      });
      if (existing?.status === "APPROVED") {
        return { success: true, approvalId: existing.id };
      }
    }

    const mergedIngestionBase = mergeIngestionDetailsPatch(threat.ingestionDetails ?? null, {
      evidenceLink: SIM_MANIFEST_EVIDENCE_URL,
    });

    const skipEvidenceGate =
      isKimbotSimulationIngestion(threat.ingestionDetails, threat.sourceAgent) ||
      isSystemIntegrityKimbotDrillThreatOnServer({
        title: threat.title,
        ingestionDetails: threat.ingestionDetails,
      });

    const approvalIdOut = await prisma.$transaction(async (tx) => {
      if (!skipEvidenceGate) {
        const targetClearance = await resolveThreatTargetClearance(
          tx,
          tid,
          threat.targetEntity,
          threat.ingestionDetails,
        );
        const evidenceAttachment = await tx.evidenceAttachment.findFirst({
          where: {
            tenantId: company.tenantId,
            entityType: "THREAT_EVENT",
            entityId: tid,
          },
          select: { id: true },
        });
        if (targetClearance != null && targetClearance >= 4 && !evidenceAttachment) {
          throw new Error("PROTOCOL_VIOLATION_EVIDENCE_REQUIRED");
        }
      }

      const approval = await tx.threatApproval.create({
        data: {
          threatId: tid,
          tenantId: company.tenantId,
          status: "APPROVED",
          requestedByUserId: uid,
          approvedByUserId: uid,
          approvedAt: new Date(),
          approvalNote: "CISO simulation authorization (generateSimulationApproval).",
          approvalPayloadHash: null,
        },
        select: { id: true },
      });

      const ledgerEntry = await integrityService.logEvent(tx, {
        tenantId: company.tenantId,
        eventType: GRC_CISO_SIMULATION_AUTH_EVENT,
        entityType: "THREAT_EVENT",
        entityId: tid,
        actorUserId: uid,
        payload: {
          threatId: tid,
          approvalId: approval.id,
          evidenceLink: SIM_MANIFEST_EVIDENCE_URL,
        },
        source: EventSource.SYSTEM,
      });

      await tx.threatApproval.update({
        where: { id: approval.id },
        data: { approvalPayloadHash: ledgerEntry.payloadHash },
      });

      await updateThreatWithIntegrity({
        threatId: tid,
        changes: {
          resolutionApprovalId: approval.id,
          ingestionDetails: mergedIngestionBase,
        } as Prisma.ThreatEventUpdateInput,
        actorUserId: uid,
        eventType: "THREAT_RESOLUTION_LINKED_APPROVAL",
        tx,
      });

      return approval.id;
    });

    revalidatePath("/");
    revalidatePath("/integrity");
    return { success: true, approvalId: approvalIdOut };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate simulation authorization.";
    return { success: false, error: message };
  }
}

export type { PendingThreatResolutionItem };

async function resolveThreatIdForResolutionRequest(inputId: string): Promise<string | null> {
  const direct = await prisma.threatEvent.findUnique({
    where: { id: inputId },
    select: { id: true },
  });
  if (direct?.id) return direct.id;

  const synthetic = await prisma.syntheticEmployee.findUnique({
    where: { id: inputId },
    select: { email: true },
  });
  const email = typeof synthetic?.email === "string" ? synthetic.email.trim() : "";
  if (!email) return null;

  const linked = await prisma.threatEvent.findFirst({
    where: { targetEntity: email },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return linked?.id ?? null;
}

export async function listPendingThreatResolutions(
  tenantUuidOverride?: string | null,
  signal?: AbortSignal | null,
) {
  return listPendingThreatResolutionsCore(tenantUuidOverride, signal);
}

export async function getThreatResolutionReviewEligibility(): Promise<{ eligible: boolean }> {
  const user = await getSupabaseSessionUser();
  const uid = user?.id?.trim() ?? "";
  if (!uid) return { eligible: false };

  const eligible = await userHasAnyApproverRoleOrDevElevation(user, THREAT_RESOLUTION_APPROVER_ROLES);
  return { eligible };
}

export async function rejectThreatResolution(
  approvalId: string,
  rejectionNote?: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const aid = approvalId.trim();
  if (!aid) return { success: false, error: "Missing approval id." };

  const user = await getSupabaseSessionUser();
  const approverUserId = user?.id?.trim() ?? "";
  if (!approverUserId) return { success: false, error: "Authentication required." };

  try {
    const approval = await prisma.threatApproval.findUnique({
      where: { id: aid },
      select: {
        id: true,
        tenantId: true,
        status: true,
        approvalNote: true,
        threatId: true,
        threat: { select: { ingestionDetails: true } },
      },
    });
    if (!approval) return { success: false, error: "Approval record not found." };

    const jar = await cookies();
    const handshakeRole = jar.get(HANDSHAKE_ROLE_COOKIE)?.value;
    const hitlCategory = parseHitlCategoryFromApprovalNote(approval.approvalNote);

    const mayReview = await actorMayReviewHitlApproval(
      user,
      approverUserId,
      approval.tenantId,
      hitlCategory,
      handshakeRole,
    );
    if (!mayReview) {
      return {
        success: false,
        error: hitlCategoryRequiresCisoAdmin(hitlCategory)
          ? "CISO or ADMIN role required for financial / breach HITL attestations."
          : "Only GRC_MANAGER, GLOBAL_ADMIN, CISO, or DIRECTOR_OF_COMPLIANCE can reject.",
      };
    }

    const note =
      typeof rejectionNote === "string" && rejectionNote.trim()
        ? `${approval.approvalNote}\n\n[REJECTED] ${rejectionNote.trim()}`
        : approval.approvalNote;

    await prisma.$transaction(async (tx) => {
      await tx.threatApproval.update({
        where: { id: aid },
        data: {
          status: "REJECTED",
          approvedByUserId: approverUserId,
          approvedAt: new Date(),
          approvalNote: note,
        },
      });

      if (hitlCategory === "ALE_CIRCUIT_BREAKER" && approval.threatId) {
        const base = parseIngestionDetailsForMerge(approval.threat?.ingestionDetails ?? null);
        const existingHitl =
          base.hitlReview != null && typeof base.hitlReview === "object" && !Array.isArray(base.hitlReview)
            ? (base.hitlReview as Record<string, Prisma.InputJsonValue>)
            : {};
        const patchedIngestion = mergeIngestionDetailsPatch(approval.threat?.ingestionDetails ?? null, {
          hitlReview: {
            ...existingHitl,
            remediationFrozen: true,
            remediationFrozenAt: new Date().toISOString(),
          },
        });
        await updateThreatWithIntegrity({
          threatId: approval.threatId,
          changes: { ingestionDetails: patchedIngestion },
          actorUserId: approverUserId,
          eventType: "HITL_ALE_REMEDIATION_FROZEN",
          tx,
        });
      }

      await integrityService.logEvent(tx, {
        tenantId: approval.tenantId,
        eventType:
          hitlCategory === "ALE_CIRCUIT_BREAKER"
            ? "HITL_ALE_REMEDIATION_REJECTED"
            : "THREAT_RESOLUTION_REJECTED",
        entityType: "THREAT_APPROVAL",
        entityId: aid,
        actorUserId: approverUserId,
        payload: {
          approvalId: aid,
          approvedByUserId: approverUserId,
          note,
          hitlCategory,
          remediationFrozen: hitlCategory === "ALE_CIRCUIT_BREAKER",
        },
        source: EventSource.SYSTEM,
      });
    });

    revalidatePath("/");
    revalidatePath("/integrity");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reject resolution.";
    return { success: false, error: message };
  }
}

/**
 * Constitutional 19-agent expert path (7 gates × 5s): claim → confirm → authority scope → custody decision
 * (referral + chain-of-custody when required) → expert note → attestation → resolve.
 * Ironscribe is the sole operator on audit rows and WorkNote rows for this path; JSON retains named expert authority.
 */
export async function executeExpertAgentLifecycle(
  threatId: string,
  agentName: string,
): Promise<
  | {
      ok: true;
      pivotEvents?: { threatId: string; gateStep: number }[];
      panicFrozen?: boolean;
    }
  | { ok: false; error: string }
> {
  const id = threatId?.trim();
  if (!id) return { ok: false, error: "Missing threat id." };

  const canon = resolveExpertAgentName(agentName);
  if (!canon) {
    return {
      ok: false,
      error: `Unknown expert agent: ${agentName}. Use a roster name (Ironcore–Irontally).`,
    };
  }

  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) {
    return { ok: false, error: "Missing company context for tenant isolation." };
  }

  const isSim = await readSimulationPlaneEnabled();
  if (isSim) {
    await runShadowMarketVolatilityExpertLifecycleHook(id);
  }

  const row = isSim
    ? await prisma.riskEvent.findFirst({
        where: { id, tenantCompanyId: companyId },
        select: {
          id: true,
          ingestionDetails: true,
          title: true,
          source: true,
          targetEntity: true,
          monitoringExpiry: true,
          complianceFramework: true,
          mappedControls: true,
          status: true,
        },
      })
    : await prisma.threatEvent.findFirst({
        where: { id, tenantCompanyId: companyId },
        select: { id: true, ingestionDetails: true, title: true },
      });

  if (!row) return { ok: false, error: "Threat not found or access denied." };

  const threatSignal = inferExpertThreatSignalForHandoff({
    ingestionDetails: row.ingestionDetails,
    title: row.title,
  });

  let activeAgent: ExpertAgentCanonicalName = canon;
  const isHumanSentinelThreat = Boolean(isSim && "source" in row && row.source === SimThreatSource.HUMAN_SENTINEL);
  const sentinelTargetAsset =
    isHumanSentinelThreat && "targetEntity" in row ? (row.targetEntity?.trim() || "General Infrastructure") : null;
  const sentinelMonitoringExpiry =
    isHumanSentinelThreat && "monitoringExpiry" in row ? row.monitoringExpiry : null;

  const gateActions = [
    "ASSIGNEE_CHANGE",
    "THREAT_CONFIRMED",
    "EXPERT_AUTHORITY_SCOPED",
    "EXPERT_CUSTODY_DECISION",
    "NOTE_ADDED",
    "ATTESTATION_SUBMITTED",
    "THREAT_RESOLVED",
  ] as const;

  const sleepGate = () =>
    new Promise<void>((r) => setTimeout(r, EXPERT_LIFECYCLE_GATE_MS));

  const sleepGateWithPanicCheck = async (completedGate: number) => {
    await sleepGate();
    if (await readWorkforcePanic()) {
      await patchWorkforcePanicFreeze({
        threatId: id,
        isSim,
        frozenAfterGate: completedGate,
      });
      revalidatePath("/");
      throw new Error(PANIC_ABORT);
    }
  };

  const pivotEvents: { threatId: string; gateStep: number }[] = [];

  try {
    if (await readWorkforcePanic()) {
      return {
        ok: false,
        error:
          "Workforce panic is engaged — passive monitor only; expert lifecycle will not start.",
      };
    }

    const assignKey = (agent: ExpertAgentCanonicalName) => getExpertAssigneeKey(agent);
    const gateObserve = async (gateStep: number) => {
      const { pivoted } = await executeExpertSelfCorrectingObservation({
        threatId: id,
        tenantCompanyId: companyId,
        isSim,
        gateStep,
        activeAgent,
      });
      if (pivoted) pivotEvents.push({ threatId: id, gateStep });
    };

    if (
      isHumanSentinelThreat &&
      sentinelMonitoringExpiry &&
      sentinelMonitoringExpiry.getTime() <= Date.now() &&
      "status" in row &&
      row.status === ThreatState.IDENTIFIED
    ) {
      await closeExpiredSentinelHypothesis(id, sentinelTargetAsset ?? "General Infrastructure");
      return { ok: true, pivotEvents };
    }

    await gateObserve(1);

    // Gate 1 hard requirement for human hypotheses: verification phase before autonomous escalation.
    if (isHumanSentinelThreat && sentinelTargetAsset) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const [reasoningEvidenceCount, telemetryEvidenceCount] = await Promise.all([
        prisma.reasoningLog.count({
          where: {
            createdAt: { gte: oneHourAgo },
            OR: [{ threatId: id }, { targetAsset: sentinelTargetAsset }],
          },
        }),
        prisma.riskEvent.count({
          where: {
            tenantCompanyId: companyId,
            createdAt: { gte: oneHourAgo },
            OR: [{ targetEntity: sentinelTargetAsset }, { title: { contains: sentinelTargetAsset, mode: "insensitive" } }],
          },
        }),
      ]);
      const evidenceCount = reasoningEvidenceCount + telemetryEvidenceCount;
      if (evidenceCount <= 0) {
        const monitoringExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await prisma.$transaction(async (tx) => {
          const snap = await tx.riskEvent.findFirst({
            where: { id },
            select: { ingestionDetails: true },
          });
          let laborTracker = bumpSentinelLaborTracker(null, "Ironsight", 1);
          laborTracker = bumpSentinelLaborTracker(laborTracker, "Ironscout", 1);
          const merged = mergeIngestionDetailsPatchJson(snap?.ingestionDetails ?? null, {
            sentinelVerification: {
                phase: "GATE_1_VERIFICATION",
              status: "UNVERIFIED_HYPOTHESIS",
              targetAsset: sentinelTargetAsset,
              verifiedBy: "Ironsight",
              evidenceCount: 0,
              evaluatedAt: new Date().toISOString(),
            },
            isDeepMonitoring: true,
            isContinuousControlValidation: true,
            continuousControlValidation: {
              assignedAgent: "Ironscout",
              pollingProfile: "HIGH_FREQUENCY",
              ttlBound: true,
              startedAt: new Date().toISOString(),
              monitoringExpiry: monitoringExpiry.toISOString(),
              asset: sentinelTargetAsset,
            },
            laborTracker,
          });
          await tx.riskEvent.updateMany({
            where: { id },
            data: {
              status: ThreatState.IDENTIFIED,
              monitoringExpiry,
              ingestionDetails: merged,
            },
          });
          await tx.reasoningLog.create({
            data: {
              threatId: id,
              agentName: "Ironscout",
              targetAsset: sentinelTargetAsset,
              escalationLogic: "CONTINUOUS_CONTROL_VALIDATION_TTL_24H",
              plan: {
                mode: "HIGH_FREQUENCY_POLL",
                ttlHours: 24,
                monitoringExpiry: monitoringExpiry.toISOString(),
              } satisfies Prisma.JsonObject,
              reasoning:
                `Ironscout continuous control validation activated for ${sentinelTargetAsset}. ` +
                `No corroborating evidence at Gate 1; polling until ${monitoringExpiry.toISOString()}.`,
              confidence: 0.9,
              isCorrection: false,
              operationalMode: "AUTONOMOUS",
            },
          });
        });
        await logThreatActivity(
          id,
          "HUMAN_SENTINEL_DEEP_MONITORING_STARTED",
          `Ironsight found no immediate evidence. Ironscout continuous control validation started until ${monitoringExpiry.toISOString()}.`,
        );
        await recordResilienceIntelStreamLine(
          `🤖 [HUMAN_SENTINEL_CONTROL_VALIDATION] No immediate evidence for ${sentinelTargetAsset}. ` +
            `Ironscout high-frequency polling enabled until ${monitoringExpiry.toISOString()}.`,
          id,
        );
        revalidatePath("/");
        return {
          ok: false,
          error:
            `No immediate evidence for ${sentinelTargetAsset}. ` +
            `Risk event remains IDENTIFIED under 24h continuous control validation.`,
        };
      }
    }

    // --- Step 1: claim / assignee ---
    if (isSim) {
      await prisma.$transaction(async (tx) => {
        await tx.riskEvent.updateMany({
          where: { id },
          data: { assigneeId: assignKey(activeAgent) },
        });
      });
    } else {
      await updateThreatWithIntegrity({
        threatId: id,
        changes: { assigneeId: assignKey(activeAgent) },
        actorUserId: activeAgent,
        eventType: "EXPERT_LIFECYCLE_STEP1_ASSIGN",
      });
    }
    await logExpertLifecycleGate({
      threatId: id,
      isSim,
      actionName: gateActions[0],
      agentCanon: activeAgent,
      step: 1,
      threatType: threatSignal,
    });
    await sleepGateWithPanicCheck(1);

    await gateObserve(2);

    // --- Step 2: confirm ---
    if (isSim) {
      const simScope = row as {
        mappedControls: string[];
        complianceFramework: ComplianceFramework;
      };
      await prisma.$transaction(async (tx) => {
        let mergedIngestion: Prisma.InputJsonValue | undefined;
        if (isHumanSentinelThreat && sentinelTargetAsset) {
          const snap = await tx.riskEvent.findFirst({
            where: { id },
            select: { ingestionDetails: true },
          });
          mergedIngestion = mergeIngestionDetailsPatchJson(snap?.ingestionDetails ?? null, {
            sentinelVerification: {
              phase: "GATE_1_VERIFICATION",
              status: "HUMAN_VERIFIED",
              targetAsset: sentinelTargetAsset,
              verifiedBy: "Ironsight",
              evaluatedAt: new Date().toISOString(),
            },
            badges: ["Human-Verified"],
          });
        }
        const mappedForRow =
          simScope.mappedControls.length > 0
            ? simScope.mappedControls
            : mappedControlsForFramework(simScope.complianceFramework);
        await tx.riskEvent.updateMany({
          where: { id },
          data: {
            status: ThreatState.CONFIRMED,
            assigneeId: assignKey(activeAgent),
            mappedControls: mappedForRow,
            ...(mergedIngestion ? { ingestionDetails: mergedIngestion } : {}),
          },
        });
        const priorMapping = await tx.reasoningLog.findFirst({
          where: { threatId: id, escalationLogic: "CONTROL_FRAMEWORK_MAPPING" },
          select: { id: true },
        });
        if (!priorMapping) {
          await tx.reasoningLog.create({
            data: {
              threatId: id,
              agentName: "Irontally",
              escalationLogic: "CONTROL_FRAMEWORK_MAPPING",
              plan: {
                mappedControls: mappedForRow,
                controlMappingRecorded: true,
              } satisfies Prisma.JsonObject,
              reasoning: `Irontally attested framework control mapping: ${mappedForRow.join(", ")}.`,
              confidence: 0.96,
              isCorrection: false,
              operationalMode: "AUTONOMOUS",
            },
          });
        }
      });
    } else {
      await updateThreatWithIntegrity({
        threatId: id,
        changes: { status: ThreatState.CONFIRMED, assigneeId: assignKey(activeAgent) },
        actorUserId: activeAgent,
        eventType: "EXPERT_LIFECYCLE_STEP2_CONFIRMED",
      });
    }
    await logExpertLifecycleGate({
      threatId: id,
      isSim,
      actionName: gateActions[1],
      agentCanon: activeAgent,
      step: 2,
      threatType: threatSignal,
    });
    await sleepGateWithPanicCheck(2);

    await gateObserve(3);

    // --- Step 3: authority scope (classification vs custody matrix) ---
    await logExpertLifecycleGate({
      threatId: id,
      isSim,
      actionName: gateActions[2],
      agentCanon: activeAgent,
      step: 3,
      threatType: threatSignal,
    });
    await sleepGateWithPanicCheck(3);

    await gateObserve(4);

    // --- Step 4: custody — chain-of-custody before downstream analysis when referral applies ---
    const handoff = needsExpertHandoff(activeAgent, threatSignal);
    if (handoff.needsHandoff) {
      const fromAgent = activeAgent;
      const toAgent = handoff.targetAgent;
      const referralBody = ironscribeClerkFormat({
        agent: fromAgent,
        action: "REFERRAL",
        rawFacts: `Custody transfer to ${toAgent}; remediation requires ${toAgent} specialized authority (matrix: ${handoff.reasonKey}).`,
      });

      if (isSim) {
        await prisma.$transaction(async (tx) => {
          const snap = await tx.riskEvent.findFirst({
            where: { id },
            select: { ingestionDetails: true },
          });
          const dualRef = buildDualTimestamps();
          const merged = mergeIngestionDetailsPatchJson(snap?.ingestionDetails ?? null, {
            expertReferralLog: referralBody,
            expertReferralAtUtc: dualRef.timestampUtc,
            expertReferralAtLocal: dualRef.timestampLocal,
            expertReferralFrom: fromAgent,
            expertReferralTo: toAgent,
          });
          await tx.riskEvent.updateMany({
            where: { id },
            data: { ingestionDetails: merged },
          });
        });
      } else {
        await prisma.workNote.create({
          data: {
            threatId: id,
            text: referralBody,
            operatorId: "Ironscribe",
          },
        });
      }

      await logExpertHandoffInitiated({
        threatId: id,
        isSim,
        fromAgent,
        toAgent,
        threatSignal,
        reasonKey: handoff.reasonKey,
      });

      await logExpertChainOfCustody({
        threatId: id,
        isSim,
        fromAgent,
        toAgent,
      });

      activeAgent = toAgent;

      if (isSim) {
        await prisma.riskEvent.updateMany({
          where: { id },
          data: { assigneeId: assignKey(activeAgent) },
        });
      } else {
        await updateThreatWithIntegrity({
          threatId: id,
          changes: { assigneeId: assignKey(activeAgent) },
          actorUserId: fromAgent,
          eventType: "EXPERT_LIFECYCLE_HANDOFF_ASSIGN",
        });
      }

      revalidatePath("/");

      await logExpertLifecycleGate({
        threatId: id,
        isSim,
        actionName: gateActions[3],
        agentCanon: activeAgent,
        step: 4,
        threatType: threatSignal,
        ironscribeRawFacts: `Custody was routed from ${fromAgent} to ${toAgent} per matrix ${handoff.reasonKey}; specialized authority now holds the incident.`,
        extra: { custodyOutcome: "ROUTED", fromAgent, toAgent },
      });
    } else {
      await logExpertLifecycleGate({
        threatId: id,
        isSim,
        actionName: gateActions[3],
        agentCanon: activeAgent,
        step: 4,
        threatType: threatSignal,
        ironscribeRawFacts:
          "Authority was sustained under the initial assignee; the referral matrix did not require escalation.",
        extra: { custodyOutcome: "SUSTAINED" },
      });
    }
    await sleepGateWithPanicCheck(4);

    await gateObserve(5);

    // --- Step 5: expert work note (custodial agent = activeAgent) — Ironscribe clerk output only ---
    const expertFactsForIronscribe = getExpertJustification(activeAgent, threatSignal);
    if (isSim) {
      await prisma.$transaction(async (tx) => {
        const snap = await tx.riskEvent.findFirst({
          where: { id },
          select: { ingestionDetails: true },
        });
        const dual = buildDualTimestamps();
        const clerkNote = ironscribeClerkFormat({
          agent: activeAgent,
          action: "EXPERT_ANALYSIS",
          rawFacts: expertFactsForIronscribe,
        });
        const noteBody = `${clerkNote}\n\nLocal: ${dual.timestampLocal}\nUTC: ${dual.timestampUtc}`;
        const merged = mergeIngestionDetailsPatch(snap?.ingestionDetails ?? null, {
          expertLifecycleWorkNote: noteBody,
          expertLifecycleWorkNoteAtUtc: dual.timestampUtc,
          expertLifecycleWorkNoteAtLocal: dual.timestampLocal,
        });
        await tx.riskEvent.updateMany({
          where: { id },
          data: { ingestionDetails: merged, assigneeId: assignKey(activeAgent) },
        });
      });
    } else {
      const dual = buildDualTimestamps();
      const clerkNote = ironscribeClerkFormat({
        agent: activeAgent,
        action: "EXPERT_ANALYSIS",
        rawFacts: expertFactsForIronscribe,
      });
      const noteBody = `${clerkNote}\n\nLocal: ${dual.timestampLocal}\nUTC: ${dual.timestampUtc}`;
      await prisma.workNote.create({
        data: {
          threatId: id,
          text: noteBody,
          operatorId: "Ironscribe",
        },
      });
    }
    await logExpertLifecycleGate({
      threatId: id,
      isSim,
      actionName: gateActions[4],
      agentCanon: activeAgent,
      step: 5,
      threatType: threatSignal,
      ironscribeRawFacts: expertFactsForIronscribe,
    });
    await sleepGateWithPanicCheck(5);

    await gateObserve(6);

    // --- Step 6: submitted ---
    if (isSim) {
      await prisma.$transaction(async (tx) => {
        await tx.riskEvent.updateMany({
          where: { id },
          data: { status: ThreatState.MITIGATED, assigneeId: assignKey(activeAgent) },
        });
      });
    } else {
      await updateThreatWithIntegrity({
        threatId: id,
        changes: { status: ThreatState.MITIGATED, assigneeId: assignKey(activeAgent) },
        actorUserId: activeAgent,
        eventType: "EXPERT_LIFECYCLE_STEP4_SUBMITTED",
      });
    }
    await logExpertLifecycleGate({
      threatId: id,
      isSim,
      actionName: gateActions[5],
      agentCanon: activeAgent,
      step: 6,
      threatType: threatSignal,
    });
    await sleepGateWithPanicCheck(6);

    await gateObserve(7);

    // --- Step 7: resolved ---
    if (isSim) {
      await prisma.$transaction(async (tx) => {
        await tx.riskEvent.updateMany({
          where: { id },
          data: { status: ThreatState.RESOLVED, assigneeId: assignKey(activeAgent) },
        });
      });
    } else {
      await updateThreatWithIntegrity({
        threatId: id,
        changes: { status: ThreatState.RESOLVED, assigneeId: assignKey(activeAgent) },
        actorUserId: activeAgent,
        eventType: "EXPERT_LIFECYCLE_STEP5_RESOLVED",
      });
    }
    await logExpertLifecycleGate({
      threatId: id,
      isSim,
      actionName: gateActions[6],
      agentCanon: activeAgent,
      step: 7,
      threatType: threatSignal,
    });

    if (isSim) {
      try {
        const predictive = await calculatePredictiveFidelityForSimThreat(id);
        if (predictive) {
          const snap = await prisma.riskEvent.findFirst({
            where: { id },
            select: { ingestionDetails: true },
          });
          const merged = mergeIngestionDetailsPatchJson(snap?.ingestionDetails ?? null, {
            predictiveFidelity: predictive,
          });
          await prisma.riskEvent.updateMany({
            where: { id },
            data: { ingestionDetails: merged },
          });
          await prisma.reasoningLog.create({
            data: {
              threatId: id,
              agentName: "Ironlogic",
              escalationLogic:
                "PREDICTIVE_FIDELITY | A_pred = |P∩A| / |P∪A| × 100",
              targetAsset: predictive.divergencePoints[0] ?? predictive.actualPath[0] ?? null,
              plan: {
                formula: "A_pred = |P∩A| / |P∪A| × 100",
                predictedPath: predictive.predictedPath,
                actualPath: predictive.actualPath,
                divergencePoints: predictive.divergencePoints,
                handoverEfficiencyMs: predictive.handoverEfficiencyMs,
                metricHash: predictive.metricHash,
              } satisfies Prisma.JsonObject,
              reasoning:
                `Ironlogic predictive fidelity complete. Accuracy ${predictive.predictionAccuracyScorePct.toFixed(2)}%. ` +
                `Divergence points: ${predictive.divergencePoints.join(", ") || "none"}.`,
              confidence: 0.93,
              isCorrection: predictive.strategicPivotTriggered,
              operationalMode: "AUTONOMOUS",
            },
          });
        }
        await generateAndAttachPostMortemReport(id);
      } catch (e) {
        console.error("[post-mortem] generateAndAttachPostMortemReport failed:", e);
      }
    }

    revalidatePath("/");

    return { ok: true, pivotEvents };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === PANIC_ABORT) {
      return { ok: true, pivotEvents, panicFrozen: true };
    }
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

async function closeExpiredSentinelHypothesis(threatId: string, targetAsset: string): Promise<void> {
  const expiryNarrative =
    "🤖 [HYPOTHESIS_EXPIRED] | No corroborating evidence found after 24h continuous control validation. Closing as Negative Finding.";
  await prisma.$transaction(async (tx) => {
    const snap = await tx.riskEvent.findFirst({
      where: { id: threatId },
      select: { ingestionDetails: true },
    });
    const ing =
      snap?.ingestionDetails && typeof snap.ingestionDetails === "object" && !Array.isArray(snap.ingestionDetails)
        ? (snap.ingestionDetails as Record<string, unknown>)
        : {};
    const closedAt = new Date();
    const laborTracker = finalizeSentinelLaborAtClose(ing, closedAt);
    const merged = mergeIngestionDetailsPatchJson(snap?.ingestionDetails ?? null, {
      isDeepMonitoring: false,
      sentinelVerification: {
        phase: "GATE_7_AUTO_RESOLVE",
        status: "HYPOTHESIS_EXPIRED",
        targetAsset,
        verifiedBy: "Ironscout",
        evaluatedAt: closedAt.toISOString(),
      },
      hypothesisExpiryNarrative: expiryNarrative,
      laborTracker,
    });
    await tx.riskEvent.updateMany({
      where: { id: threatId },
      data: {
        status: ThreatState.RESOLVED,
        monitoringExpiry: null,
        ingestionDetails: merged,
      },
    });
  });
  await logThreatActivity(threatId, "HUMAN_SENTINEL_HYPOTHESIS_EXPIRED", expiryNarrative);
  await recordResilienceIntelStreamLine(expiryNarrative, threatId);
  try {
    /** Negative-outcome artifact: `generateDueDiligenceReport` (due diligence PDF) via post-mortem service. */
    await generateAndAttachPostMortemReport(threatId, "DUE_DILIGENCE_NEGATIVE");
  } catch (e) {
    console.error("[due-diligence] generateAndAttachPostMortemReport failed:", e);
  }
  revalidatePath("/");
}

/**
 * Periodic TTL sweep for sentinel hypotheses under continuous control validation.
 * Intended for cron/scheduler invocation.
 */
export async function checkMonitoringExpirations(): Promise<{
  checked: number;
  closed: number;
  closedThreatIds: string[];
}> {
  const now = new Date();
  const expired = await prisma.riskEvent.findMany({
    where: {
      source: SimThreatSource.HUMAN_SENTINEL,
      status: ThreatState.IDENTIFIED,
      monitoringExpiry: { lt: now },
    },
    select: { id: true, targetEntity: true },
    orderBy: { monitoringExpiry: "asc" },
    take: 500,
  });
  const closedThreatIds: string[] = [];
  for (const row of expired) {
    await closeExpiredSentinelHypothesis(row.id, row.targetEntity?.trim() || "General Infrastructure");
    closedThreatIds.push(row.id);
  }
  return { checked: expired.length, closed: closedThreatIds.length, closedThreatIds };
}

/** Ensure ingestion carries operational mode, then run the 7-gate Ironsight-led lifecycle (shadow plane). */
export async function runExpertWorkforceLifecycle(
  threatId: string,
  operationalMode: "AUTONOMOUS" | "HYBRID",
): Promise<
  | {
      ok: true;
      pivotEvents?: { threatId: string; gateStep: number }[];
      panicFrozen?: boolean;
    }
  | { ok: false; error: string }
> {
  const id = threatId?.trim();
  if (!id) return { ok: false, error: "Missing threat id." };
  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) {
    return { ok: false, error: "Missing company context for tenant isolation." };
  }
  const snap = await prisma.riskEvent.findFirst({
    where: { id, tenantCompanyId: companyId },
    select: { ingestionDetails: true },
  });
  if (!snap) return { ok: false, error: "Simulation threat not found or access denied." };
  const merged = mergeIngestionDetailsPatchJson(snap.ingestionDetails ?? null, {
    operationalMode,
    infiltrationDrill: true,
  });
  await prisma.riskEvent.updateMany({
    where: { id },
    data: { ingestionDetails: merged },
  });
  return executeExpertAgentLifecycle(id, "Ironsight");
}

function formatPanicAuthorityDisplay(
  user: Awaited<ReturnType<typeof getSupabaseSessionUser>>,
): string {
  const raw = user?.email?.split("@")[0]?.toLowerCase() ?? "";
  if (raw === "dereck") return "Dereck";
  if (raw && /^[a-z0-9_]+$/.test(raw)) {
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  return "Operator";
}

const FORENSIC_DRIFT_TOLERANCE_MS = 5000;

type PredictiveFidelitySummary = {
  predictedPath: string[];
  actualPath: string[];
  divergencePoints: string[];
  predictionAccuracyScorePct: number;
  handoverEfficiencyMs: number | null;
  strategicPivotTriggered: boolean;
  metricHash: string;
  computedAtUtc: string;
};

function readAssetFromReasoningPlan(plan: Prisma.JsonValue): string | null {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return null;
  const obj = plan as Record<string, unknown>;
  const direct = [obj.targetAsset, obj.asset, obj.assetName, obj.targetEntity, obj.observedVlan];
  for (const v of direct) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const telemetry = obj.telemetrySnapshot;
  if (telemetry && typeof telemetry === "object" && !Array.isArray(telemetry)) {
    const t = telemetry as Record<string, unknown>;
    const vv = [t.targetAsset, t.asset, t.assetName, t.targetEntity, t.observedVlan];
    for (const v of vv) {
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return null;
}

function computeJaccardPercent(predicted: readonly string[], actual: readonly string[]): number {
  const p = new Set(predicted.map((x) => x.trim()).filter(Boolean));
  const a = new Set(actual.map((x) => x.trim()).filter(Boolean));
  const union = new Set<string>([...p, ...a]);
  if (union.size === 0) return 100;
  let inter = 0;
  for (const item of p) if (a.has(item)) inter += 1;
  return Math.round((inter / union.size) * 10000) / 100;
}

async function calculatePredictiveFidelityForSimThreat(
  threatId: string,
): Promise<PredictiveFidelitySummary | null> {
  const row = await prisma.riskEvent.findFirst({
    where: { id: threatId },
    select: {
      id: true,
      predictedAssets: true,
      reasoningLogs: {
        orderBy: { createdAt: "asc" },
        select: { createdAt: true, targetAsset: true, plan: true, isCorrection: true, agentName: true },
      },
    },
  });
  if (!row) return null;

  const predictedObj =
    row.predictedAssets && typeof row.predictedAssets === "object" && !Array.isArray(row.predictedAssets)
      ? (row.predictedAssets as Record<string, unknown>)
      : {};
  const predictedPath = Object.entries(predictedObj)
    .map(([asset, val]) => ({ asset: asset.trim(), val: typeof val === "number" ? val : Number(val) }))
    .filter((x) => x.asset && Number.isFinite(x.val) && x.val > 0)
    .sort((a, b) => b.val - a.val)
    .map((x) => x.asset);

  const actualPathRaw = row.reasoningLogs
    .map((log) => log.targetAsset?.trim() || readAssetFromReasoningPlan(log.plan))
    .filter((v): v is string => Boolean(v));
  const actualPath = [...new Set(actualPathRaw)];

  const predictedSet = new Set(predictedPath);
  const divergencePoints = actualPath.filter((asset) => !predictedSet.has(asset));
  const predictionAccuracyScorePct = computeJaccardPercent(predictedPath, actualPath);

  let handoverEfficiencyMs: number | null = null;
  if (divergencePoints.length > 0) {
    const firstUnexpected = row.reasoningLogs.find((log) => {
      const asset = log.targetAsset?.trim() || readAssetFromReasoningPlan(log.plan);
      return Boolean(asset && divergencePoints.includes(asset));
    });
    if (firstUnexpected) {
      const firstRecovery = row.reasoningLogs.find(
        (log) => log.createdAt.getTime() >= firstUnexpected.createdAt.getTime() && log.isCorrection,
      );
      if (firstRecovery) {
        handoverEfficiencyMs = Math.max(
          0,
          firstRecovery.createdAt.getTime() - firstUnexpected.createdAt.getTime(),
        );
      }
    }
  }

  const strategicPivotTriggered = predictionAccuracyScorePct < 40;
  const computedAtUtc = new Date().toISOString();
  const metricHash = createHash("sha256")
    .update(
      JSON.stringify({
        threatId: row.id,
        predictedPath,
        actualPath,
        divergencePoints,
        predictionAccuracyScorePct,
        handoverEfficiencyMs,
        computedAtUtc,
      }),
    )
    .digest("hex");

  return {
    predictedPath,
    actualPath,
    divergencePoints,
    predictionAccuracyScorePct,
    handoverEfficiencyMs,
    strategicPivotTriggered,
    metricHash,
    computedAtUtc,
  };
}

/** Ironscribe `ReasoningLog` — JSONB `plan` + narrative carry drift math and calibration attestation. */
async function writeIronscribeForensicCalibrationReasoningLog(args: {
  threatId: string;
  clientTimestamp: number | undefined;
  context: "INFILTRATION_DRILL" | "MANUAL_OVERRIDE_PANIC";
  operationalMode?: string;
}): Promise<void> {
  const serverTimestampMs = Date.now();
  const clientTs = args.clientTimestamp;
  const driftMs =
    clientTs !== undefined && Number.isFinite(clientTs)
      ? Math.round(clientTs - serverTimestampMs)
      : null;
  const absDrift = driftMs !== null ? Math.abs(driftMs) : null;
  const calibrationSuccess = absDrift !== null && absDrift <= FORENSIC_DRIFT_TOLERANCE_MS;

  const plan: Prisma.JsonObject = {
    forensicHandshake: true,
    title: "🤖 [FORENSIC CALIBRATION]",
    authority: "Ironscribe",
    calibrationMath: {
      formula: "driftMs = clientTimestamp - serverTimestampMs",
      clientTimestamp: clientTs ?? null,
      serverTimestampMs,
      driftMs,
      absDriftMs: absDrift,
      toleranceMs: FORENSIC_DRIFT_TOLERANCE_MS,
    },
    calibrationSuccess,
    context: args.context,
    ...(args.operationalMode ? { operationalMode: args.operationalMode } : {}),
  };

  const attestation = calibrationSuccess
    ? "Calibration Success: client-reported epoch reconciled to server receipt within GRC tolerance (≤5000ms). Forensic ordering attested for this session."
    : driftMs === null
      ? "Calibration partial: client timestamp omitted; server receipt time used as UTC baseline for this handshake."
      : "Calibration review: |drift| exceeds nominal 5000ms band — flag forensic timestamp ordering for audit review.";

  const reasoning = `🤖 [FORENSIC CALIBRATION]
Authority: Ironscribe (Clerk of Record)
Context: ${args.context}
Client timestamp (epoch ms): ${clientTs ?? "not supplied"}
Server timestamp (action receipt, epoch ms): ${serverTimestampMs}
Drift (ms): ${driftMs ?? "n/a"}  [drift = clientTimestamp - serverTimestampMs]
${attestation}
[TAS COMPLIANCE — IRONSCRIBE LEDGER]`;

  await prisma.reasoningLog.create({
    data: {
      threatId: args.threatId,
      agentName: "Ironscribe",
      escalationLogic: `🤖 [FORENSIC CALIBRATION] | drift_ms=${driftMs ?? "null"} | success=${calibrationSuccess}`,
      plan,
      reasoning,
      confidence: calibrationSuccess ? 1 : driftMs === null ? 0.9 : 0.82,
      isCorrection: false,
      operationalMode: args.operationalMode ?? "AUTONOMOUS",
    },
  });
}

/** Global panic: passive monitor for roster agents, LOW priority floor on tenant sim threats, Ironscribe audit trail. */
export async function deprioritizeAllAgentsPanicAction(
  clientTimestamp?: number,
): Promise<{ ok: true; narrative: string } | { ok: false; error: string }> {
  const user = await getSupabaseSessionUser();
  const authorityDisplay = formatPanicAuthorityDisplay(user);
  const serverReceiptMs = Date.now();
  const engagementDriftMs =
    clientTimestamp !== undefined && Number.isFinite(clientTimestamp)
      ? Math.round(clientTimestamp - serverReceiptMs)
      : null;
  const narrative = `🤖 [MANUAL OVERRIDE] | Authority ${authorityDisplay} has engaged the Panic Button. All autonomous remediation is suspended. Agents reverting to read-only observation.

[FORENSIC] Clock drift captured at engagement (ms): ${engagementDriftMs ?? "n/a"}  [formula: clientTimestamp − serverReceiptTime].`;

  const companyId = await getCompanyIdForActiveTenant();

  await engageWorkforcePanicRecord(authorityDisplay);

  await prisma.$transaction(async (tx) => {
    await tx.agentRegistry.updateMany({
      where: { agentName: { not: "" } },
      data: {
        status: "PASSIVE_MONITOR",
        lastHealthCheck: new Date(),
      },
    });

    if (companyId != null) {
      await tx.riskEvent.updateMany({
        where: { tenantCompanyId: companyId },
        data: {
          severity: "LOW",
          priority_score: 1,
        },
      });
    }
  });

  if (companyId != null) {
    const anchor = await prisma.riskEvent.findFirst({
      where: { tenantCompanyId: companyId },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (anchor) {
      await writeIronscribeForensicCalibrationReasoningLog({
        threatId: anchor.id,
        clientTimestamp,
        context: "MANUAL_OVERRIDE_PANIC",
      });
    }
  }

  await logThreatActivity(null, "MANUAL_OVERRIDE_PANIC", narrative, {
    operatorId: "Ironscribe",
    isSimulation: false,
  });

  revalidatePath("/");
  revalidatePath("/integrity");
  return { ok: true, narrative };
}

/** Credential-stuffing infiltration drill — alternates AUTONOMOUS vs HYBRID; autonomous path applies Ironsight escalation math. */
export async function triggerInfiltrationDrill(
  clientTimestamp?: number,
): Promise<
  | {
      ok: true;
      threatId: string;
      mode: "AUTONOMOUS" | "HYBRID";
      lifecycleScheduled: boolean;
    }
  | { ok: false; error: string }
> {
  const enabled = await readSimulationPlaneEnabled();
  if (!enabled) {
    return { ok: false, error: "Simulation plane is disabled for this session." };
  }
  if (await readWorkforcePanic()) {
    return {
      ok: false,
      error:
        "Workforce panic is engaged — clear passive-monitor override before running drills.",
    };
  }

  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) {
    return { ok: false, error: "Missing company context for tenant isolation." };
  }

  const infiltrationTenant = await prisma.company.findUnique({
    where: { id: companyId },
    select: { tenantId: true },
  });
  if (infiltrationTenant?.tenantId == null) {
    return { ok: false, error: "Missing tenant boundary for infiltration drill." };
  }

  const currentMode =
    infiltrationDrillLastMode === "AUTONOMOUS" ? "HYBRID" : "AUTONOMOUS";
  infiltrationDrillLastMode = currentMode;

  const V = 1.0;
  const P = 0.9;
  const B = 5.0;
  const escalationTotal = V * P + B;
  const criticalThreshold = 5.0;
  const isCriticalAutonomous =
    currentMode === "AUTONOMOUS" && escalationTotal >= criticalThreshold;

  const dual = buildDualTimestamps();
  const mathNote = ironscribeClerkFormat({
    agent: "Ironscribe",
    action: "AUTO_ESCALATION_MATH",
    rawFacts: `Infiltration drill (${currentMode}). Ironsight: 5 successful logins from a blocked IP range. Model V(${V})*P(${P})+B(${B})=${escalationTotal.toFixed(
      1,
    )} (threshold ${criticalThreshold}). Score band ${isCriticalAutonomous ? "CRITICAL" : "below CRITICAL"}.`,
  });

  const baseIngestion: Record<string, unknown> = {
    entityType: "INFILTRATION_TEST",
    infiltrationDrill: true,
    operationalMode: currentMode,
    blockedIpSuccessLogins: 5,
    irsightDetection: "5 successful logins from blocked IP range",
    ironscribeWorkNote: `${mathNote}\n\nLocal: ${dual.timestampLocal}\nUTC: ${dual.timestampUtc}`,
    ironscribeWorkNoteAtUtc: dual.timestampUtc,
    ironscribeWorkNoteAtLocal: dual.timestampLocal,
    autoEscalation:
      currentMode === "AUTONOMOUS"
        ? {
            V,
            P,
            B,
            formula: `V(${V}) * P(${P}) + B(${B})`,
            total: escalationTotal,
            threshold: criticalThreshold,
            label: isCriticalAutonomous ? "CRITICAL" : "LOW",
          }
        : { held: true, mode: "HYBRID" },
    severityBadge:
      currentMode === "AUTONOMOUS"
        ? isCriticalAutonomous
          ? "CRITICAL"
          : "LOW"
        : "LOW",
  };

  const severity = isCriticalAutonomous ? "CRITICAL" : "LOW";

  const threat = await prisma.riskEvent.create({
    data: {
      title: "Shadow Credential Stuffing Detected",
      sourceAgent: "INFILTRATION_DRILL",
      score: Math.round(escalationTotal * 10),
      targetEntity: "SIM_SHADOW_AUTH",
      tenantCompanyId: companyId,
      tenantId: infiltrationTenant.tenantId,
      status: ThreatState.IDENTIFIED,
      severity,
      priority_score:
        currentMode === "AUTONOMOUS" ? Math.round(escalationTotal * 10) : 10,
      complianceFramework: ComplianceFramework.NIST,
      mappedControls: ["PR.AC-7", "PR.DS-5"],
      ingestionDetails: baseIngestion as Prisma.InputJsonValue,
    },
  });

  const reasoningPlan: Prisma.JsonObject = {
    gateStep: 0,
    strategy: "AUTO_ESCALATION_MODEL",
    detection: "5 successful logins from blocked IP range",
    mode: currentMode,
  };

  await prisma.reasoningLog.create({
    data: {
      threatId: threat.id,
      agentName: "Ironsight",
      escalationLogic: `V(${V}) * P(${P}) + B(${B}) = ${escalationTotal.toFixed(1)} (CRITICAL threshold ${criticalThreshold})`,
      plan: reasoningPlan,
      reasoning:
        "Blocked-IP login successes exceeded autonomous escalation composite; severity reflects Ironsight drift telemetry.",
      confidence: P,
      isCorrection: false,
      operationalMode: currentMode,
    },
  });

  await writeIronscribeForensicCalibrationReasoningLog({
    threatId: threat.id,
    clientTimestamp,
    context: "INFILTRATION_DRILL",
    operationalMode: currentMode,
  });

  void runExpertWorkforceLifecycle(threat.id, currentMode).then((r) => {
    if (r.ok) revalidatePath("/");
  });

  revalidatePath("/");

  return {
    ok: true,
    threatId: threat.id,
    mode: currentMode,
    lifecycleScheduled: true,
  };
}

