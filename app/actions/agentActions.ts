"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { ComplianceFramework, SimThreatSource, ThreatState } from "@prisma/client";
import prisma from "@/lib/prisma";
import { logThreatActivity } from "@/app/actions/auditActions";
import { recordResilienceIntelStreamLine } from "@/app/actions/resilienceIntelStreamActions";
import { getIndustryTrendData } from "@/app/actions/benchmarkActions";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import { getCompanyIdForActiveTenant } from "@/app/lib/grc/clearanceThreatResolve";
import { hasClearance, resolveEffectiveEvidenceChapter } from "@/app/utils/clearanceLogic";
import { ironwatchSignShredReceiptPayloadSync } from "@/app/utils/ironwatchShredReceipt";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CROWN_JEWEL_SLUGS = new Set(["medshield", "vaultbank"]);

const PRIORITY_MAPPED_CONTROLS_SOC2 = ["SOC2 CC6.1", "SOC2 CC6.7"] as const;

export type MarketVolatilityHardeningResult =
  | { ok: true; created: number; threatIds: string[]; skipped: boolean; reason?: string }
  | { ok: false; error: string };

function readEpisodeKeyFromIngestion(ingestion: Prisma.JsonValue | null): string | null {
  if (ingestion == null || typeof ingestion !== "object" || Array.isArray(ingestion)) return null;
  const mv = (ingestion as Record<string, unknown>).marketVolatilityHardening;
  if (mv == null || typeof mv !== "object" || Array.isArray(mv)) return null;
  const key = (mv as Record<string, unknown>).episodeKey;
  return typeof key === "string" ? key : null;
}

/**
 * When industry mean ALE jumps (ΔV > 20%), auto-queue priority control validation on Crown Jewel
 * tenants (Medshield, Vaultbank): high-priority shadow RiskEvents and accelerated 4h Ironsight /
 * Ironlock re-verification (standard 24h continuous-validation window bypassed for this episode).
 */
export async function triggerMarketVolatilityAutoHardening(
  tenantUuid: string,
  volatilityEpisodeKey: string,
  marketVolatilityDeltaV: number | null,
): Promise<MarketVolatilityHardeningResult> {
  const tid = tenantUuid.trim();
  if (!UUID_RE.test(tid)) return { ok: false, error: "Invalid tenant UUID." };
  const ep = volatilityEpisodeKey.trim();
  if (!ep) return { ok: false, error: "Missing volatility episode key." };

  const tenant = await prisma.tenant.findUnique({
    where: { id: tid },
    select: { slug: true, name: true, ale_baseline: true },
  });
  if (!tenant) return { ok: false, error: "Tenant not found." };

  const slug = tenant.slug.trim().toLowerCase();
  if (!CROWN_JEWEL_SLUGS.has(slug)) {
    return { ok: true, created: 0, threatIds: [], skipped: true, reason: "not_crown_jewel_tenant" };
  }

  const companies = await prisma.company.findMany({
    where: { tenantId: tid },
    select: { id: true, name: true },
  });
  if (companies.length === 0) {
    return { ok: false, error: "No companies for tenant." };
  }

  const monitoringExpiry = new Date(Date.now() + 4 * 60 * 60 * 1000);
  const startedAt = new Date().toISOString();
  const financialSeed = tenant.ale_baseline > 0n ? tenant.ale_baseline : 50_000_000n;
  const deltaStr =
    marketVolatilityDeltaV != null && Number.isFinite(marketVolatilityDeltaV)
      ? `${(marketVolatilityDeltaV * 100).toFixed(2)}%`
      : "n/a";

  const createdIds: string[] = [];

  for (const co of companies) {
    const recent = await prisma.riskEvent.findMany({
      where: {
        tenantCompanyId: co.id,
        sourceAgent: "SYSTEM_VOLATILITY_TRIGGER",
        createdAt: { gte: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
      },
      select: { ingestionDetails: true },
      take: 5,
    });
    if (recent.some((r) => readEpisodeKeyFromIngestion(r.ingestionDetails) === ep)) {
      continue;
    }

    const threat = await prisma.riskEvent.create({
      data: {
        title: `Priority Control Validation — Market Volatility (${co.name})`,
        sourceAgent: "SYSTEM_VOLATILITY_TRIGGER",
        source: SimThreatSource.SYSTEM,
        status: ThreatState.IDENTIFIED,
        severity: "CRITICAL",
        score: 95,
        priority_score: 100,
        targetEntity: co.name,
        tenantCompanyId: co.id,
        financialRisk_cents: financialSeed,
        complianceFramework: ComplianceFramework.SOC2,
        mappedControls: [...PRIORITY_MAPPED_CONTROLS_SOC2],
        monitoringExpiry,
        ttlSeconds: 4 * 60 * 60,
        ingestionDetails: {
          marketVolatilityHardening: {
            episodeKey: ep,
            deltaV: marketVolatilityDeltaV,
            deltaVDisplay: deltaStr,
            priorityControlValidation: true,
            crownJewelAsset: co.name,
            assignedAgents: ["Ironsight", "Ironlock"],
            verificationDeadlineUtc: monitoringExpiry.toISOString(),
            acceleratedValidationHours: 4,
            standardValidationHoursBypassed: 24,
            criticalControls: ["Access Control (CC6.1)", "Encryption-at-rest / in-transit (CC6.7)"],
          },
          isDeepMonitoring: true,
          isContinuousControlValidation: true,
          continuousControlValidation: {
            assignedAgents: ["Ironsight", "Ironlock"],
            pollingProfile: "MARKET_VOLATILITY_ACCELERATED_4H",
            ttlBound: true,
            startedAt,
            monitoringExpiry: monitoringExpiry.toISOString(),
            asset: co.name,
            bypassStandard24hWindow: true,
          },
        } satisfies Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    createdIds.push(threat.id);

    const planBase: Prisma.JsonObject = {
      mode: "MARKET_VOLATILITY_PRIORITY_CONTROL_VALIDATION",
      acceleratedDeadline: monitoringExpiry.toISOString(),
      bypass24hStandardWindow: true,
      mappedControls: [...PRIORITY_MAPPED_CONTROLS_SOC2],
    };

    await prisma.reasoningLog.create({
      data: {
        threatId: threat.id,
        agentName: "Ironsight",
        targetAsset: co.name,
        escalationLogic: "MARKET_VOLATILITY_IRONSIGHT_REVERIFY_4H",
        plan: planBase,
        reasoning:
          `Industry benchmark ALE spike (ΔV > 20%). Ironsight must re-verify Access Control and encryption posture for crown-jewel asset "${co.name}" within 4 hours (accelerated window; standard 24h validation cycle bypassed for this episode).`,
        confidence: 0.95,
        isCorrection: false,
        operationalMode: "AUTONOMOUS",
      },
    });

    await prisma.reasoningLog.create({
      data: {
        threatId: threat.id,
        agentName: "Ironlock",
        targetAsset: co.name,
        escalationLogic: "MARKET_VOLATILITY_IRONLOCK_REVERIFY_4H",
        plan: planBase,
        reasoning:
          `Parallel Ironlock quarantine / control attestation pass on "${co.name}" under market hardening; complete within 4 hours alongside Ironsight.`,
        confidence: 0.92,
        isCorrection: false,
        operationalMode: "AUTONOMOUS",
      },
    });

    await logThreatActivity(
      null,
      "SYSTEM_VOLATILITY_AUTO_HARDENING",
      `Crown jewel priority validation queued (${co.name}); Ironsight + Ironlock 4h deadline ${monitoringExpiry.toISOString()}.`,
      {
        operatorId: "SYSTEM_VOLATILITY_TRIGGER",
        simThreatId: threat.id,
        isSimulation: true,
      },
    );

    await recordResilienceIntelStreamLine(
      `🤖 [MARKET_VOLATILITY_AUTO_HARDEN] Priority control validation for ${co.name}; ΔV ${deltaStr}; episode ${ep}.`,
      threat.id,
    );
  }

  if (createdIds.length > 0) {
    revalidatePath("/");
  }

  return { ok: true, created: createdIds.length, threatIds: createdIds, skipped: false };
}

const LIFECYCLE_HOOK_ACTION = "SIM_AUTO_HARDEN_LIFECYCLE_HOOK";
const SHADOW_SCRUTINY_ESCALATION_ACTION = "SHADOW_SCRUTINY_ESCALATION";

/**
 * Shadow plane: when industry benchmark ΔV > 20%, escalate scrutiny for canonical tenants and
 * emit a single Resilience Intel line per volatility episode (deduped).
 */
export async function runShadowMarketVolatilityExpertLifecycleHook(threatId: string): Promise<void> {
  const tid = threatId.trim();
  if (!tid) return;

  const activeTenantUuid = await getActiveTenantUuidFromCookies();

  const trend = await getIndustryTrendData(activeTenantUuid);
  if (!trend.ok || !trend.payload.isMarketVolatile) return;

  const episodeKey = trend.payload.volatilityEpisodeKey;
  if (!episodeKey) return;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentHooks = await prisma.simulationDiagnosticLog.findMany({
    where: {
      action: LIFECYCLE_HOOK_ACTION,
      createdAt: { gte: since },
    },
    select: { payload: true },
    take: 40,
  });
  const already = recentHooks.some((row) => {
    const p = row.payload as { episodeKey?: string };
    return p.episodeKey === episodeKey;
  });
  if (already) return;

  await prisma.simulationDiagnosticLog.create({
    data: {
      tenantUuid: activeTenantUuid,
      simThreatId: tid,
      action: LIFECYCLE_HOOK_ACTION,
      payload: {
        episodeKey,
        triggeredAt: new Date().toISOString(),
        marketVolatilityDeltaV: trend.payload.marketVolatilityDeltaV,
      },
      operatorId: "SIM_MARKET_VOLATILITY",
    },
  });

  const nowIso = new Date().toISOString();
  for (const tenantUuid of Object.values(TENANT_UUIDS)) {
    await prisma.simulationDiagnosticLog.create({
      data: {
        tenantUuid,
        simThreatId: tid,
        action: SHADOW_SCRUTINY_ESCALATION_ACTION,
        payload: {
          episodeKey,
          scrutinyLevel: "ELEVATED",
          reason: "MARKET_VOLATILITY",
          deltaV: trend.payload.marketVolatilityDeltaV,
          escalatedAt: nowIso,
        },
        operatorId: "SIM_MARKET_VOLATILITY",
      },
    });
  }

  await recordResilienceIntelStreamLine(
    "🤖 [SIM_AUTO_HARDEN] | Market spike detected. Hardening Shadow Plane baselines.",
    tid,
  );
}

export type IrongateEvidenceChapterGateResult =
  | { ok: true }
  | { ok: false; httpStatus: number; message: string };

/**
 * Irongate (Agent 14) — blocks access to export-controlled evidence chapters when clearance is insufficient.
 * Emits a Resilience Intel line on denial (audit).
 */
export async function irongateInterceptRestrictedEvidenceChapterAccess(params: {
  riskEventId: string;
  userClearance: string;
}): Promise<IrongateEvidenceChapterGateResult> {
  const tid = params.riskEventId.trim();
  if (!tid) {
    return { ok: false, httpStatus: 400, message: "Missing case id." };
  }

  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) {
    return { ok: false, httpStatus: 401, message: "Unauthorized." };
  }

  const row = await prisma.riskEvent.findFirst({
    where: { id: tid, tenantCompanyId: companyId },
    select: { id: true, title: true, tenantCompanyId: true },
  });
  if (!row || row.tenantCompanyId == null) {
    return { ok: false, httpStatus: 404, message: "Not found." };
  }

  const companyRow = await prisma.company.findUnique({
    where: { id: row.tenantCompanyId },
    select: { tenant: { select: { industry: true } } },
  });

  const chapter = await prisma.evidenceChapter.findUnique({
    where: { riskEventId: tid },
    select: { isExportControlled: true, requiredClearance: true },
  });

  const effective = resolveEffectiveEvidenceChapter(
    row.title,
    companyRow?.tenant?.industry ?? null,
    chapter,
  );

  if (!effective.isExportControlled) {
    return { ok: true };
  }

  if (!hasClearance(params.userClearance, effective.requiredClearance)) {
    await recordResilienceIntelStreamLine(
      `🛡️ [EXPORT_CONTROL] | Unauthorized access attempt blocked for ITAR chapter [${tid}] by Irongate.`,
      tid,
    );
    return { ok: false, httpStatus: 403, message: "Export control: clearance required." };
  }

  return { ok: true };
}

/**
 * Ironwatch (Agent 13) — async wrapper for NIST 800-88 receipt attestation (Server Action–compatible).
 */
export async function ironwatchSignShredReceiptPayload(canonicalPayloadUtf8: string): Promise<string> {
  return ironwatchSignShredReceiptPayloadSync(canonicalPayloadUtf8);
}

/** Resilience Intel / HUD — forensic shredding completion (stored receipt cross-reference). */
export async function ironwatchEmitForensicShredIntel(params: {
  receiptNumber: string;
  riskEventId: string;
}): Promise<void> {
  await recordResilienceIntelStreamLine(
    `🗑️ [IRONWATCH] | Forensic Shredding Complete. Receipt #${params.receiptNumber} stored in the Non-Repudiable Ledger.`,
    params.riskEventId,
  );
}
