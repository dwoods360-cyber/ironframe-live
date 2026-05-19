"use server";

import { SecurityPosture as PrismaSecurityPosture } from "@prisma/client";
import prisma from "@/lib/prisma";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import { SYSTEM_OWNER_ID } from "@/app/config/constitutionalAuthority";
import {
  SECURITY_POSTURE_DUAL_LOCK,
  SECURITY_POSTURE_TRIPARTITE_LOCK,
} from "@/app/config/securityPosture";
import { FORENSIC_ATTESTATION_MIN_VOID } from "@/app/utils/constitutionalForensicGates";
import { requireSystemOwnerSession } from "@/app/lib/constitutionalOwnerSession";
import {
  buildGovernanceAlertMessage,
  GOVERNANCE_ABORT_ACTION,
  GOVERNANCE_ALERT_ACTION,
  POSTURE_DEGRADATION_PHASE_COOLDOWN,
  POSTURE_DEGRADATION_PHASE_PENDING,
  resolvePostureDegradationCooldownMs,
  formatPostureDegradationCountdown,
} from "@/app/config/postureDegradation";
import {
  assertTripleExecutiveKeysConfigured,
  matchExecutiveRoleFromKey,
  verifyTripleExecutiveSubmission,
} from "@/app/lib/executiveAdministrativeKeyVerify";
import { executePostureDegradationFinalization } from "@/app/lib/executePostureDegradationFinalization";
import {
  cooldownRemainingMs,
  isCooldownExpired,
  readPostureDegradationWorkflow,
  writePostureDegradationWorkflow,
  type PostureDegradationWorkflowRecord,
} from "@/app/lib/postureDegradationWorkflow";
import { getSecurityPostureConfig } from "@/app/actions/securityPostureActions";
import { resolveDashboardMitigatedValueCents } from "@/app/lib/ironbloom/productionCarbonLedger";
import { generatePostureDowngradeRiskImpactReport, type RiskImpactReport } from "@/app/lib/riskImpactReport";
import { formatCentsToUSD } from "@/app/utils/formatCentsToUSD";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { getServerActionForensics } from "@/app/lib/serverRequestForensics";
import { recordEntryWitnessDirect } from "@/app/lib/entryWitness";

export type PostureDegradationStatusDto = {
  active: boolean;
  phase: typeof POSTURE_DEGRADATION_PHASE_PENDING | typeof POSTURE_DEGRADATION_PHASE_COOLDOWN | null;
  targetPosture: typeof SECURITY_POSTURE_DUAL_LOCK | null;
  cooldownEndsAt: string | null;
  remainingMs: number | null;
  remainingLabel: string | null;
  justificationPreview: string | null;
  canFinalize: boolean;
  currentPosture: typeof SECURITY_POSTURE_TRIPARTITE_LOCK | typeof SECURITY_POSTURE_DUAL_LOCK;
  riskImpactReport: RiskImpactReport | null;
  cfoFinancialRiskAcknowledged: boolean;
  sustainabilityRoiDisplay: string | null;
};

async function loadCfoSustainabilityRoiDisplay(): Promise<string | null> {
  const tenantUuid = await getActiveTenantUuidFromCookies();
  const roi = await resolveDashboardMitigatedValueCents(tenantUuid);
  if (roi.mitigatedValueCents === "0") return null;
  return formatCentsToUSD(roi.mitigatedValueCents);
}

async function tryAutoFinalizeWorkflow(
  workflow: PostureDegradationWorkflowRecord,
): Promise<PostureDegradationWorkflowRecord | null> {
  if (workflow.phase !== POSTURE_DEGRADATION_PHASE_COOLDOWN) return workflow;
  if (!isCooldownExpired(workflow)) return workflow;
  await executePostureDegradationFinalization(workflow.justification);
  return null;
}

export async function getPostureDegradationStatus(): Promise<PostureDegradationStatusDto> {
  const current = await getSecurityPostureConfig();
  let workflow = await readPostureDegradationWorkflow();
  if (workflow) {
    workflow = await tryAutoFinalizeWorkflow(workflow);
  }

  if (!workflow) {
    return {
      active: false,
      phase: null,
      targetPosture: null,
      cooldownEndsAt: null,
      remainingMs: null,
      remainingLabel: null,
      justificationPreview: null,
      canFinalize: false,
      currentPosture: current.posture,
      riskImpactReport: null,
      cfoFinancialRiskAcknowledged: false,
      sustainabilityRoiDisplay: null,
    };
  }

  const remainingMs = cooldownRemainingMs(workflow);
  const sustainabilityRoiDisplay = workflow.riskImpactReport
    ? await loadCfoSustainabilityRoiDisplay()
    : null;

  return {
    active: true,
    phase: workflow.phase,
    targetPosture: workflow.targetPosture,
    cooldownEndsAt: workflow.cooldownEndsAt ?? null,
    remainingMs,
    remainingLabel:
      remainingMs != null ? formatPostureDegradationCountdown(remainingMs) : null,
    justificationPreview: workflow.justification.slice(0, 120),
    canFinalize:
      workflow.phase === POSTURE_DEGRADATION_PHASE_COOLDOWN && isCooldownExpired(workflow),
    currentPosture: current.posture,
    riskImpactReport: workflow.riskImpactReport ?? null,
    cfoFinancialRiskAcknowledged: Boolean(workflow.cfoFinancialRiskAcknowledgedAt),
    sustainabilityRoiDisplay,
  };
}

export type InitiateDowngradeResult =
  | { ok: true; phase: typeof POSTURE_DEGRADATION_PHASE_PENDING }
  | { ok: false; error: string };

/**
 * Task 1: TRIPARTITE → DUAL selection enters PENDING_DEGRADATION (board-level approval).
 */
export async function initiateBoardLevelDowngrade(
  degradationJustification: string,
): Promise<InitiateDowngradeResult> {
  try {
    await requireSystemOwnerSession();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unauthorized." };
  }

  const current = await getSecurityPostureConfig();
  if (current.posture !== SECURITY_POSTURE_TRIPARTITE_LOCK) {
    return { ok: false, error: "Board-level downgrade only applies from TRIPARTITE_LOCK." };
  }

  const existing = await readPostureDegradationWorkflow();
  if (existing) {
    return { ok: false, error: "Administrative downgrade already pending." };
  }

  const just = degradationJustification.trim();
  if (just.length < FORENSIC_ATTESTATION_MIN_VOID) {
    return {
      ok: false,
      error: `Board-level downgrade requires ${FORENSIC_ATTESTATION_MIN_VOID}+ character justification.`,
    };
  }

  const configured = assertTripleExecutiveKeysConfigured();
  if (!configured.ok) return configured;

  const riskImpactReport = generatePostureDowngradeRiskImpactReport();

  const record: PostureDegradationWorkflowRecord = {
    phase: POSTURE_DEGRADATION_PHASE_PENDING,
    targetPosture: SECURITY_POSTURE_DUAL_LOCK,
    justification: just,
    requestedAt: new Date().toISOString(),
    requestedBy: SYSTEM_OWNER_ID,
    riskImpactReport,
  };
  await writePostureDegradationWorkflow(record);

  return { ok: true, phase: POSTURE_DEGRADATION_PHASE_PENDING };
}

export type AcknowledgeCfoRiskResult = { ok: true } | { ok: false; error: string };

/** CFO must acknowledge financial risk before their approval key is accepted. */
export async function acknowledgeCfoFinancialRisk(): Promise<AcknowledgeCfoRiskResult> {
  try {
    await requireSystemOwnerSession();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unauthorized." };
  }

  const workflow = await readPostureDegradationWorkflow();
  if (!workflow || workflow.phase !== POSTURE_DEGRADATION_PHASE_PENDING) {
    return { ok: false, error: "No pending downgrade awaiting CFO risk acknowledgment." };
  }
  if (!workflow.riskImpactReport) {
    return { ok: false, error: "Risk impact report not generated." };
  }
  if (workflow.cfoFinancialRiskAcknowledgedAt) {
    return { ok: true };
  }

  await writePostureDegradationWorkflow({
    ...workflow,
    cfoFinancialRiskAcknowledgedAt: new Date().toISOString(),
    cfoFinancialRiskAcknowledgedBy: SYSTEM_OWNER_ID,
  });

  return { ok: true };
}

export type SubmitExecutiveSignaturesResult =
  | { ok: true; phase: typeof POSTURE_DEGRADATION_PHASE_COOLDOWN; cooldownEndsAt: string }
  | { ok: false; error: string };

/**
 * Task 2–3: Triple-executive keys → 24h cool-down + GOVERNANCE_ALERT audit broadcast.
 */
export async function submitTripleExecutiveSignatures(keys: {
  ceoKey: string;
  cfoKey: string;
  cioKey: string;
}): Promise<SubmitExecutiveSignaturesResult> {
  try {
    await requireSystemOwnerSession();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unauthorized." };
  }

  const workflow = await readPostureDegradationWorkflow();
  if (!workflow || workflow.phase !== POSTURE_DEGRADATION_PHASE_PENDING) {
    return { ok: false, error: "No pending board-level downgrade awaiting signatures." };
  }

  if (!workflow.cfoFinancialRiskAcknowledgedAt) {
    return {
      ok: false,
      error: "CFO must acknowledge the Financial Risk Audit before executive approval.",
    };
  }

  const verified = verifyTripleExecutiveSubmission(keys);
  if (!verified.ok) return verified;

  const forensics = await getServerActionForensics();
  const witnessContext = `posture-degradation:${workflow.requestedAt}`;
  for (const role of ["CEO", "CFO", "CIO"] as const) {
    await recordEntryWitnessDirect({
      context: witnessContext,
      custodianRole: role,
      clientIp: forensics.clientIp,
      fingerprintHash: forensics.fingerprintHash,
    });
  }

  const cooldownMs = resolvePostureDegradationCooldownMs();
  const now = Date.now();
  const cooldownEndsAt = new Date(now + cooldownMs).toISOString();
  const alertMessage = buildGovernanceAlertMessage(cooldownMs);

  const next: PostureDegradationWorkflowRecord = {
    ...workflow,
    phase: POSTURE_DEGRADATION_PHASE_COOLDOWN,
    signaturesAttestedAt: new Date(now).toISOString(),
    cooldownEndsAt,
  };
  await writePostureDegradationWorkflow(next);

  try {
    await auditLogCreateLoose({
      data: {
        action: GOVERNANCE_ALERT_ACTION,
        justification: JSON.stringify({
          alert: alertMessage,
          phase: POSTURE_DEGRADATION_PHASE_COOLDOWN,
          targetPosture: SECURITY_POSTURE_DUAL_LOCK,
          cooldownEndsAt,
          authorizedExecutives: ["CEO", "CFO", "CIO"],
        }),
        operatorId: SYSTEM_OWNER_ID,
        threatId: null,
        isSimulation: false,
        governance_tenant_uuid: TENANT_UUIDS.medshield,
      },
    });
  } catch (e) {
    console.error("[submitTripleExecutiveSignatures] GOVERNANCE_ALERT failed", e);
  }

  return { ok: true, phase: POSTURE_DEGRADATION_PHASE_COOLDOWN, cooldownEndsAt };
}

export type AbortDowngradeResult = { ok: true } | { ok: false; error: string };

/**
 * Task 4: Any executive may abort during the 24-hour window.
 */
export async function abortPostureDowngrade(executiveKey: string): Promise<AbortDowngradeResult> {
  const workflow = await readPostureDegradationWorkflow();
  if (!workflow) {
    return { ok: false, error: "No pending administrative downgrade." };
  }

  const role = matchExecutiveRoleFromKey(executiveKey);
  if (!role) {
    return { ok: false, error: "Valid CEO, CFO, or CIO administrative key required to abort." };
  }

  await writePostureDegradationWorkflow(null);

  try {
    await auditLogCreateLoose({
      data: {
        action: GOVERNANCE_ABORT_ACTION,
        justification: JSON.stringify({
          event: "GOVERNANCE_DEGRADATION_ABORT",
          abortedByRole: role,
          priorPhase: workflow.phase,
          message: `Administrative downgrade to DUAL_LOCK aborted by ${role}.`,
        }),
        operatorId: `EXECUTIVE_${role}`,
        threatId: null,
        isSimulation: false,
        governance_tenant_uuid: TENANT_UUIDS.medshield,
      },
    });
  } catch (e) {
    console.error("[abortPostureDowngrade] audit failed", e);
  }

  return { ok: true };
}

export type FinalizeDowngradeResult =
  | { ok: true; constitutionalHash: string; posture: typeof SECURITY_POSTURE_DUAL_LOCK }
  | { ok: false; error: string };

/** Task 5: Force finalize when cool-down elapsed (also runs automatically on status read). */
export async function finalizePostureDowngradeIfReady(): Promise<FinalizeDowngradeResult> {
  const workflow = await readPostureDegradationWorkflow();
  if (!workflow || workflow.phase !== POSTURE_DEGRADATION_PHASE_COOLDOWN) {
    return { ok: false, error: "No downgrade in cool-down phase." };
  }
  if (!isCooldownExpired(workflow)) {
    return { ok: false, error: "24-hour cool-down has not elapsed." };
  }

  const result = await executePostureDegradationFinalization(workflow.justification);
  if (!result.ok) return result;

  try {
    await prisma.systemConfig.update({
      where: { id: "global" },
      data: { securityPosture: PrismaSecurityPosture.DUAL_LOCK },
    });
  } catch {
    /* posture updated via generateNewEmergencySeal when DB available */
  }

  return {
    ok: true,
    constitutionalHash: result.constitutionalHash,
    posture: SECURITY_POSTURE_DUAL_LOCK,
  };
}
