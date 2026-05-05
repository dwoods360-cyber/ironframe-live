"use server";

import { createHash } from "crypto";
import { ThreatState } from "@prisma/client";
import prisma from "@/lib/prisma";
import { readSimulationPlaneEnabled } from "@/app/lib/security/ingressGateway";
import { calculateBudgetJustification } from "@/app/utils/grcMath";
import type { BulkEvidenceBundle, BulkEvidenceDateRange, BulkEvidenceRow } from "@/app/types/bulkEvidenceBundle";
import {
  DEFAULT_BROKER_OUTBOUND_PREPARE,
  describeMtlsReadiness,
  getCarrierBrokerRoute,
} from "@/app/utils/brokerGateways";
import { normalizeCarrierKey, type CarrierKey } from "@/app/utils/carrierTemplates";
import { resolveEffectiveEvidenceChapter } from "@/app/utils/clearanceLogic";

const TENANT_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ReasoningLogLike = {
  id: string;
  agentName: string;
  escalationLogic: string | null;
  reasoning: string;
  targetAsset: string | null;
  confidence: number;
  isCorrection: boolean;
  createdAt: Date;
};

type SanitizedReasoningLog = {
  ref: string;
  agentClass: string;
  reasoning: string;
  escalationLogic: string | null;
  targetAssetClass: string;
  confidence: number;
  isCorrection: boolean;
  createdAtUtc: string;
};

function exportSalt(): string {
  return process.env.COMMUNITY_EXPORT_SALT?.trim() || "ironframe-community-export-salt";
}

function stableHash(value: string): string {
  return createHash("sha256")
    .update(`${exportSalt()}|${value}`)
    .digest("hex")
    .slice(0, 16);
}

function classifyAssetName(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) return "Infrastructure Node";
  const u = s.toUpperCase();
  if (u.includes("DB") || u.includes("SQL") || u.includes("LEDGER")) return "Database";
  if (u.includes("AUTH") || u.includes("IAM") || u.includes("SSO")) return "Identity Gateway";
  if (u.includes("S3") || u.includes("BUCKET") || u.includes("BLOB")) return "Object Storage";
  if (u.includes("API") || u.includes("GATEWAY") || u.includes("EDGE")) return "API Gateway";
  if (u.includes("WEB") || u.includes("HTTP")) return "Web Server";
  return "Infrastructure Node";
}

function scrubText(input: string): string {
  return input
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[REDACTED_IP]")
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
      "[REDACTED_UUID]",
    )
    .replace(/\b(?:tenant|company|threat|case)[-_:\s]*[a-z0-9-]{6,}\b/gi, "[REDACTED_IDENTIFIER]");
}

function classifyAgent(agentName: string): string {
  const u = agentName.trim().toUpperCase();
  if (u.includes("IRONSIGHT")) return "Detection Agent";
  if (u.includes("IRONLOCK")) return "Containment Agent";
  if (u.includes("IRONLOGIC")) return "Policy Agent";
  if (u.includes("IRONSCRIBE")) return "Audit Agent";
  if (u.includes("IRONTECH")) return "Resilience Agent";
  return "Autonomous Agent";
}

export async function sanitizeReasoningLogSet(
  logs: ReasoningLogLike[],
): Promise<{
  sanitized: SanitizedReasoningLog[];
  assetClassesObserved: string[];
}> {
  const sanitized = logs.map((log) => {
    const targetAssetClass = classifyAssetName(log.targetAsset);
    return {
      ref: stableHash(log.id),
      agentClass: classifyAgent(log.agentName),
      reasoning: scrubText(log.reasoning),
      escalationLogic: log.escalationLogic ? scrubText(log.escalationLogic) : null,
      targetAssetClass,
      confidence: log.confidence,
      isCorrection: log.isCorrection,
      createdAtUtc: log.createdAt.toISOString(),
    } satisfies SanitizedReasoningLog;
  });
  const assetClassesObserved = [...new Set(sanitized.map((s) => s.targetAssetClass))];
  return { sanitized, assetClassesObserved };
}

export async function contributeAnonymizedLessonsAction(
  threatId: string,
): Promise<{ ok: true; communityInsightId: string } | { ok: false; error: string }> {
  const tid = threatId.trim();
  if (!tid) return { ok: false, error: "Missing threat id." };

  const sim = await prisma.riskEvent.findUnique({
    where: { id: tid },
    select: {
      id: true,
      reasoningLogs: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          agentName: true,
          escalationLogic: true,
          reasoning: true,
          targetAsset: true,
          confidence: true,
          isCorrection: true,
          createdAt: true,
        },
      },
      ingestionDetails: true,
    },
  });
  if (!sim) return { ok: false, error: "Threat not found." };

  const { sanitized, assetClassesObserved } = await sanitizeReasoningLogSet(sim.reasoningLogs);
  const ingestion =
    sim.ingestionDetails && typeof sim.ingestionDetails === "object" && !Array.isArray(sim.ingestionDetails)
      ? (sim.ingestionDetails as Record<string, unknown>)
      : {};
  const predictive =
    ingestion.predictiveFidelity &&
    typeof ingestion.predictiveFidelity === "object" &&
    !Array.isArray(ingestion.predictiveFidelity)
      ? (ingestion.predictiveFidelity as Record<string, unknown>)
      : {};
  const predictiveAccuracyScore =
    typeof predictive.predictionAccuracyScorePct === "number"
      ? predictive.predictionAccuracyScorePct
      : null;

  const mitigationStrategy =
    sanitized.length > 0
      ? "Autonomous containment + self-correction pivot with post-incident reconciliation."
      : "Constitutional incident closure with tactical controls hardening.";

  const anonymizedSummary = {
    schemaVersion: 1,
    exportedAtUtc: new Date().toISOString(),
    sourceRef: stableHash(tid),
    predictiveAccuracyScore,
    mitigationStrategy,
    assetClassesObserved,
    tacticalTimeline: sanitized,
  };

  const exportHash = createHash("sha256")
    .update(JSON.stringify(anonymizedSummary))
    .digest("hex");

  const created = await prisma.communityInsights.create({
    data: {
      sourceThreatId: tid,
      anonymizedSummary,
      predictiveAccuracyScore: predictiveAccuracyScore ?? undefined,
      mitigationStrategy,
      exportHash,
    },
    select: { id: true },
  });

  return { ok: true, communityInsightId: created.id };
}

function emptyTotals() {
  return {
    totalMitigatedAleCents: "0",
    totalPotentialLossCents: "0",
    totalMheLaborSavingsCents: "0",
    totalMheHumanHours: 0,
    cumulativeRoiCents: "0",
  };
}

/**
 * Aggregate closed / validated shadow `RiskEvent` rows for a tenant and date window:
 * budget justification (ALE, uplift, MHE labor savings, ROI) plus due-diligence signals (PDF on file, controls).
 */
export async function getBulkEvidenceBundle(
  tenantUuid: string,
  dateRange: BulkEvidenceDateRange,
): Promise<{ ok: true; bundle: BulkEvidenceBundle } | { ok: false; error: string }> {
  const tid = tenantUuid.trim();
  if (!TENANT_UUID_RE.test(tid)) {
    return { ok: false, error: "Invalid tenant UUID." };
  }

  let start: Date;
  let end: Date;
  try {
    start = new Date(dateRange.startIso);
    end = new Date(dateRange.endIso);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { ok: false, error: "Invalid date range." };
    }
    if (start > end) {
      return { ok: false, error: "Start must be before end." };
    }
  } catch {
    return { ok: false, error: "Invalid date range." };
  }

  const simPlane = await readSimulationPlaneEnabled();
  const companies = await prisma.company.findMany({
    where: { tenantId: tid },
    select: { id: true },
  });
  const companyIds = companies.map((c) => c.id);

  if (companyIds.length === 0) {
    return {
      ok: true,
      bundle: {
        tenantUuid: tid,
        range: dateRange,
        eventCount: 0,
        rows: [],
        totals: emptyTotals(),
        meta: { simulationPlane: simPlane, generatedAtIso: new Date().toISOString() },
      },
    };
  }

  if (!simPlane) {
    return {
      ok: true,
      bundle: {
        tenantUuid: tid,
        range: dateRange,
        eventCount: 0,
        rows: [],
        totals: emptyTotals(),
        meta: { simulationPlane: false, generatedAtIso: new Date().toISOString() },
      },
    };
  }

  const closedOrValidated: ThreatState[] = [
    ThreatState.MITIGATED,
    ThreatState.RESOLVED,
    ThreatState.CLOSED_ARCHIVED,
  ];

  const tenantIndustryRow = await prisma.tenant.findUnique({
    where: { id: tid },
    select: { industry: true },
  });
  const tenantIndustry = tenantIndustryRow?.industry ?? null;

  const shreddedReceipts = await prisma.auditReceipt.findMany({
    where: { tenantId: tid },
    select: { riskEventId: true },
  });
  const shreddedRiskIds = new Set(shreddedReceipts.map((r) => r.riskEventId));

  const events = await prisma.riskEvent.findMany({
    where: {
      tenantCompanyId: { in: companyIds },
      status: { in: closedOrValidated },
      updatedAt: { gte: start, lte: end },
    },
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
      complianceFramework: true,
      mappedControls: true,
      financialRisk_cents: true,
      ingestionDetails: true,
      postMortemReportPath: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const chapterRows =
    events.length === 0
      ? []
      : await prisma.evidenceChapter.findMany({
          where: { riskEventId: { in: events.map((e) => e.id) } },
          select: {
            riskEventId: true,
            isExportControlled: true,
            requiredClearance: true,
          },
        });
  const chapterByRiskId = new Map(
    chapterRows.map((c) => [
      c.riskEventId,
      { isExportControlled: c.isExportControlled, requiredClearance: c.requiredClearance },
    ]),
  );

  const RETENTION_HIGH_RISK_INDUSTRIES = new Set(["Defense", "Aerospace"]);
  const MS_PER_DAY = 86_400_000;

  let totalMitigatedAle = 0n;
  let totalPotentialLoss = 0n;
  let totalLabor = 0n;
  let totalRoi = 0n;
  let totalMheHours = 0;

  const rows: BulkEvidenceRow[] = [];
  for (const ev of events) {
    if (shreddedRiskIds.has(ev.id)) {
      continue;
    }
    const b = calculateBudgetJustification(ev);
    totalMitigatedAle += b.aleCents;
    totalPotentialLoss += b.potentialLossCents;
    totalLabor += b.humanLaborCostCents;
    totalRoi += b.totalValueCreatedCents;
    totalMheHours += b.mheHumanHours;

    const hasPdf = Boolean(ev.postMortemReportPath?.trim());
    const underwriterReady =
      hasPdf && (ev.status === ThreatState.RESOLVED || ev.status === ThreatState.CLOSED_ARCHIVED);

    const persistedChapter = chapterByRiskId.get(ev.id) ?? null;
    const exportFlags = resolveEffectiveEvidenceChapter(ev.title, tenantIndustry, persistedChapter);

    let retention: BulkEvidenceRow["retention"];
    if (tenantIndustry && RETENTION_HIGH_RISK_INDUSTRIES.has(tenantIndustry)) {
      const daysSince = (Date.now() - ev.updatedAt.getTime()) / MS_PER_DAY;
      if (daysSince > 365) {
        retention = { highRiskSector: true, daysRemaining: 0, pendingShred: true };
      } else {
        retention = {
          highRiskSector: true,
          daysRemaining: Math.max(0, Math.floor(365 - daysSince)),
          pendingShred: false,
        };
      }
    }

    rows.push({
      riskEventId: ev.id,
      title: ev.title,
      status: ev.status,
      updatedAtIso: ev.updatedAt.toISOString(),
      complianceFramework: String(ev.complianceFramework),
      mappedControls: [...ev.mappedControls],
      hasPostMortemPdf: hasPdf,
      aleCents: b.aleCents.toString(),
      potentialLossMitigatedCents: b.potentialLossCents.toString(),
      humanLaborSavingsCents: b.humanLaborCostCents.toString(),
      valueCreatedCents: b.totalValueCreatedCents.toString(),
      mheHumanHours: b.mheHumanHours,
      underwriterReady,
      isExportControlled: exportFlags.isExportControlled,
      requiredClearance: exportFlags.requiredClearance,
      retention,
    });
  }

  return {
    ok: true,
    bundle: {
      tenantUuid: tid,
      range: dateRange,
      eventCount: rows.length,
      rows,
      totals: {
        totalMitigatedAleCents: totalMitigatedAle.toString(),
        totalPotentialLossCents: totalPotentialLoss.toString(),
        totalMheLaborSavingsCents: totalLabor.toString(),
        totalMheHumanHours: Math.round(totalMheHours * 100) / 100,
        cumulativeRoiCents: totalRoi.toString(),
      },
      meta: { simulationPlane: true, generatedAtIso: new Date().toISOString() },
    },
  };
}

/**
 * Simulated broker submission — documents the URL and transport (mTLS + OAuth2) that a real integrator would use.
 */
export async function submitBulkEvidenceBrokerMock(
  tenantUuid: string,
  dateRange: BulkEvidenceDateRange,
  carrierKey: string,
): Promise<
  | {
      ok: true;
      message: string;
      endpointWouldHit: string;
      method: string;
      transportNote: string;
      eventCount: number;
      correlationId: string;
    }
  | { ok: false; error: string }
> {
  const bundleResult = await getBulkEvidenceBundle(tenantUuid, dateRange);
  if (!bundleResult.ok) {
    return bundleResult;
  }

  const carrier = normalizeCarrierKey(carrierKey) as CarrierKey;
  const route = getCarrierBrokerRoute(carrier);
  const mtlsLine = describeMtlsReadiness(DEFAULT_BROKER_OUTBOUND_PREPARE.mtls);
  const oauthUrl = DEFAULT_BROKER_OUTBOUND_PREPARE.oauth?.tokenUrl ?? "(not configured)";
  // Internal-only guardrail: exclude unresolved control gaps and any non-ready rows from carrier payloads.
  const exportableRows = bundleResult.bundle.rows.filter((row) => row.underwriterReady);

  return {
    ok: true,
    message: "Broker handshake simulated — no outbound HTTP was performed (success-only evidence set).",
    endpointWouldHit: route.bulkEvidenceUrl,
    method: route.method,
    transportNote: `${mtlsLine} OAuth2 token URL: ${oauthUrl} (client_credentials). Internal gap analytics are tenant-only and excluded.`,
    eventCount: exportableRows.length,
    correlationId: `mock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  };
}
