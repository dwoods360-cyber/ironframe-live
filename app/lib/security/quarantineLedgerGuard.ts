import "server-only";

import prisma from "@/lib/prisma";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import { logStructuredEvent } from "@/lib/structuredServerLog";
import {
  applyIronlockHardBanTargetedSiege,
  syncQuarantineLedgerPrimaryTarget,
} from "@/app/lib/security/quarantineTenantTargeting";
import {
  hardBanRequiresPolicyMatch,
  validateGovernedOverrideRationale,
  type GovernedOverridePolicyResult,
} from "@/src/services/irontally/policyValidator";

export type QuarantineIngressResult =
  | { ok: true }
  | { ok: false; status: 403; error: string; code: "HARD_BAN" | "PROBATION_HOLD" };

function normId(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  return t.toLowerCase();
}

function ledgerKeysFromParts(ip?: string | null, userId?: string | null): string[] {
  const keys: string[] = [];
  const ni = normId(ip);
  const nu = normId(userId);
  if (ni) keys.push(`ip:${ni}`);
  if (nu) keys.push(`user:${nu}`);
  return keys;
}

/**
 * Agent 13 (Ironguard): evaluate ledger for IP / user before ingress continues.
 */
export async function evaluateQuarantineLedger(input: {
  clientIp?: string | null;
  userId?: string | null;
}): Promise<QuarantineIngressResult> {
  const keys = ledgerKeysFromParts(input.clientIp, input.userId);
  if (keys.length === 0) return { ok: true };

  const rows = await prisma.quarantineLedger.findMany({
    where: { identifier: { in: keys } },
    select: {
      identifier: true,
      offenseCount: true,
      isHardBan: true,
      probationHoldActive: true,
    },
  });

  for (const r of rows) {
    if (r.isHardBan) {
      return {
        ok: false,
        status: 403,
        error: "Quarantine: hard ban — identifier permanently blocked pending governance review.",
        code: "HARD_BAN",
      };
    }
    if (r.probationHoldActive) {
      return {
        ok: false,
        status: 403,
        error: "Quarantine: probation hold — operator reset required before traffic resumes.",
        code: "PROBATION_HOLD",
      };
    }
  }
  return { ok: true };
}

async function resolveGovernanceTenantUuidForAudit(): Promise<string> {
  const row = await prisma.tenant.findFirst({ select: { id: true }, orderBy: { id: "asc" } });
  if (!row?.id) throw new Error("No tenant row for AuditLog governance partition.");
  return row.id;
}

const RATIONALE_MIN_LEN = 50;
const DAILY_AUDIT_ARTIFACT_FAMILY = "storage/forensics/audits/DAILY_AUDIT_REPORT_*.md";
const GOVERNED_GAVEL_SIGN_OFF =
  "Exception authorized under Governed Override Protocol. Integrity Baseline preserved.";

async function recordOperatorNonCompliantOverrideAttempt(input: {
  operatorId: string;
  tenantId: string;
  ledgerKey: string;
  rationale: string;
  policy: GovernedOverridePolicyResult;
}): Promise<{ operatorStrikeCount: number }> {
  const strike = await prisma.botAuditLog.count({
    where: {
      operator: input.operatorId,
      botType: "IRONLOCK_QUARANTINE_NON_COMPLIANT_OVERRIDE",
      disposition: "ATTEMPT_RECORDED",
    },
  });
  const operatorStrikeCount = strike + 1;
  await prisma.botAuditLog.create({
    data: {
      tenantId: input.tenantId,
      botType: "IRONLOCK_QUARANTINE_NON_COMPLIANT_OVERRIDE",
      disposition: "ATTEMPT_RECORDED",
      operator: input.operatorId,
      metadata: {
        ledgerKey: input.ledgerKey,
        internalAuditReason: "Attempting Non-Compliant Override",
        operatorOffenseCount: operatorStrikeCount,
        policyMatchScore: input.policy.policyMatchScore,
        isValidComplianceStatement: input.policy.isValidComplianceStatement,
        rationalePreview: input.rationale.slice(0, 280),
      },
    },
  });
  await auditLogCreateLoose({
    data: {
      action: "ATTEMPTING_NON_COMPLIANT_OVERRIDE",
      justification: `[ATTEMPTING_NON_COMPLIANT_OVERRIDE] operator=${input.operatorId} | operator_internal_strike=${operatorStrikeCount} | ledger=${input.ledgerKey} | irontally_policy_match_score=${input.policy.policyMatchScore} | iso_annex_a5_valid=${input.policy.isValidComplianceStatement}`,
      operatorId: input.operatorId,
      threatId: null,
      isSimulation: false,
      governance_tenant_uuid: input.tenantId,
    },
  });
  return { operatorStrikeCount };
}

async function sendTerminalThreatWebhook(payload: Record<string, unknown>): Promise<void> {
  const url = process.env.IRONFRAME_DEV_DIAGNOSTIC_WEBHOOK_URL?.trim();
  if (!url) return;
  const secret = process.env.IRONFRAME_DEV_DIAGNOSTIC_WEBHOOK_SECRET?.trim();
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-ironframe-webhook-secret": secret } : {}),
      },
      body: JSON.stringify({ kind: "TERMINAL_THREAT_QUARANTINE", ...payload }),
    });
  } catch (e) {
    logStructuredEvent("Ironcast", "terminal_threat_webhook_error", { message: e instanceof Error ? e.message : String(e) }, "error");
  }
}

async function upsertStrike(identifier: string): Promise<void> {
  const idNorm = normId(identifier) ?? identifier.trim().toLowerCase();
  const id = idNorm.slice(0, 512);
  const now = new Date();
  let becameHardBan = false;
  await prisma.$transaction(async (tx) => {
    const cur = await tx.quarantineLedger.findUnique({
      where: { identifier: id },
      select: { offenseCount: true, isHardBan: true },
    });
    const wasHard = cur?.isHardBan === true;
    const nextCount = (cur?.offenseCount ?? 0) + 1;
    const isHardBan = nextCount >= 3;
    becameHardBan = isHardBan && !wasHard;
    await tx.quarantineLedger.upsert({
      where: { identifier: id },
      create: {
        identifier: id,
        offenseCount: 1,
        isHardBan: false,
        lastViolationAt: now,
        probationHoldActive: true,
      },
      update: {
        offenseCount: nextCount,
        isHardBan,
        lastViolationAt: now,
        probationHoldActive: true,
      },
    });
    if (becameHardBan) {
      await sendTerminalThreatWebhook({
        identifier: id,
        offenseCount: nextCount,
        triggeredAtIso: now.toISOString(),
      });
      logStructuredEvent("Ironlock", "TERMINAL_THREAT_QUARANTINE", { identifier: id, offenseCount: nextCount }, "error");
    }
  });

  await syncQuarantineLedgerPrimaryTarget(id);
  if (becameHardBan) {
    const row = await prisma.quarantineLedger.findUnique({
      where: { identifier: id },
      select: { primaryTargetTenantUuid: true },
    });
    await applyIronlockHardBanTargetedSiege({
      identifier: id,
      primaryTargetTenantUuid: row?.primaryTargetTenantUuid ?? null,
    });
  }
}

/** Bump ledger rows from Ironguard violation metadata (clientIp / userId). */
export async function bumpLedgerFromIronguardMetadata(metadata: Record<string, unknown> | null | undefined): Promise<void> {
  if (!metadata || typeof metadata !== "object") return;
  const ip = typeof metadata.clientIp === "string" ? metadata.clientIp : undefined;
  const userId = typeof metadata.userId === "string" ? metadata.userId : undefined;
  const keys = ledgerKeysFromParts(ip, userId);
  for (const k of keys) {
    await upsertStrike(k);
  }
}

/**
 * Agent 6 (Ironlock): after a **new** system freeze, promote ledger rows at strike 2 to hard ban (strike 3).
 * Correlates with identifiers seen in the last-hour Ironguard violations.
 */
export async function escalateQuarantineSecondStrikersAfterSystemFreeze(): Promise<{
  escalated: number;
}> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const violations = await prisma.ironguardViolation.findMany({
    where: { createdAt: { gte: since } },
    select: { metadata: true },
    take: 5000,
  });
  const idents = new Set<string>();
  for (const v of violations) {
    const m = v.metadata as Record<string, unknown> | null;
    if (!m) continue;
    for (const k of ledgerKeysFromParts(
      typeof m.clientIp === "string" ? m.clientIp : null,
      typeof m.userId === "string" ? m.userId : null,
    )) {
      idents.add(k);
    }
  }

  let escalated = 0;
  for (const identifier of idents) {
    const row = await prisma.quarantineLedger.findUnique({
      where: { identifier },
      select: { offenseCount: true, isHardBan: true },
    });
    if (!row || row.isHardBan) continue;
    if (row.offenseCount !== 2) continue;
    const now = new Date();
    await prisma.quarantineLedger.update({
      where: { identifier },
      data: {
        offenseCount: 3,
        isHardBan: true,
        probationHoldActive: true,
        lastViolationAt: now,
      },
    });
    escalated += 1;
    await sendTerminalThreatWebhook({
      identifier,
      offenseCount: 3,
      reason: "IRONWATCH_SYSTEM_FREEZE_SECOND_STRIKER_PROMOTION",
      triggeredAtIso: now.toISOString(),
    });
    logStructuredEvent(
      "Ironlock",
      "TERMINAL_THREAT_QUARANTINE",
      { identifier, offenseCount: 3, reason: "freeze_escalation" },
      "error",
    );
    await syncQuarantineLedgerPrimaryTarget(identifier);
    const rowAfter = await prisma.quarantineLedger.findUnique({
      where: { identifier },
      select: { primaryTargetTenantUuid: true },
    });
    await applyIronlockHardBanTargetedSiege({
      identifier,
      primaryTargetTenantUuid: rowAfter?.primaryTargetTenantUuid ?? null,
    });
  }
  return { escalated };
}

export type ResetQuarantineResult =
  | { ok: true }
  | { ok: false; error: string; pending?: boolean };

/**
 * Gavel / probation reset — does **not** delete row; clears probation hold.
 * Hard-ban / strike-3 (`offense_count >= 3`) paths require Irontally ISO 27001 Annex A.5 policy match + forensic rationale.
 */
export async function resetQuarantineIdentifierInternal(
  identifier: string,
  humanOperatorId: string,
  rationale: string,
): Promise<ResetQuarantineResult> {
  const id = normId(identifier);
  if (!id) return { ok: false, error: "Missing identifier." };
  const op = humanOperatorId.trim();
  if (!op) return { ok: false, error: "Missing human operator id." };

  const rat = rationale.trim();
  if (rat.length < RATIONALE_MIN_LEN) {
    return {
      ok: false,
      error: `Forensic rationale required: at least ${RATIONALE_MIN_LEN} characters (Ironlock gate).`,
    };
  }

  const row = await prisma.quarantineLedger.findUnique({
    where: { identifier: id },
  });
  if (!row) return { ok: false, error: "Identifier not in ledger." };

  const governance = await resolveGovernanceTenantUuidForAudit();
  const policy = validateGovernedOverrideRationale(rat);
  const strikeTier = row.offenseCount >= 3 || row.isHardBan;

  if (!policy.isValidComplianceStatement) {
    await recordOperatorNonCompliantOverrideAttempt({
      operatorId: op,
      tenantId: governance,
      ledgerKey: id,
      rationale: rat,
      policy,
    });
    if (row.offenseCount >= 3) {
      return {
        ok: false,
        pending: true,
        error:
          "Governed override remains pending: Irontally did not certify Annex A.5 compliance (explanation + identity verification + mitigation required). Internal audit strike recorded for Attempting Non-Compliant Override.",
      };
    }
    return {
      ok: false,
      error:
        "Irontally policy validation failed: rationale must explain the error, document identity verification, and state mitigation (ISO 27001 Annex A.5). Internal audit strike recorded.",
    };
  }

  if (strikeTier && !hardBanRequiresPolicyMatch(policy)) {
    await recordOperatorNonCompliantOverrideAttempt({
      operatorId: op,
      tenantId: governance,
      ledgerKey: id,
      rationale: rat,
      policy,
    });
    return {
      ok: false,
      pending: true,
      error:
        "Governed override pending: Irontally Policy Match score below threshold for strike-tier / hard-ban release. Refine rationale depth; Internal audit strike recorded for Attempting Non-Compliant Override.",
    };
  }

  await prisma.quarantineLedger.update({
    where: { identifier: id },
    data: {
      probationHoldActive: false,
      isHardBan: false,
      resetByHumanId: op,
      forensicJustification: rat,
    },
  });

  const auditAction = strikeTier
    ? "GOVERNED_EXCEPTION_QUARANTINE_RESET"
    : "SECURITY_OVERRIDE_RESET";
  const baseJust = strikeTier
    ? `[GOVERNED_EXCEPTION_QUARANTINE_RESET] [Tenant Access Audit / Governed Exception] operator=${op} | identifier=${id} | offense_count_at_reset=${row.offenseCount} | was_hard_ban=${row.isHardBan} | irontally_policy_match_score=${policy.policyMatchScore} | daily_audit_cross_ref=${DAILY_AUDIT_ARTIFACT_FAMILY}`
    : `[SECURITY_OVERRIDE_RESET] operator=${op} | identifier=${id} | offense_count_preserved=${row.offenseCount} | irontally_annex_a5=PASS | daily_audit_cross_ref=${DAILY_AUDIT_ARTIFACT_FAMILY}`;

  await auditLogCreateLoose({
    data: {
      action: auditAction,
      justification: `${baseJust}\n\n${GOVERNED_GAVEL_SIGN_OFF}`,
      operatorId: op,
      threatId: null,
      isSimulation: false,
      governance_tenant_uuid: governance,
    },
  });

  if (row.isHardBan) {
    await syncQuarantineLedgerPrimaryTarget(id);
  }

  return { ok: true };
}
