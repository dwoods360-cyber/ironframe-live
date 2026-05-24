import "server-only";

import prisma from "@/lib/prisma";
import {
  pruneSamplesOlderThan24h,
  readCarbonPulseState,
} from "@/app/lib/ironbloom/carbonPulseState";
import { TENANT_INDUSTRY_BASELINE_ALE_CENTS } from "@/app/constants/devTenantRoster";
import { getTenantCarbonIntensityThresholdGco2 } from "@/app/config/tenantCarbonZones";
import {
  computeSustainabilityAle,
  fetchLiveCarbonIntensityForTenant,
} from "@/app/services/ironbloom/scoring";
import { runDirtyGridMonitorForTenant } from "@/src/services/agents/ironlock/dirtyGridMonitor";
import {
  getIronlockThrottlePayload,
  IRONLOCK_AUTO_THROTTLE_NOTIFICATION,
  reconcileIronlockThrottleFromMonitor,
} from "@/src/services/agents/ironlock/throttlingEngine";
import { tenantKeyFromUuid, type TenantKey } from "@/app/utils/tenantIsolation";
import { formatCentsToAccountingUSD } from "@/app/utils/formatCentsToUSD";
import { readGovernanceMaturityState } from "@/app/lib/governanceMaturityState";
import { computeCostOfNonCompliance, resolveGovernanceBaselineMode } from "@/app/utils/financialRisk";
import type { CostOfNonComplianceResult } from "@/app/utils/financialRisk";

export type CarbonPulseSparkPoint = {
  at: string;
  gco2PerKwh: number;
  dirty: boolean;
};

export type CarbonPulsePayload = {
  tenantId: string;
  tenantKey: TenantKey | null;
  zone: string;
  carbonIntensityGco2PerKwh: number;
  intensitySource: string;
  sustainabilityAleCents: string;
  sustainabilityAleDisplay: string;
  mitigatedValueCentsAggregate: string;
  carbonShareOfTenantAleBps: string;
  sparkline24h: CarbonPulseSparkPoint[];
  dirtyGrid: {
    isDirty: boolean;
    thresholdGco2PerKwh: number;
    alertMessage: string | null;
    alertsResponded: number;
  };
  forensic: {
    verified: boolean;
    sha256: string | null;
    artifactId: string | null;
    canonicalPreview: string | null;
  };
  governanceDividend: {
    penaltyAvoidedCents: string;
    penaltyAvoidedDisplay: string;
  };
  throttling: {
    agent6SuppressingBackground: boolean;
    dirtyWindowForThrottle: boolean;
    autonomousMitigationEnabled: boolean;
    intensityGco2PerKwh: number;
    thresholdGco2PerKwh: number;
    throttleLastUpdatedAt: string | null;
    notificationMessage: string | null;
  };
  /** 30-day autonomous self-healing continuity toward +0.5 maturity bonus. */
  resilienceStreak: {
    monitoringEnabled: boolean;
    activeSince: string | null;
    daysElapsed: number;
    daysTarget: number;
    /** True when ≥ daysTarget with monitoring on (maturity bonus applies in scoring). */
    verifiedSustainabilityLeader: boolean;
  };
};

async function aggregateMitigatedCents(tenantId: string): Promise<bigint> {
  const companies = await prisma.company.findMany({
    where: { tenantId },
    select: { id: true },
  });
  if (!companies.length) return 0n;
  const threats = await prisma.threatEvent.findMany({
    where: { tenantCompanyId: { in: companies.map((c) => c.id) } },
    select: { id: true },
    take: 500,
  });
  if (!threats.length) return 0n;
  const agg = await prisma.sustainabilityMetric.aggregate({
    where: {
      threatId: { in: threats.map((t) => t.id) },
      mitigatedValueCents: { gt: 0n },
    },
    _sum: { mitigatedValueCents: true },
  });
  return agg._sum?.mitigatedValueCents ?? 0n;
}

async function findLatestSustainabilityMetricForTenant(tenantId: string): Promise<{
  threatId: string;
  mitigatedValueCents: bigint | null;
  createdAt: Date;
} | null> {
  const companies = await prisma.company.findMany({
    where: { tenantId },
    select: { id: true },
  });
  if (!companies.length) return null;
  const companyIds = companies.map((c) => c.id);
  const row = await prisma.sustainabilityMetric.findFirst({
    where: { threat: { tenantCompanyId: { in: companyIds } } },
    orderBy: { createdAt: "desc" },
    select: {
      threatId: true,
      mitigatedValueCents: true,
      createdAt: true,
    },
  });
  return row;
}

async function forensicSealForThreat(
  tenantId: string,
  threatId: string,
): Promise<{
  sha256: string;
  artifactId: string;
  canonicalPreview: string;
} | null> {
  const att = await prisma.evidenceAttachment.findFirst({
    where: { tenantId, entityId: `sustainability:${threatId}` },
    orderBy: { createdAt: "desc" },
    include: { artifact: { select: { id: true, sha256: true, storagePath: true } } },
  });
  if (!att?.artifact) return null;
  return {
    artifactId: att.artifact.id,
    sha256: att.artifact.sha256,
    canonicalPreview: `sha256:${att.artifact.sha256.slice(0, 16)}… · ${att.artifact.storagePath}`,
  };
}

async function latestForensicSeal(tenantId: string): Promise<{
  sha256: string;
  artifactId: string;
  canonicalPreview: string;
} | null> {
  const artifact = await prisma.evidenceArtifact.findFirst({
    where: {
      tenantId,
      uploadedByUserId: "IRONBLOOM_AGENT_18",
      mimeType: "application/json",
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, sha256: true, storagePath: true },
  });
  if (!artifact) return null;
  return {
    artifactId: artifact.id,
    sha256: artifact.sha256,
    canonicalPreview: `sha256:${artifact.sha256.slice(0, 16)}… · ${artifact.storagePath}`,
  };
}

const RESILIENCE_STREAK_TARGET_DAYS = 30;

async function loadResilienceStreakForPulse(): Promise<CarbonPulsePayload["resilienceStreak"]> {
  const row = await prisma.systemConfig.findUnique({
    where: { id: "global" },
    select: { autonomousCarbonMitigation: true, selfHealingActiveSince: true },
  });
  const monitoringEnabled = row?.autonomousCarbonMitigation === true;
  const since = row?.selfHealingActiveSince;
  const TARGET = RESILIENCE_STREAK_TARGET_DAYS;
  if (!monitoringEnabled || !since) {
    return {
      monitoringEnabled,
      activeSince: since?.toISOString() ?? null,
      daysElapsed: 0,
      daysTarget: TARGET,
      verifiedSustainabilityLeader: false,
    };
  }
  const daysElapsed = Math.floor((Date.now() - since.getTime()) / 86_400_000);
  return {
    monitoringEnabled: true,
    activeSince: since.toISOString(),
    daysElapsed,
    daysTarget: TARGET,
    verifiedSustainabilityLeader: daysElapsed >= TARGET,
  };
}

export async function buildCarbonPulsePayload(tenantId: string): Promise<CarbonPulsePayload> {
  const tenantKey = tenantKeyFromUuid(tenantId);
  const key = tenantKey ?? "medshield";

  const referenceKwh = Math.max(100, Number(process.env.IRONBLOOM_PULSE_REFERENCE_KWH ?? "500"));
  const intensityQuote = await fetchLiveCarbonIntensityForTenant(key);

  const ale = await computeSustainabilityAle({
    tenantKey: key,
    unitsKwh: referenceKwh,
    assetId: "CARBON_PULSE_WIDGET",
  });

  const monitor = await runDirtyGridMonitorForTenant(tenantId, {
    mitigatedValueCents: ale.mitigatedValueCents,
  });

  const throttleEval = await reconcileIronlockThrottleFromMonitor(tenantId, {
    currentIntensityGco2PerKwh: monitor.currentIntensityGco2PerKwh,
    zone: monitor.zone,
    tenantKey: key,
  });

  const state = await readCarbonPulseState();
  const sparkline24h = pruneSamplesOlderThan24h(state.samplesByTenant[tenantId] ?? []).map((s) => ({
    at: s.at,
    gco2PerKwh: s.gco2PerKwh,
    dirty: s.dirty,
  }));

  const mitigatedAgg = await aggregateMitigatedCents(tenantId);
  const forensic = await latestForensicSeal(tenantId);

  const alertsResponded = state.dirtyGridAlerts.filter(
    (a) => a.tenantId === tenantId && a.acknowledged,
  ).length;

  const penaltyPerAlertCents = ale.mitigatedValueCents / 10n;
  const penaltyAvoided = penaltyPerAlertCents * BigInt(Math.max(0, alertsResponded));

  const resilienceStreak = await loadResilienceStreakForPulse();

  return {
    tenantId,
    tenantKey,
    zone: monitor.zone,
    carbonIntensityGco2PerKwh: monitor.currentIntensityGco2PerKwh,
    intensitySource: intensityQuote.source,
    sustainabilityAleCents: ale.mitigatedValueCents.toString(),
    sustainabilityAleDisplay: formatCentsToAccountingUSD(ale.mitigatedValueCents),
    mitigatedValueCentsAggregate: mitigatedAgg.toString(),
    carbonShareOfTenantAleBps: ale.carbonShareOfTenantAleBps.toString(),
    sparkline24h,
    dirtyGrid: {
      isDirty: monitor.isDirty,
      thresholdGco2PerKwh: monitor.thresholdGco2PerKwh,
      alertMessage: monitor.alert?.message ?? null,
      alertsResponded,
    },
    forensic: {
      verified: Boolean(forensic?.sha256),
      sha256: forensic?.sha256 ?? null,
      artifactId: forensic?.artifactId ?? null,
      canonicalPreview: forensic?.canonicalPreview ?? null,
    },
    governanceDividend: {
      penaltyAvoidedCents: penaltyAvoided.toString(),
      penaltyAvoidedDisplay: formatCentsToAccountingUSD(penaltyAvoided),
    },
    throttling: {
      agent6SuppressingBackground: throttleEval.throttleActive,
      dirtyWindowForThrottle: throttleEval.dirtyWindow,
      autonomousMitigationEnabled: throttleEval.autonomousMitigationEnabled,
      intensityGco2PerKwh: throttleEval.intensityGco2PerKwh,
      thresholdGco2PerKwh: throttleEval.thresholdGco2PerKwh,
      throttleLastUpdatedAt: throttleEval.record.updatedAt,
      notificationMessage:
        throttleEval.notificationMessage ??
        (throttleEval.throttleActive ? IRONLOCK_AUTO_THROTTLE_NOTIFICATION : null),
    },
    resilienceStreak,
  };
}

export async function buildCarbonPulseFinancialBundle(tenantId: string): Promise<{
  pulse: CarbonPulsePayload;
  financialImpact: CostOfNonComplianceResult;
}> {
  const pulse = await buildCarbonPulsePayload(tenantId);
  const tenantKey = tenantKeyFromUuid(tenantId);
  const maturityState = await readGovernanceMaturityState();
  const maturityScore = maturityState.current.score;
  const financialImpact = computeCostOfNonCompliance(maturityScore, {
    tenantKey,
    baselineMode: resolveGovernanceBaselineMode(tenantKey),
    sustainabilityAleCents: pulse.sustainabilityAleCents,
    carbonPenaltyAvoidedCents: pulse.governanceDividend.penaltyAvoidedCents,
    selfHealingResilienceBonusActive: pulse.resilienceStreak.verifiedSustainabilityLeader,
  });
  return { pulse, financialImpact };
}

/**
 * Last-known-good pulse when live Electricity Maps / stats route is unavailable.
 * ALE dollars come from the newest `SustainabilityMetric.mitigatedValueCents` (ledger).
 * Ironlock (Agent 6) throttle + 24h samples replay from `carbon-pulse-history.json` via
 * `getIronlockThrottlePayload` — no external grid API.
 */
export async function buildCarbonPulseLkgPayload(tenantId: string): Promise<{
  pulse: CarbonPulsePayload;
  lkg: { recordedAt: string; threatId: string };
} | null> {
  const metric = await findLatestSustainabilityMetricForTenant(tenantId);
  if (!metric) return null;

  const tenantKey = tenantKeyFromUuid(tenantId);
  const key = tenantKey ?? "medshield";

  const state = await readCarbonPulseState();
  const sparkline24h = pruneSamplesOlderThan24h(state.samplesByTenant[tenantId] ?? []).map((s) => ({
    at: s.at,
    gco2PerKwh: s.gco2PerKwh,
    dirty: s.dirty,
  }));

  const mitigatedCents = metric.mitigatedValueCents ?? 0n;
  const tenantTotalAleCents = TENANT_INDUSTRY_BASELINE_ALE_CENTS[key];
  const carbonShareOfTenantAleBps =
    tenantTotalAleCents > 0n ? (mitigatedCents * 10000n) / tenantTotalAleCents : 0n;

  const throttle = await getIronlockThrottlePayload(tenantId);
  const lastSample = sparkline24h.length ? sparkline24h[sparkline24h.length - 1] : null;
  const carbonIntensityGco2PerKwh =
    lastSample?.gco2PerKwh ??
    (throttle.intensityGco2PerKwh > 0 ? throttle.intensityGco2PerKwh : 0);
  const defaultThreshold = getTenantCarbonIntensityThresholdGco2(key);
  const thresholdGco2 =
    throttle.thresholdGco2PerKwh > 0 ? throttle.thresholdGco2PerKwh : defaultThreshold;
  const zone =
    lastSample != null
      ? `Offline bundle: last sample ${lastSample.at}`
      : "Offline bundle: ledger row + Ironlock state file";

  const tenantAlerts = state.dirtyGridAlerts.filter((a) => a.tenantId === tenantId);
  const pendingAlert = [...tenantAlerts].reverse().find((a) => !a.acknowledged);

  const alertsResponded = tenantAlerts.filter((a) => a.acknowledged).length;
  const penaltyPerAlertCents = mitigatedCents / 10n;
  const penaltyAvoided = penaltyPerAlertCents * BigInt(Math.max(0, alertsResponded));

  const mitigatedAgg = await aggregateMitigatedCents(tenantId);
  const forensic = await forensicSealForThreat(tenantId, metric.threatId);
  const resilienceStreak = await loadResilienceStreakForPulse();

  const isDirtyWindow =
    throttle.dirtyWindowForThrottle || (lastSample != null ? lastSample.dirty : false);

  return {
    pulse: {
      tenantId,
      tenantKey,
      zone,
      carbonIntensityGco2PerKwh,
      intensitySource: "lkg-ledger+ironlock-state",
      sustainabilityAleCents: mitigatedCents.toString(),
      sustainabilityAleDisplay: formatCentsToAccountingUSD(mitigatedCents),
      mitigatedValueCentsAggregate: mitigatedAgg.toString(),
      carbonShareOfTenantAleBps: carbonShareOfTenantAleBps.toString(),
      sparkline24h,
      dirtyGrid: {
        isDirty: isDirtyWindow,
        thresholdGco2PerKwh: thresholdGco2,
        alertMessage: pendingAlert?.message ?? null,
        alertsResponded,
      },
      forensic: {
        verified: Boolean(forensic?.sha256),
        sha256: forensic?.sha256 ?? null,
        artifactId: forensic?.artifactId ?? null,
        canonicalPreview: forensic?.canonicalPreview ?? null,
      },
      governanceDividend: {
        penaltyAvoidedCents: penaltyAvoided.toString(),
        penaltyAvoidedDisplay: formatCentsToAccountingUSD(penaltyAvoided),
      },
      throttling: {
        agent6SuppressingBackground: throttle.agent6SuppressingBackground,
        dirtyWindowForThrottle: throttle.dirtyWindowForThrottle,
        autonomousMitigationEnabled: throttle.autonomousMitigationEnabled,
        intensityGco2PerKwh: throttle.intensityGco2PerKwh,
        thresholdGco2PerKwh: thresholdGco2,
        throttleLastUpdatedAt: throttle.lastUpdatedAt,
        notificationMessage:
          throttle.notificationMessage ??
          (throttle.agent6SuppressingBackground ? IRONLOCK_AUTO_THROTTLE_NOTIFICATION : null),
      },
      resilienceStreak,
    },
    lkg: { recordedAt: metric.createdAt.toISOString(), threatId: metric.threatId },
  };
}

export async function buildCarbonPulseLkgFinancialBundle(tenantId: string): Promise<{
  pulse: CarbonPulsePayload;
  financialImpact: CostOfNonComplianceResult;
  lkg: { recordedAt: string; threatId: string };
} | null> {
  const built = await buildCarbonPulseLkgPayload(tenantId);
  if (!built) return null;
  const { pulse, lkg } = built;
  const tenantKey = tenantKeyFromUuid(tenantId);
  const maturityState = await readGovernanceMaturityState();
  const financialImpact = computeCostOfNonCompliance(maturityState.current.score, {
    tenantKey,
    baselineMode: resolveGovernanceBaselineMode(tenantKey),
    sustainabilityAleCents: pulse.sustainabilityAleCents,
    carbonPenaltyAvoidedCents: pulse.governanceDividend.penaltyAvoidedCents,
    selfHealingResilienceBonusActive: pulse.resilienceStreak.verifiedSustainabilityLeader,
  });
  return { pulse, financialImpact, lkg };
}
