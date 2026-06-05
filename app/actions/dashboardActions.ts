"use server";

import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { ThreatState } from "@prisma/client";
import { subHours } from "date-fns";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { CLEARANCE_QUEUE_STATUSES } from "@/app/utils/clearanceQueue";
import { readSimulationPlaneEnabled } from "@/app/lib/security/ingressGateway";
import { isShadowPlaneActiveFromEnv } from "@/app/utils/shadowPlaneActive";
import { THREAT_ASSIGNEE_AUDIT_ACTIONS } from "@/app/utils/assignmentChainOfCustody";
import { normalizeIngestionDetailsToString } from "@/app/utils/ingestionDetailsMerge";
import { incrementSentinelDeepMonitoringLabor } from "@/app/actions/sentinelLaborActions";
import { fetchTenantAuditLedgerRows } from "@/app/actions/auditActions";
import { reasoningLogIndicatesControlMapped } from "@/app/utils/reasoningLogControlMapping";
import { calculateBudgetJustification } from "@/app/utils/grcMath";
import { fetchInsuranceModelForTenant } from "@/app/utils/insuranceTenantModel";
import {
  buildReasoningWaterfallFromIngestion,
  type ReasoningWaterfallVM,
} from "@/app/utils/reasoningWaterfallFromIngestion";

const COMMUNITY_WEIGHT = 0.1;

function controlsForFramework(framework: string): string[] {
  if (framework === "ISO27001") return ["ISO27001 Annex A.8.2"];
  if (framework === "NIST") return ["NIST PR.AC-3"];
  return ["SOC2 CC6.1"];
}

export type GlobalTelemetry = {
  activeExposureUsd: number;
  pipelineExposureUsd: number;
  mitigatedExposureUsd: number;
  activeCount: number;
  pipelineCount: number;
  /** DMZ pipeline threats with createdAt older than 4h (SLA breach). */
  slaBreachCount: number;
  /** Oldest PIPELINE threat `createdAt` for this tenant (DMZ queue head). */
  oldestPipelineThreatAt: Date | null;
};

const NULL_TELEMETRY: GlobalTelemetry = {
  activeExposureUsd: 0,
  pipelineExposureUsd: 0,
  mitigatedExposureUsd: 0,
  activeCount: 0,
  pipelineCount: 0,
  slaBreachCount: 0,
  oldestPipelineThreatAt: null,
};

async function getCompanyIdForActiveTenant(tenantUuidOverride?: string): Promise<bigint | null> {
  const tenantUuid = tenantUuidOverride ?? (await getActiveTenantUuidFromCookies());
  try {
    const company = await prisma.company.findFirst({
      where: { tenantId: tenantUuid },
      select: { id: true },
    });
    return company?.id ?? null;
  } catch (err) {
    // Control-first: tenant mismatch / DB errors should not crash the component tree.
    console.error("[dashboardActions] tenant_scope_error:", err);
    return null;
  }
}

/** BigInt cents → USD using `Number(cents) / 100` (serializable for JSON). */
function centsBigIntToUsd(value: bigint | null | undefined): number {
  const n = value ?? 0n;
  return Number(n) / 100;
}

const MITIGATED_STATUSES: ThreatState[] = [ThreatState.RESOLVED];

/** Force-filter undefined/null for Prisma `in` strictness. */
const validClearanceStatuses = CLEARANCE_QUEUE_STATUSES.filter(
  (s): s is ThreatState => s !== undefined && s !== null,
);

/**
 * Tenant-scoped ThreatEvent aggregates: live financial exposure from `financialRisk_cents`
 * (not `Company.industry_avg_loss_cents`).
 */
export async function getGlobalTelemetry(tenantUuidOverride?: string): Promise<GlobalTelemetry> {
  const companyId = await getCompanyIdForActiveTenant(tenantUuidOverride);
  if (companyId == null) return NULL_TELEMETRY;

  const tenantWhere = { tenantCompanyId: companyId };
  const slaThreshold = new Date(Date.now() - 4 * 60 * 60 * 1000);

  try {
    const [
      activeAgg,
      pipelineAgg,
      mitigatedAgg,
      activeCount,
      pipelineCount,
      slaBreachCount,
      oldestThreat,
    ] = await Promise.all([
      prisma.threatEvent.aggregate({
        where: { ...tenantWhere, status: ThreatState.CONFIRMED },
        _sum: { financialRisk_cents: true },
      }),
      prisma.threatEvent.aggregate({
        where: { ...tenantWhere, status: { in: validClearanceStatuses } },
        _sum: { financialRisk_cents: true },
      }),
      prisma.threatEvent.aggregate({
        where: {
          ...tenantWhere,
          status: {
            in: MITIGATED_STATUSES.filter((s): s is ThreatState => s != null),
          },
        },
        _sum: { financialRisk_cents: true },
      }),
      prisma.threatEvent.count({
        where: { ...tenantWhere, status: ThreatState.CONFIRMED },
      }),
      prisma.threatEvent.count({
        where: { ...tenantWhere, status: { in: validClearanceStatuses } },
      }),
      prisma.threatEvent.count({
        where: {
          ...tenantWhere,
          status: { in: validClearanceStatuses },
          createdAt: { lt: slaThreshold },
        },
      }),
      // PIPELINE queue head for tenant company (`tenantCompanyId` — Prisma field for active-tenant company id).
      prisma.threatEvent.findFirst({
        where: { ...tenantWhere, status: { in: validClearanceStatuses } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
    ]);

    return {
      activeExposureUsd: centsBigIntToUsd(activeAgg._sum.financialRisk_cents),
      pipelineExposureUsd: centsBigIntToUsd(pipelineAgg._sum.financialRisk_cents),
      mitigatedExposureUsd: centsBigIntToUsd(mitigatedAgg._sum.financialRisk_cents),
      activeCount,
      pipelineCount,
      slaBreachCount,
      oldestPipelineThreatAt: oldestThreat?.createdAt ?? null,
    };
  } catch (err) {
    console.error("[dashboardActions] telemetry_query_error:", err);
    return NULL_TELEMETRY;
  }
}

/** JSON-safe row for Server Actions / client consumers (BigInt → string, dates ISO). */
export type ActiveThreatSummary = {
  id: string;
  title: string;
  status: ThreatState;
  sourceAgent: string;
  targetEntity: string;
  score: number;
  financialRisk_cents: string;
  updatedAt: string;
};

/**
 * Tenant-scoped open threats: anything not terminal (`RESOLVED` or `CLOSED_ARCHIVED`).
 * Prefer this over `status: { not: "CLOSED_ARCHIVED" }` alone — that would still include resolved rows.
 */
export async function getActiveThreats(
  tenantUuidOverride?: string,
): Promise<ActiveThreatSummary[]> {
  const companyId = await getCompanyIdForActiveTenant(tenantUuidOverride);
  if (companyId == null) return [];

  try {
    const rows = await prisma.threatEvent.findMany({
      where: {
        tenantCompanyId: companyId,
        status: { notIn: [ThreatState.RESOLVED, ThreatState.CLOSED_ARCHIVED] },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        sourceAgent: true,
        targetEntity: true,
        score: true,
        financialRisk_cents: true,
        updatedAt: true,
      },
    });

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      sourceAgent: r.sourceAgent,
      targetEntity: r.targetEntity,
      score: r.score,
      financialRisk_cents: r.financialRisk_cents.toString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  } catch (err) {
    console.error("[dashboardActions] getActiveThreats_error:", err);
    return [];
  }
}

/** Baseline seed titles excluded from dashboard risk strip (matches `GET /api/dashboard`). */
const DASHBOARD_EXCLUDED_BASELINE_RISK_TITLES = new Set([
  "Schneider Electric SCADA Vulnerability",
  "Azure Health API Exposure",
  "Palo Alto Firewall Misconfiguration",
  "Compliance Audit 2026 — documented control sampling baseline",
]);

/** JSON-safe serializer for mixed BigInt/Date payloads returned by server actions. */
function serializeBigInt<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_key, value) => (typeof value === "bigint" ? value.toString() : value)),
  ) as T;
}

export type DashboardPayload = {
  companies: Array<
    Record<string, unknown> & {
      id: unknown;
      industry_avg_loss_cents: unknown;
      infrastructure_val_cents: unknown;
    }
  >;
  serverAuditLogs: Array<{
    id: string;
    action: string;
    operatorId: string;
    createdAt: string;
    threatId: string | null;
    justification: string | null;
  }>;
  risks: Array<{
    id: string;
    title: string;
    source: string;
    assigneeId?: string;
    threatId: string | null;
    score_cents: unknown;
    company: { name: string; sector: string };
    isSimulation: boolean;
    ingestionDetails?: string;
    ttlSeconds?: number;
    threatCreatedAt?: string;
  }>;
  threatEvents: Array<{
    id: string;
    title: string;
    sourceAgent: string;
    status: ThreatState;
    assigneeId: string | null;
    /** Epic 11: primary compliance framework (shadow `RiskEvent`); production defaults to NIST for HUD. */
    complianceFramework: string;
    mappedControls: string[];
    remediationStatus: string;
    financialRiskCents: string;
    governedImpactCents?: string;
    ingestionDetails?: string | null;
    assignmentHistory: Array<{
      id: string;
      action: string;
      justification: string | null;
      operatorId: string;
      createdAt: string;
    }>;
    reasoningWaterfall?: ReasoningWaterfallVM | null;
  }>;
  /** Sum of `financialRisk_cents` (ALE-style exposure) per asset / scope for active risk events. */
  aleExposureByAssetCents: Record<string, string>;
  /** Count of shadow-plane events with no mapped controls (compliance drift signal). */
  complianceDriftOpenCount: number;
  /** Current scrutiny density (active reasoning window). */
  currentHeat: Record<string, { total: number; agents: Record<string, number> }>;
  scrutinyHeatmap: Record<string, { total: number; agents: Record<string, number> }>;
  /** Predicted scrutiny density for ghost-pulse rendering. */
  predictiveHeat: Record<string, number>;
  isConflictDetected: boolean;
  ironwatchAlerts: string[];
  /** Shadow plane: validated controls per hour (1 / mean hours from RiskEvent.createdAt to first control-mapping ReasoningLog). */
  complianceVelocity: number | null;
  /** Mean hours from risk-event open to first mapped-control reasoning entry (null if no samples). */
  avgHoursToControlMapping: number | null;
  /** Shadow plane: sum of budget `totalValueCreatedCents` for RESOLVED/CLOSED_ARCHIVED rows YTD (UTC year). */
  totalValueMitigatedYtdCents: string;
  /** Annual cyber insurance renewal incentive projection (cents), default $50k premium basis. */
  projectedInsuranceSavingsCents: string;
  insuranceModelFramework: string;
  insuranceHasContinuousMonitoring: boolean;
  insuranceHasDueDiligencePdfs: boolean;
  /** Premium basis used for the projection (cents string). */
  insuranceDefaultPremiumCents: string;
  insuranceTotalDiscountBps: number;
};

/** Dashboard threat strip: DMZ pipeline + in-flight lifecycle (“simulation” / stress drills use PIPELINE–MITIGATED; “active” ≈ CONFIRMED+). */
function dashboardOpenThreatStatusWhere(): Prisma.ThreatEventWhereInput {
  return {
    status: {
      in: [
        ThreatState.PIPELINE,
        ThreatState.IDENTIFIED,
        ThreatState.CONFIRMED,
        ThreatState.MITIGATED,
      ],
    },
  };
}

function complianceDriftSortScore(
  row: {
    status: ThreatState;
    updatedAt: Date;
    mappedControls?: string[];
    remediation_status?: string;
  },
  threatStripUsesRiskEventTable: boolean,
): number {
  let s = 0;
  if (threatStripUsesRiskEventTable && (!row.mappedControls || row.mappedControls.length === 0)) s += 10_000;
  if (row.status === ThreatState.IDENTIFIED) s += 5_000;
  if (row.status === ThreatState.CONFIRMED) s += 3_000;
  if (row.status === ThreatState.MITIGATED) s += 1_000;
  if (row.remediation_status === "PENDING") s += 500;
  return s + Math.min(999, Math.floor(row.updatedAt.getTime() / 1_000_000));
}

/**
 * Full tenant dashboard dataset (companies, audit tail, active risks, risk-event board rows).
 * Used by `GET /api/dashboard` — keeps Prisma off client bundles (`DashboardHomeClient` only fetches the API).
 */
export async function getDashboardPayloadForTenant(activeTenantUuid: string): Promise<DashboardPayload> {
  const simPlane = await readSimulationPlaneEnabled();
  /** Bots + Chaos drills write `ThreatEvent` whenever env shadow is on (`ingressUsesRiskEventTable`); else cookie-sim alone uses `RiskEvent`. */
  const envShadowPlane = isShadowPlaneActiveFromEnv();
  const dashboardThreatsFromRiskTable = simPlane && !envShadowPlane;
  const oneHourAgo = subHours(new Date(), 1);

  const companies = await prisma.company.findMany({
    where: { tenantId: activeTenantUuid },
    include: {
      policies: true,
      risks: true,
    },
  });

  const tenantCompanyIdsEarly = companies
    .map((c) => c.id)
    .filter((id): id is bigint => typeof id === "bigint");

  const assigneeAuditActions = [...THREAT_ASSIGNEE_AUDIT_ACTIONS];

  const riskEventSelect = {
    id: true,
    title: true,
    sourceAgent: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    assigneeId: true,
    ttlSeconds: true,
    ingestionDetails: true,
    forensicSeal: true,
    complianceFramework: true,
    mappedControls: true,
    remediation_status: true,
    financialRisk_cents: true,
    governedImpact: true,
    AuditLog: {
      where: { action: { in: assigneeAuditActions } },
      orderBy: { createdAt: "desc" as const },
      select: {
        id: true,
        action: true,
        justification: true,
        operatorId: true,
        createdAt: true,
      },
    },
  };

  const threatEventSelect = {
    id: true,
    title: true,
    sourceAgent: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    assigneeId: true,
    ttlSeconds: true,
    ingestionDetails: true,
    financialRisk_cents: true,
    auditTrail: {
      where: { action: { in: assigneeAuditActions } },
      orderBy: { createdAt: "desc" as const },
      select: {
        id: true,
        action: true,
        justification: true,
        operatorId: true,
        createdAt: true,
      },
    },
  };

  const openWhere = dashboardOpenThreatStatusWhere();
  const openRiskWhere: Prisma.RiskEventWhereInput = {
    AND: [
      { tenantId: activeTenantUuid },
      {
        status: { notIn: [ThreatState.RESOLVED, ThreatState.CLOSED_ARCHIVED] },
      },
    ],
  };

  const [serverAuditLogs, risks, threatEvents] = await Promise.all([
    prisma.auditLog.findMany({
      where: { tenantId: activeTenantUuid },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        action: true,
        operatorId: true,
        createdAt: true,
        threatId: true,
        simThreatId: true,
        justification: true,
      },
    }),
    prisma.activeRisk.findMany({
      where: {
        company: { tenantId: activeTenantUuid },
        /** Active canvas: simulation-flagged ingress only — excludes GRC program baselines. */
        isSimulation: true,
        NOT: { source: "GRC_BASELINE" },
      },
      select: {
        id: true,
        company_id: true,
        title: true,
        status: true,
        assigneeId: true,
        score_cents: true,
        source: true,
        isSimulation: true,
        company: { select: { name: true, sector: true } },
      },
      orderBy: { score_cents: "desc" },
    }),
    dashboardThreatsFromRiskTable
      ? prisma.riskEvent.findMany({
          where: openRiskWhere,
          select: riskEventSelect,
          orderBy: { updatedAt: "desc" },
        })
      : tenantCompanyIdsEarly.length === 0
        ? Promise.resolve([])
        : prisma.threatEvent.findMany({
            where: {
              AND: [{ tenantCompanyId: { in: tenantCompanyIdsEarly } }, openWhere],
            },
            select: threatEventSelect,
            orderBy: { updatedAt: "desc" },
          }),
  ]);

  /**
   * Shadow + simulation cookie: dashboard reads `ThreatEvent`; legacy Chaos rows may still live on `RiskEvent`.
   * Merge chaos drills (`isChaosTest` / CHAOS_DRILL) so §4.3 operational diagnostics isolation does not hide Irontech drills from the pipeline strip (simulation mode Amendment §5).
   */
  let mergedThreatStripRows = threatEvents as unknown[];
  if (envShadowPlane && simPlane && !dashboardThreatsFromRiskTable) {
    const bridgeCandidates = await prisma.riskEvent.findMany({
      where: {
        tenantId: activeTenantUuid,
        status: { notIn: [ThreatState.RESOLVED, ThreatState.CLOSED_ARCHIVED] },
      },
      select: riskEventSelect,
    });
    const chaosBridge = bridgeCandidates.filter((r) => {
      const raw = r.ingestionDetails;
      if (raw == null) return false;
      try {
        const j =
          typeof raw === "object" && raw !== null && !Array.isArray(raw)
            ? (raw as Record<string, unknown>)
            : (JSON.parse(String(raw)) as Record<string, unknown>);
        if (j.isChaosTest === true) return true;
        if (j.incident_type === "CHAOS") return true;
        if (j.category === "INFRASTRUCTURE" && (j.isChaosTest === true || j.incident_type === "CHAOS"))
          return true;
        const et = String(j.entityType ?? "");
        return et.includes("CHAOS") || et === "CHAOS_DRILL";
      } catch {
        return false;
      }
    });
    const seen = new Set(threatEvents.map((t) => t.id));
    mergedThreatStripRows = [
      ...threatEvents,
      ...chaosBridge.filter((r) => !seen.has(r.id)),
    ];
  }

  const threatEventsSorted = (mergedThreatStripRows as typeof threatEvents).sort(
    (a, b) =>
      complianceDriftSortScore(
        {
          status: b.status,
          updatedAt: b.updatedAt,
          ...("mappedControls" in b ? { mappedControls: b.mappedControls } : {}),
          ...("remediation_status" in b ? { remediation_status: b.remediation_status } : {}),
        },
        dashboardThreatsFromRiskTable,
      ) -
      complianceDriftSortScore(
        {
          status: a.status,
          updatedAt: a.updatedAt,
          ...("mappedControls" in a ? { mappedControls: a.mappedControls } : {}),
          ...("remediation_status" in a ? { remediation_status: a.remediation_status } : {}),
        },
        dashboardThreatsFromRiskTable,
      ),
  );

  const filteredRisks = risks.filter((r) => !DASHBOARD_EXCLUDED_BASELINE_RISK_TITLES.has(r.title));
  const normalize = (value: string) => value.trim().toLowerCase();
  const threatByCompositeKey = new Map<string, string>();
  for (const t of threatEventsSorted) {
    const key = `${normalize(t.title)}::${normalize(t.sourceAgent)}`;
    if (!threatByCompositeKey.has(key)) {
      threatByCompositeKey.set(key, t.id);
    }
  }
  const threatByTitle = new Map<string, string>();
  for (const t of threatEventsSorted) {
    const key = normalize(t.title);
    if (!threatByTitle.has(key)) {
      threatByTitle.set(key, t.id);
    }
  }

  const assigneeByThreatEventId = new Map<string, string | null>();
  const ingestionDetailsByThreatId = new Map<string, string | null>();
  const ttlSecondsByThreatId = new Map<string, number>();
  const threatCreatedAtByThreatId = new Map<string, string>();
  for (const t of threatEventsSorted) {
    assigneeByThreatEventId.set(t.id, t.assigneeId);
    ingestionDetailsByThreatId.set(
      t.id,
      normalizeIngestionDetailsToString(t.ingestionDetails) ?? null,
    );
    ttlSecondsByThreatId.set(t.id, t.ttlSeconds);
    threatCreatedAtByThreatId.set(t.id, t.createdAt.toISOString());
  }

  const serializedRisks = filteredRisks.map((risk) => {
    const threatId =
      threatByCompositeKey.get(`${normalize(risk.title)}::${normalize(risk.source)}`) ??
      threatByTitle.get(normalize(risk.title)) ??
      null;
    const teAssignee = threatId ? assigneeByThreatEventId.get(threatId) ?? null : null;
    const merged = risk.assigneeId ?? teAssignee;
    const assigneeId =
      merged != null && String(merged).trim() !== "" ? String(merged).trim() : undefined;
    const ingestionDetails =
      threatId != null ? ingestionDetailsByThreatId.get(threatId) ?? undefined : undefined;
    const ttlSeconds = threatId != null ? ttlSecondsByThreatId.get(threatId) : undefined;
    const threatCreatedAt =
      threatId != null ? threatCreatedAtByThreatId.get(threatId) : undefined;
    return {
      id: risk.id.toString(),
      title: risk.title,
      source: risk.source,
      assigneeId,
      threatId,
      score_cents: risk.score_cents,
      company: { name: risk.company.name, sector: risk.company.sector },
      isSimulation: risk.isSimulation,
      ...(ingestionDetails != null ? { ingestionDetails } : {}),
      ...(ttlSeconds !== undefined ? { ttlSeconds } : {}),
      ...(threatCreatedAt !== undefined ? { threatCreatedAt } : {}),
    };
  });

  const serializedCompanies = companies.map((c) => ({
    ...c,
    id: c.id,
    industry_avg_loss_cents: c.industry_avg_loss_cents ?? null,
    infrastructure_val_cents: c.infrastructure_val_cents ?? null,
  }));
  const tenantCompanyIds = serializedCompanies
    .map((c) => c.id)
    .filter((id): id is bigint => typeof id === "bigint");

  const scrutinyHeatmap: Record<string, { total: number; agents: Record<string, number> }> = {};
  if (tenantCompanyIds.length > 0) {
    const scrutinyRows = await prisma.reasoningLog.groupBy({
      by: ["agentName", "targetAsset", "threatId"],
      where: {
        createdAt: { gte: oneHourAgo },
        threat: { tenantCompanyId: { in: tenantCompanyIds } },
      },
      _count: { _all: true },
    });

    const threatIds = [...new Set(scrutinyRows.map((r) => r.threatId))];
    const threatAssets = await prisma.riskEvent.findMany({
      where: { id: { in: threatIds } },
      select: { id: true, targetEntity: true },
    });
    const assetByThreatId = new Map(
      threatAssets.map((row) => [row.id, row.targetEntity || "General Infrastructure"]),
    );

    for (const item of scrutinyRows) {
      const asset =
        (item.targetAsset?.trim() || assetByThreatId.get(item.threatId) || "General Infrastructure");
      if (!scrutinyHeatmap[asset]) {
        scrutinyHeatmap[asset] = { total: 0, agents: {} };
      }
      scrutinyHeatmap[asset].total += item._count._all;
      scrutinyHeatmap[asset].agents[item.agentName] =
        (scrutinyHeatmap[asset].agents[item.agentName] ?? 0) + item._count._all;
    }
  }

  const localPredictiveHeat: Record<string, number> = {};
  let finalPredictiveHeat: Record<string, number> = localPredictiveHeat;
  let finalConflictDetected = false;
  let finalIronwatchAlerts: string[] = [];
  if (simPlane && tenantCompanyIds.length > 0) {
    const activeSims = await prisma.riskEvent.findMany({
      where: {
        tenantCompanyId: { in: tenantCompanyIds },
        status: { not: ThreatState.CLOSED_ARCHIVED },
      },
      select: { id: true, targetEntity: true, predictedAssets: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });

    for (const sim of activeSims) {
      const assets =
        sim.predictedAssets && typeof sim.predictedAssets === "object" && !Array.isArray(sim.predictedAssets)
          ? (sim.predictedAssets as Record<string, unknown>)
          : null;
      if (!assets) continue;
      for (const [asset, value] of Object.entries(assets)) {
        const n = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(n)) continue;
        localPredictiveHeat[asset] = (localPredictiveHeat[asset] ?? 0) + n;
      }
    }
    const communityPredictiveHeat: Record<string, number> = {};
    // Community intelligence weighted contribution: Wc * credibilityScore * heatValue
    const communityPatterns = await prisma.communityIntelligence.findMany({
      where: { active: true },
      select: { patternData: true, credibilityScore: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    for (const row of communityPatterns) {
      const patterns =
        row.patternData && typeof row.patternData === "object" && !Array.isArray(row.patternData)
          ? (row.patternData as Record<string, unknown>)
          : null;
      if (!patterns) continue; // forensic guardrail: empty/invalid community payload is skipped safely

      const credibility =
        typeof row.credibilityScore === "number" && Number.isFinite(row.credibilityScore)
          ? row.credibilityScore
          : 1.0;
      const weight = COMMUNITY_WEIGHT * credibility;

      for (const [asset, value] of Object.entries(patterns)) {
        const n = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(n)) continue;
        communityPredictiveHeat[asset] = (communityPredictiveHeat[asset] ?? 0) + n * weight;
      }
    }

    const predictiveHeatMerged: Record<string, number> = {};
    const ironwatchAlerts: string[] = [];
    const anomalyLogs: Array<{ threatId: string; targetAsset: string; variancePct: number }> = [];
    const allAssets = new Set<string>([
      ...Object.keys(localPredictiveHeat),
      ...Object.keys(communityPredictiveHeat),
    ]);
    for (const asset of allAssets) {
      const local = localPredictiveHeat[asset] ?? 0;
      const community = communityPredictiveHeat[asset] ?? 0;
      const varianceRatio = Math.abs(local - community) / Math.max(local, 1);
      if (varianceRatio > 0.5) {
        const variancePct = Math.round(varianceRatio * 10000) / 100;
        ironwatchAlerts.push(
          `🤖 [IRONWATCH_ANOMALY_DETECTED] Significant divergence detected between local prediction math and community intelligence. Variance: ${variancePct.toFixed(
            2,
          )}%. Quarantining community influence for Asset: ${asset}.`,
        );
        // Quarantine community influence this cycle (protect local baseline).
        predictiveHeatMerged[asset] = local;
        const anchor = activeSims.find((sim) => sim.targetEntity === asset) ?? activeSims[0];
        if (anchor?.id) {
          anomalyLogs.push({ threatId: anchor.id, targetAsset: asset, variancePct });
        }
      } else {
        predictiveHeatMerged[asset] = local + community;
      }
    }

    if (anomalyLogs.length > 0) {
      await prisma.reasoningLog.createMany({
        data: anomalyLogs.map((log) => ({
          threatId: log.threatId,
          agentName: "Ironwatch",
          targetAsset: log.targetAsset,
          escalationLogic: "IRONWATCH_CONFLICT_ALERT | variance(local,community) > 50%",
          plan: {
            severity: "HIGH",
            variancePct: log.variancePct,
            action: "COMMUNITY_INFLUENCE_QUARANTINED",
          } satisfies Prisma.JsonObject,
          reasoning:
            `🤖 [IRONWATCH_ANOMALY_DETECTED] Significant divergence detected between local prediction math and community intelligence. ` +
            `Variance: ${log.variancePct.toFixed(2)}%. Quarantining community influence for Asset: ${log.targetAsset}.`,
          confidence: 0.97,
          isCorrection: true,
          operationalMode: "AUTONOMOUS",
        })),
      });
      for (const log of anomalyLogs) {
        await incrementSentinelDeepMonitoringLabor(log.threatId, "Ironwatch", 1);
      }
    }

    finalPredictiveHeat = predictiveHeatMerged;
    finalConflictDetected = ironwatchAlerts.length > 0;
    finalIronwatchAlerts = ironwatchAlerts;
  }
  type AuditSlice = {
    id: string;
    action: string;
    justification: string | null;
    operatorId: string;
    createdAt: Date;
  };

  const complianceDriftOpenCount = dashboardThreatsFromRiskTable
    ? threatEventsSorted.filter(
        (t) => "mappedControls" in t && Array.isArray(t.mappedControls) && t.mappedControls.length === 0,
      ).length
    : 0;

  let aleExposureByAssetCents: Record<string, string> = {};
  if (tenantCompanyIds.length > 0) {
    const aleRows = simPlane
      ? await prisma.riskEvent.findMany({
          where: {
            tenantCompanyId: { in: tenantCompanyIds },
            status: { not: ThreatState.CLOSED_ARCHIVED },
          },
          select: { targetEntity: true, financialRisk_cents: true },
        })
      : await prisma.threatEvent.findMany({
          where: {
            tenantCompanyId: { in: tenantCompanyIds },
            status: { not: ThreatState.CLOSED_ARCHIVED },
          },
          select: { targetEntity: true, financialRisk_cents: true },
        });
    const acc = new Map<string, bigint>();
    for (const r of aleRows) {
      const asset = r.targetEntity?.trim() || "General Infrastructure";
      acc.set(asset, (acc.get(asset) ?? 0n) + r.financialRisk_cents);
    }
    aleExposureByAssetCents = Object.fromEntries([...acc.entries()].map(([k, v]) => [k, v.toString()]));
  }

  let complianceVelocity: number | null = null;
  let avgHoursToControlMapping: number | null = null;
  if (simPlane && tenantCompanyIds.length > 0) {
    const reForVelocity = await prisma.riskEvent.findMany({
      where: { tenantCompanyId: { in: tenantCompanyIds } },
      select: { id: true, createdAt: true },
    });
    if (reForVelocity.length > 0) {
      const ids = reForVelocity.map((e) => e.id);
      const velocityLogs = await prisma.reasoningLog.findMany({
        where: { threatId: { in: ids } },
        orderBy: { createdAt: "asc" },
        select: {
          threatId: true,
          createdAt: true,
          plan: true,
          escalationLogic: true,
          reasoning: true,
          agentName: true,
        },
      });
      const createdMs = new Map(reForVelocity.map((e) => [e.id, e.createdAt.getTime()]));
      const firstMapMs = new Map<string, number>();
      for (const log of velocityLogs) {
        if (firstMapMs.has(log.threatId)) continue;
        if (!reasoningLogIndicatesControlMapped(log)) continue;
        firstMapMs.set(log.threatId, log.createdAt.getTime());
      }
      const deltasHours: number[] = [];
      for (const [tid, mapMs] of firstMapMs) {
        const c0 = createdMs.get(tid);
        if (c0 == null) continue;
        const h = (mapMs - c0) / 3_600_000;
        if (h >= 0 && Number.isFinite(h)) deltasHours.push(h);
      }
      if (deltasHours.length > 0) {
        const sum = deltasHours.reduce((a, b) => a + b, 0);
        avgHoursToControlMapping = sum / deltasHours.length;
        complianceVelocity = avgHoursToControlMapping > 0 ? 1 / avgHoursToControlMapping : null;
      }
    }
  }

  let totalValueMitigatedYtdCents = "0";
  if (simPlane && tenantCompanyIds.length > 0) {
    const ytdStart = new Date();
    ytdStart.setUTCMonth(0, 1);
    ytdStart.setUTCHours(0, 0, 0, 0);
    const closedYtd = await prisma.riskEvent.findMany({
      where: {
        tenantCompanyId: { in: tenantCompanyIds },
        status: { in: [ThreatState.RESOLVED, ThreatState.CLOSED_ARCHIVED] },
        updatedAt: { gte: ytdStart },
      },
      select: {
        financialRisk_cents: true,
        complianceFramework: true,
        ingestionDetails: true,
      },
    });
    let ytdAcc = 0n;
    for (const ev of closedYtd) {
      ytdAcc += calculateBudgetJustification(ev).totalValueCreatedCents;
    }
    totalValueMitigatedYtdCents = ytdAcc.toString();
  }

  const insuranceModel = await fetchInsuranceModelForTenant(activeTenantUuid);

  const threatEventsPayload = threatEventsSorted.map((t) => {
    /** `RiskEvent` strip rows (sim shadow / merged chaos bridge) vs production `ThreatEvent`. */
    const useRiskShape =
      dashboardThreatsFromRiskTable ||
      ("complianceFramework" in t && "AuditLog" in t && !("auditTrail" in t));
    const auditTrail: AuditSlice[] =
      "auditTrail" in t && Array.isArray(t.auditTrail)
        ? t.auditTrail
        : "AuditLog" in t && Array.isArray((t as { AuditLog?: AuditSlice[] }).AuditLog)
          ? (t as { AuditLog: AuditSlice[] }).AuditLog
          : [];
    const complianceFramework =
      useRiskShape && "complianceFramework" in t ? String(t.complianceFramework) : "NIST";
    const mappedControls =
      useRiskShape && "mappedControls" in t && Array.isArray(t.mappedControls)
        ? t.mappedControls.length > 0
          ? t.mappedControls
          : controlsForFramework(complianceFramework)
        : [];
    const remediationStatus =
      useRiskShape && "remediation_status" in t ? String(t.remediation_status) : "PENDING";
    const financialRiskCents =
      "financialRisk_cents" in t ? (t.financialRisk_cents as bigint).toString() : "0";
    const governedImpactCents =
      useRiskShape && "governedImpact" in t ? (t.governedImpact as bigint).toString() : undefined;
    const reasoningWaterfall =
      useRiskShape && ("ingestionDetails" in t || "forensicSeal" in t)
        ? buildReasoningWaterfallFromIngestion(
            "ingestionDetails" in t ? t.ingestionDetails : null,
            "forensicSeal" in t ? t.forensicSeal : undefined,
          )
        : null;
    const ingestionDetailsStr =
      "ingestionDetails" in t
        ? normalizeIngestionDetailsToString(t.ingestionDetails) ?? null
        : null;
    return {
      id: t.id,
      title: t.title,
      sourceAgent: t.sourceAgent,
      status: t.status,
      assigneeId: t.assigneeId ?? null,
      complianceFramework,
      mappedControls,
      remediationStatus,
      financialRiskCents,
      governedImpactCents,
      ingestionDetails: ingestionDetailsStr,
      assignmentHistory: auditTrail.map((log) => ({
        id: log.id,
        action: log.action,
        justification: log.justification,
        operatorId: log.operatorId,
        createdAt: log.createdAt.toISOString(),
      })),
      reasoningWaterfall,
    };
  });

  const serverAuditLogsPayload = serverAuditLogs.map((log) => ({
    id: log.id,
    action: log.action,
    operatorId: log.operatorId,
    threatId: log.threatId ?? log.simThreatId ?? null,
    justification: log.justification,
    createdAt: log.createdAt.toISOString(),
  }));

  return serializeBigInt({
    companies: serializedCompanies,
    serverAuditLogs: serverAuditLogsPayload,
    risks: serializedRisks,
    threatEvents: threatEventsPayload,
    aleExposureByAssetCents,
    complianceDriftOpenCount,
    currentHeat: scrutinyHeatmap,
    scrutinyHeatmap,
    predictiveHeat: finalPredictiveHeat,
    isConflictDetected: finalConflictDetected,
    ironwatchAlerts: finalIronwatchAlerts,
    complianceVelocity,
    avgHoursToControlMapping,
    totalValueMitigatedYtdCents,
    projectedInsuranceSavingsCents: insuranceModel.incentive.totalEstimatedSavings_cents.toString(),
    insuranceModelFramework: insuranceModel.framework,
    insuranceHasContinuousMonitoring: insuranceModel.hasContinuousMonitoring,
    insuranceHasDueDiligencePdfs: insuranceModel.hasDueDiligencePdfs,
    insuranceDefaultPremiumCents: insuranceModel.incentive.basePremium_cents.toString(),
    insuranceTotalDiscountBps: insuranceModel.incentive.totalDiscountBps,
  });
}
