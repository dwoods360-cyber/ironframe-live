import "server-only";

import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import prisma from "@/lib/prisma";
import { computeIronethicMaturityBonus } from "@/app/services/ironethic/maturityEthicsBonus";
import { computeForensicAttestationScore } from "@/app/utils/grcLexicon";
import { TAS_CONSTITUTION_WEB_PATH } from "@/app/utils/tasConstitutionDeepLink";
import { readLatestIrontechPostMortemForTenant } from "@/app/services/irontechPostMortem";
import {
  clampMaturityScore,
  GOVERNANCE_DEGRADATION_ACTION,
  GOVERNANCE_DEGRADATION_THRESHOLD,
  GOVERNANCE_NEUTRALIZE_MIN_DEGRADED,
  GOVERNANCE_NEUTRALIZE_MIN_NORMAL,
  GOVERNANCE_MATURITY_TREND_DAYS,
  IRONLOCK_STALE_DATA_FORENSIC_MIN_CHARS,
  pruneTrendTo30Days,
  readGovernanceMaturityState,
  writeGovernanceMaturityState,
  resolveNeutralizeMinChars,
  type GovernanceMaturitySnapshot,
  type GovernanceMaturityState,
  type MaturityComponentScores,
} from "@/app/lib/governanceMaturityState";
import { reconcileTenantTargetedSiegeFlag } from "@/app/lib/security/quarantineTenantTargeting";
import { maturityPenaltyFromQuarantineTargeting } from "@/src/services/irontrust/mathEngine";
import {
  computeSustainabilityStaleLockdown,
  SUSTAINABILITY_STALE_LOCKDOWN_MATURITY_PENALTY,
} from "@/app/config/sustainabilityStaleLockdown";

const WEIGHTS = { attestation: 0.4, chaos: 0.4, directivity: 0.2 } as const;

/** Ironcast CISO voice ladder — recorded as maturity drift when statutory escalation completes. */
const STATE_FREEZE_VOICE_MATURITY_DRIFT = 0.35;

/** Irontech autonomous decoupling / LKG respawn — maturity uplift when interventions resolve without manual override. */
const IRONTECH_AUTONOMY_BONUS_PER_EVENT = 0.3;
const IRONTECH_AUTONOMY_BONUS_CAP = 1.5;

async function readIrontechAutonomyMaturityBonus(): Promise<number> {
  const since = new Date(Date.now() - GOVERNANCE_MATURITY_TREND_DAYS * 86_400_000);
  try {
    const rows = await prisma.auditLog.findMany({
      where: {
        action: "SELF_HEALING_INTERVENTION",
        createdAt: { gte: since },
      },
      select: { justification: true },
      take: 400,
    });
    let eligible = 0;
    for (const r of rows) {
      try {
        const j = JSON.parse(r.justification ?? "{}") as { manualIntervention?: boolean };
        if (j.manualIntervention === true) continue;
        eligible += 1;
      } catch {
        eligible += 1;
      }
    }
    return Math.min(IRONTECH_AUTONOMY_BONUS_CAP, eligible * IRONTECH_AUTONOMY_BONUS_PER_EVENT);
  } catch {
    return 0;
  }
}

const SELF_HEALING_MATURITY_BONUS = 0.5;
const SELF_HEALING_CONTINUITY_DAYS_TARGET = 30;

async function readSelfHealingContinuityMaturityBonus(): Promise<{
  daysActive: number;
  bonusPoints: number;
  activeSinceIso: string | null;
  monitoringEnabled: boolean;
}> {
  const row = await prisma.systemConfig.findUnique({
    where: { id: "global" },
    select: { autonomousCarbonMitigation: true, selfHealingActiveSince: true },
  });
  const monitoringEnabled = row?.autonomousCarbonMitigation === true;
  const since = row?.selfHealingActiveSince;
  if (!monitoringEnabled || !since) {
    return {
      daysActive: 0,
      bonusPoints: 0,
      activeSinceIso: since?.toISOString() ?? null,
      monitoringEnabled,
    };
  }
  const daysActive = Math.floor((Date.now() - since.getTime()) / 86_400_000);
  const bonusPoints = daysActive >= SELF_HEALING_CONTINUITY_DAYS_TARGET ? SELF_HEALING_MATURITY_BONUS : 0;
  return {
    daysActive,
    bonusPoints,
    activeSinceIso: since.toISOString(),
    monitoringEnabled,
  };
}

const TAS_DEEP_LINK_RE =
  /\/constitution\/tas|docs\/TAS\.md|vscode:\/\/file\/[^\s]*TAS\.md|tasConstitution|#agent-\d+/i;

function forensicScoreToMaturityBand(total: number): number {
  if (total >= 40) return 10;
  if (total >= 30) return 9;
  if (total >= 20) return 8;
  if (total >= 12) return 7;
  if (total >= 8) return 6;
  if (total >= 4) return 5;
  if (total >= 2) return 4;
  return 3;
}

const GOVERNANCE_INGESTION_TEXT_MAX = 2000;
const NO_PAYLOAD_DETECTED = "NO_PAYLOAD_DETECTED" as const;

/**
 * Secure ingestion: coerce Prisma `Json?`, string, or scalar into a safe telemetry string.
 * Used before maturity / card pipelines so ALE-scale telemetry is never passed through raw `.trim()`.
 */
export function sanitizeAttackPayload(raw: unknown): string {
  if (raw == null) return NO_PAYLOAD_DETECTED;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : NO_PAYLOAD_DETECTED;
  }
  if (typeof raw === "object") {
    try {
      const serialized = JSON.stringify(raw);
      return serialized.length > 0 ? serialized : NO_PAYLOAD_DETECTED;
    } catch {
      return NO_PAYLOAD_DETECTED;
    }
  }
  const scalar = String(raw).trim();
  return scalar.length > 0 ? scalar : NO_PAYLOAD_DETECTED;
}

function pushResolutionJustificationFromJson(
  parts: string[],
  value: unknown,
): void {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return;
  const resolution = (value as { resolutionJustification?: unknown }).resolutionJustification;
  if (typeof resolution === "string" && resolution.trim()) {
    parts.push(resolution.trim());
  }
}

function appendIngestionResolutionText(parts: string[], sanitized: string): void {
  if (sanitized === NO_PAYLOAD_DETECTED) return;
  try {
    pushResolutionJustificationFromJson(parts, JSON.parse(sanitized) as unknown);
  } catch {
    if (/resolution/i.test(sanitized)) {
      parts.push(sanitized.slice(0, GOVERNANCE_INGESTION_TEXT_MAX));
    }
  }
}

/** Coerce Prisma `Json?` or string for parse — never call `.trim()` on objects. */
export function coerceIngestionDetailsString(ingestionDetails: unknown): string | null {
  if (ingestionDetails == null) return null;
  const details =
    typeof ingestionDetails === "string"
      ? ingestionDetails
      : JSON.stringify(ingestionDetails);
  if (!details || details === "null" || details === "undefined") return null;
  return details;
}

/** Accepts Prisma `Json?` (object) or legacy stringified JSON on `RiskEvent.ingestionDetails`. */
function extractResolutionJustification(
  justification: string | null,
  ingestionDetails?: unknown,
): string {
  const parts: string[] = [];
  if (typeof justification === "string" && justification.trim()) {
    parts.push(justification.trim());
  }
  if (ingestionDetails == null) return parts.join("\n");

  if (typeof ingestionDetails === "object" && !Array.isArray(ingestionDetails)) {
    pushResolutionJustificationFromJson(parts, ingestionDetails);
    return parts.join("\n");
  }

  const details = coerceIngestionDetailsString(ingestionDetails);
  if (details) {
    try {
      pushResolutionJustificationFromJson(parts, JSON.parse(details) as unknown);
    } catch {
      if (/resolution/i.test(details)) {
        parts.push(details.slice(0, GOVERNANCE_INGESTION_TEXT_MAX));
      }
    }
  }

  return parts.join("\n");
}

export async function computeAttestationQualityScore(tenantId?: string): Promise<{
  score: number;
  sampled: number;
}> {
  const where = tenantId
    ? {
        OR: [
          { tenantId },
          { governance_tenant_uuid: tenantId },
        ],
      }
    : {};

  const auditRows = await prisma.auditLog.findMany({
    where: {
      ...where,
      action: { in: ["THREAT_RESOLVED", "STATUS_UPDATED", "NEUTRALIZE", "THREAT_NEUTRALIZED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { justification: true },
  });

  let simRows: Array<{ ingestionDetails: unknown }> = [];
  if (tenantId) {
    simRows = await prisma.riskEvent.findMany({
      where: { tenantId, status: "RESOLVED" },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { ingestionDetails: true },
    });
  }

  const texts = [
    ...auditRows.map((r) => r.justification ?? ""),
    ...simRows.map((r) => extractResolutionJustification(null, r.ingestionDetails)),
  ].filter((t) => t.trim().length >= GOVERNANCE_NEUTRALIZE_MIN_NORMAL);

  if (texts.length === 0) {
    return { score: 6, sampled: 0 };
  }

  const totals = texts.map((t) => computeForensicAttestationScore(t).total);
  const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
  return { score: forensicScoreToMaturityBand(avg), sampled: texts.length };
}

export function computeChaosResilienceScoreFromPostMortem(
  tenantId: string,
): { score: number; available: boolean } {
  let report: ReturnType<typeof readLatestIrontechPostMortemForTenant>;
  try {
    report = readLatestIrontechPostMortemForTenant(tenantId);
  } catch {
    return { score: 6, available: false };
  }
  if (!report || report.scenario !== "CONSTITUTIONAL_COLLAPSE") {
    return { score: 6, available: false };
  }

  let points = 0;
  let max = 0;

  max += 3;
  if (report.containment.containmentMs != null && report.containment.containmentMs <= 1000) {
    points += 3;
  } else if (report.containment.containmentMs != null && report.containment.containmentMs <= 2000) {
    points += 2;
  } else if (report.containment.containmentMs != null) {
    points += 1;
  }

  max += 3;
  if (report.isolation.integrityVerdict === "PASS") points += 3;

  max += 2;
  if (report.forensicQuality.verdict === "PASS") points += 2;

  max += 2;
  if (report.dmsLearning.wipeComplete) points += 2;

  const ratio = max > 0 ? points / max : 0.5;
  return { score: clampMaturityScore(3 + ratio * 7), available: true };
}

export function computeDirectivityScore(
  resolutions: Array<{ text: string }>,
): { score: number; ratio: number; cited: number; total: number } {
  const total = resolutions.length;
  if (total === 0) return { score: 6, ratio: 0, cited: 0, total: 0 };
  const cited = resolutions.filter((r) => TAS_DEEP_LINK_RE.test(r.text)).length;
  const ratio = cited / total;
  return {
    score: clampMaturityScore(1 + ratio * 9),
    ratio,
    cited,
    total,
  };
}

async function collectResolutionTexts(tenantId?: string): Promise<string[]> {
  const where = tenantId
    ? {
        OR: [{ tenantId }, { governance_tenant_uuid: tenantId }],
      }
    : {};

  const auditRows = await prisma.auditLog.findMany({
    where: {
      ...where,
      action: { in: ["THREAT_RESOLVED", "NEUTRALIZE", "THREAT_NEUTRALIZED", "STATUS_UPDATED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { justification: true },
  });

  return auditRows.map((r) => r.justification ?? "").filter((t) => t.trim().length > 0);
}

export async function calculateSystemMaturityScore(tenantId?: string): Promise<GovernanceMaturitySnapshot> {
  const att = await computeAttestationQualityScore(tenantId);
  const chaos = tenantId
    ? computeChaosResilienceScoreFromPostMortem(tenantId)
    : { score: 6, available: false };
  const resolutionTexts = await collectResolutionTexts(tenantId);
  const dir = computeDirectivityScore(resolutionTexts.map((text) => ({ text })));

  const components: MaturityComponentScores = {
    attestationQuality: att.score,
    chaosResilience: chaos.score,
    directivity: dir.score,
  };

  const weighted =
    components.attestationQuality * WEIGHTS.attestation +
    components.chaosResilience * WEIGHTS.chaos +
    components.directivity * WEIGHTS.directivity;

  let score = weighted;
  try {
    const { getActiveComplianceDriftMaturityPenalty } = await import(
      "@/app/services/complianceDriftMaturityPenalty"
    );
    const driftPenalty = await getActiveComplianceDriftMaturityPenalty();
    if (driftPenalty.penaltyPoints > 0) {
      score = weighted - driftPenalty.penaltyPoints;
    }
  } catch {
    /* drift penalty optional */
  }

  score = clampMaturityScore(score);

  const continuity = await readSelfHealingContinuityMaturityBonus();
  const scoreBeforeResilienceBonus = score;
  let selfHealingResilienceBonus = 0;
  if (continuity.bonusPoints > 0) {
    selfHealingResilienceBonus = continuity.bonusPoints;
    score = clampMaturityScore(score + selfHealingResilienceBonus);
  }

  const ironethicEthicsBonus = await computeIronethicMaturityBonus(tenantId);
  let ironethicEthicsBonusApplied = 0;
  if (ironethicEthicsBonus > 0) {
    ironethicEthicsBonusApplied = ironethicEthicsBonus;
    score = clampMaturityScore(score + ironethicEthicsBonusApplied);
  }

  const irontechAutonomyBonus = await readIrontechAutonomyMaturityBonus();
  if (irontechAutonomyBonus > 0) {
    score = clampMaturityScore(score + irontechAutonomyBonus);
  }

  let apiOutagePenaltyActive = false;
  let apiOutagePenaltyPoints = 0;
  let sustainabilityStaleLockdownFrozen = false;
  let sustainabilityStaleLockdownPenaltyPoints = 0;
  let stateFreezeVoiceMaturityDrift = 0;
  try {
    const apiRow = await prisma.systemConfig.findUnique({
      where: { id: "global" },
      select: {
        sustainabilityLiveApiDegraded: true,
        sustainabilityApiDegradedSince: true,
        sustainabilityStaleLockdownWaived: true,
        stateFreezeVoiceDispatchedAt: true,
      },
    });
    if (apiRow?.sustainabilityLiveApiDegraded === true) {
      apiOutagePenaltyActive = true;
      apiOutagePenaltyPoints = 0.5;
      score = clampMaturityScore(score - apiOutagePenaltyPoints);
    }
    const lock = computeSustainabilityStaleLockdown(apiRow);
    if (lock.staleDataLockdownWindow && apiRow && !apiRow.sustainabilityStaleLockdownWaived) {
      sustainabilityStaleLockdownFrozen = true;
      sustainabilityStaleLockdownPenaltyPoints = SUSTAINABILITY_STALE_LOCKDOWN_MATURITY_PENALTY;
      score = clampMaturityScore(score - sustainabilityStaleLockdownPenaltyPoints);
    }
    if (apiRow?.stateFreezeVoiceDispatchedAt) {
      stateFreezeVoiceMaturityDrift = STATE_FREEZE_VOICE_MATURITY_DRIFT;
      score = clampMaturityScore(score - stateFreezeVoiceMaturityDrift);
    }
  } catch {
    /* unmigrated DB */
  }

  let targetedAdversarialMaturityPenalty = 0;
  if (tenantId) {
    try {
      await reconcileTenantTargetedSiegeFlag(tenantId);
      const tenantRow = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { lastChaosForensicHardeningAt: true },
      });
      const ledgerRows = await prisma.quarantineLedger.findMany({
        where: {
          primaryTargetTenantUuid: tenantId,
          OR: [
            { AND: [{ offenseCount: 2 }, { isHardBan: false }] },
            { isHardBan: true },
          ],
        },
        select: { offenseCount: true, isHardBan: true, lastViolationAt: true },
      });
      const q = maturityPenaltyFromQuarantineTargeting(ledgerRows, {
        now: new Date(),
        lastChaosForensicHardeningAt: tenantRow?.lastChaosForensicHardeningAt ?? null,
      });
      targetedAdversarialMaturityPenalty = q.penaltyPoints;
      if (targetedAdversarialMaturityPenalty > 0) {
        score = clampMaturityScore(score - targetedAdversarialMaturityPenalty);
      }
    } catch {
      /* unmigrated quarantine / tenant columns */
    }
  }

  const governanceDegradationActive = score < GOVERNANCE_DEGRADATION_THRESHOLD;
  const neutralizeMinChars = resolveNeutralizeMinChars({
    governanceDegradationActive,
    staleDataLiveApiDown: apiOutagePenaltyActive,
  });

  const notes: string[] = [];
  if (att.sampled === 0) notes.push("Attestation quality used baseline — no recent resolutions sampled.");
  if (!chaos.available) notes.push("Chaos resilience baseline — no Constitutional Collapse post-mortem on file.");
  if (dir.total === 0) notes.push("Directivity baseline — no resolution narratives for TAS deep-link scan.");

  try {
    const { getActiveComplianceDriftMaturityPenalty } = await import(
      "@/app/services/complianceDriftMaturityPenalty"
    );
    const driftPenalty = await getActiveComplianceDriftMaturityPenalty();
    if (driftPenalty.penaltyPoints > 0) {
      notes.push(
        `Compliance drift penalty −${driftPenalty.penaltyPoints.toFixed(1)} (${driftPenalty.activeUrgentDrifts} active drift(s) under 30 days).`,
      );
    }
  } catch {
    /* optional */
  }

  if (continuity.bonusPoints > 0) {
    notes.push(
      `Self-healing continuity +${SELF_HEALING_MATURITY_BONUS.toFixed(1)} maturity after ${SELF_HEALING_CONTINUITY_DAYS_TARGET}+ days with autonomous carbon mitigation active.`,
    );
  } else if (continuity.monitoringEnabled && continuity.activeSinceIso) {
    notes.push(
      `Self-healing streak ${continuity.daysActive}/${SELF_HEALING_CONTINUITY_DAYS_TARGET} days — +${SELF_HEALING_MATURITY_BONUS.toFixed(1)} at ${SELF_HEALING_CONTINUITY_DAYS_TARGET} days.`,
    );
  }

  if (ironethicEthicsBonusApplied > 0) {
    notes.push(
      `Ironethic (Agent 18) +${ironethicEthicsBonusApplied.toFixed(1)} — SCC-weighted societal value exceeded on-ledger carbon ROI for a recent SustainabilityMetric window.`,
    );
  }

  if (irontechAutonomyBonus > 0) {
    notes.push(
      `Irontech (Agent 12) autonomy bonus +${irontechAutonomyBonus.toFixed(2)} — ${IRONTECH_AUTONOMY_BONUS_PER_EVENT.toFixed(1)} per successful decoupling/LKG intervention (no manual override), capped at ${IRONTECH_AUTONOMY_BONUS_CAP.toFixed(1)} over ${GOVERNANCE_MATURITY_TREND_DAYS}d.`,
    );
  }

  if (apiOutagePenaltyActive) {
    notes.push(
      `Ironwatch (Agent 15): external sustainability live API in Stale Data mode — maturity penalty −${apiOutagePenaltyPoints.toFixed(1)} until Electricity Maps (or configured feed) recovers.`,
    );
    notes.push(
      `Ironlock (Agent 6): Stale Data window — forensic justification minimum raised to ${IRONLOCK_STALE_DATA_FORENSIC_MIN_CHARS} characters until live feed recovers.`,
    );
  }
  if (sustainabilityStaleLockdownFrozen) {
    notes.push(
      `CRITICAL: FROZEN — Irontech (Agent 12): sustainability API outage exceeded 24h; Forensic Blindness — additional maturity penalty −${sustainabilityStaleLockdownPenaltyPoints.toFixed(1)} reflecting unverified live-grid attestation until heartbeat healthy or tripartite stale-data waiver.`,
    );
  }
  if (stateFreezeVoiceMaturityDrift > 0) {
    notes.push(
      `Ironcast (Agent 7): constitutional CISO voice escalation engaged after statutory delay — maturity drift −${stateFreezeVoiceMaturityDrift.toFixed(2)} (response gap on witness record).`,
    );
  }
  if (targetedAdversarialMaturityPenalty > 0) {
    notes.push(
      `Irontrust (Agent 3): quarantine ledger adversarial targeting — maturity penalty −${targetedAdversarialMaturityPenalty.toFixed(2)} (strike-2 rows −0.5 / hard-ban rows −1.5 each within 7d activity; recovery: constitutional chaos forensic hardening or 7d zero activity from blocked identifiers).`,
    );
  }

  return {
    score,
    scoreBeforeResilienceBonus,
    selfHealingResilienceBonus: selfHealingResilienceBonus > 0 ? selfHealingResilienceBonus : undefined,
    ironethicEthicsBonus: ironethicEthicsBonusApplied > 0 ? ironethicEthicsBonusApplied : undefined,
    irontechAutonomyBonus: irontechAutonomyBonus > 0 ? irontechAutonomyBonus : undefined,
    apiOutagePenaltyActive,
    apiOutagePenaltyPoints: apiOutagePenaltyActive ? apiOutagePenaltyPoints : undefined,
    sustainabilityStaleLockdownFrozen: sustainabilityStaleLockdownFrozen ? true : undefined,
    sustainabilityStaleLockdownPenaltyPoints: sustainabilityStaleLockdownFrozen
      ? sustainabilityStaleLockdownPenaltyPoints
      : undefined,
    targetedAdversarialMaturityPenalty:
      targetedAdversarialMaturityPenalty > 0 ? targetedAdversarialMaturityPenalty : undefined,
    selfHealingContinuity: {
      daysActive: continuity.daysActive,
      activeSince: continuity.activeSinceIso,
      bonusApplies: continuity.bonusPoints > 0,
    },
    calculatedAt: new Date().toISOString(),
    components,
    weights: { ...WEIGHTS },
    governanceDegradationActive,
    neutralizeMinChars,
    sampleSizes: {
      resolutionsSampled: att.sampled,
      chaosReportAvailable: chaos.available,
    },
    notes,
  };
}

async function emitGovernanceDegradationIfNeeded(
  prev: GovernanceMaturityState,
  next: GovernanceMaturitySnapshot,
  tenantId?: string,
): Promise<void> {
  if (!next.governanceDegradationActive) return;
  if (prev.current.governanceDegradationActive) return;

  try {
    await auditLogCreateLoose({
      data: {
        action: GOVERNANCE_DEGRADATION_ACTION,
        justification: JSON.stringify({
          event: "GOVERNANCE_DEGRADATION",
          score: next.score,
          threshold: GOVERNANCE_DEGRADATION_THRESHOLD,
          neutralizeMinChars: next.neutralizeMinChars,
          components: next.components,
          message:
            "[GOVERNANCE_DEGRADATION] System Maturity below 5.0 — Ironlock raised Neutralize attestation minimum to 75 characters.",
        }),
        operatorId: "SYSTEM_IRONLOCK",
        threatId: null,
        isSimulation: false,
        governance_tenant_uuid: tenantId,
      },
    });
  } catch (e) {
    console.error("[governanceScoring] GOVERNANCE_DEGRADATION audit failed", e);
  }
}

/**
 * Recompute maturity, persist 30-day trend, apply audit penalty when score &lt; 5.
 */
export async function recalculateSystemMaturityScore(params?: {
  tenantId?: string;
  trigger?: string;
}): Promise<GovernanceMaturityState> {
  const tenantId = params?.tenantId?.trim();
  const prev = await readGovernanceMaturityState();
  const current = await calculateSystemMaturityScore(tenantId);

  const day = current.calculatedAt.slice(0, 10);
  const trend = pruneTrendTo30Days([
    ...prev.trend,
    { date: day, score: current.score, components: current.components },
  ]);

  const next: GovernanceMaturityState = { current, trend };
  await writeGovernanceMaturityState(next);

  await emitGovernanceDegradationIfNeeded(prev, current, tenantId);

  const prevTargeted = prev.current.targetedAdversarialMaturityPenalty ?? 0;
  const nextTargeted = current.targetedAdversarialMaturityPenalty ?? 0;
  if (
    tenantId &&
    nextTargeted > 0 &&
    (prevTargeted === 0 || Math.abs(nextTargeted - prevTargeted) > 0.01)
  ) {
    try {
      await auditLogCreateLoose({
        data: {
          action: "MATURITY_SCORE_DEGRADED_BY_THREAT",
          justification: `[MATURITY_SCORE_DEGRADED_BY_THREAT] tenant_uuid=${tenantId} penalty_points=${nextTargeted.toFixed(2)} resulting_maturity_score=${current.score.toFixed(2)}`,
          operatorId: "IRONTRUST_AGENT_3",
          threatId: null,
          isSimulation: false,
          governance_tenant_uuid: tenantId,
        },
      });
    } catch {
      /* best-effort */
    }
  }

  if (params?.trigger) {
    try {
      await auditLogCreateLoose({
        data: {
          action: "SYSTEM_MATURITY_RECALCULATED",
          justification: JSON.stringify({
            trigger: params.trigger,
            score: current.score,
            components: current.components,
          }),
          operatorId: "IRONTECH_AGENT_11",
          threatId: null,
          isSimulation: Boolean(tenantId),
          governance_tenant_uuid: tenantId,
        },
      });
    } catch {
      /* best-effort */
    }
  }

  return next;
}

export async function getGovernanceNeutralizeMinChars(): Promise<number> {
  const state = await readGovernanceMaturityState();
  return state.current.neutralizeMinChars;
}

export function citesTasDeepLink(text: string): boolean {
  return TAS_DEEP_LINK_RE.test(text) || text.includes(TAS_CONSTITUTION_WEB_PATH);
}

export {
  ingestRedTeamAttackToRegistry,
  processRiskLifecycle,
  riskRegistryToDeckCard,
} from "@/app/services/riskLifecycle";
export type { ProcessRiskLifecycleResult } from "@/app/services/riskLifecycle";
