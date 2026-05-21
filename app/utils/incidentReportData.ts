import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { computeMheHumanHours, parseLaborTracker } from "@/app/utils/sentinelLaborTracker";

export type IncidentReportPayload = {
  threat: {
    id: string;
    title: string;
    status: string;
    sourceAgent: string;
    createdAt: Date;
    updatedAt: Date;
  };
  reasoningLogs: Array<{
    id: string;
    agentName: string;
    escalationLogic: string | null;
    reasoning: string;
    plan: Prisma.JsonValue;
    confidence: number;
    createdAt: Date;
    operationalMode: string;
    isCorrection: boolean;
    targetAsset?: string | null;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    justification: string | null;
    operatorId: string;
    createdAt: Date;
  }>;
  /** First Ironscribe forensic handshake on this case (drill start calibration). */
  forensicDriftMsAtDrillStart: number | null;
  calibrationMathSummary: string | null;
  /** Gate 7 Ironscribe/Irontally lessons-learned block (also appended as ReasoningLog rows). */
  strategicRecommendations?: string;
  predictiveFidelity?: {
    predictedPath: string[];
    actualPath: string[];
    divergencePoints: string[];
    predictionAccuracyScorePct: number;
    handoverEfficiencyMs: number | null;
    strategicPivotTriggered: boolean;
    metricHash: string;
    computedAtUtc: string;
  };
  anonymizedTacticalSummary?: {
    predictiveAccuracyScore: number | null;
    mitigationStrategy: string;
    tacticalSignals: Array<{
      assetClass: string;
      escalationLogic: string | null;
      isCorrection: boolean;
      confidence: number;
      createdAtUtc: string;
    }>;
  };
  dueDiligence?: {
    scannedAssets: string[];
    monitoringStartedAtUtc: string | null;
    monitoringEndedAtUtc: string | null;
  };
  /** Row-level control mapping (RiskEvent) for due diligence verdict. */
  mappedControls?: string[];
  complianceFramework?: string;
  /** Parsed sentinel / hypothesis lines for due diligence PDF §1. */
  hypothesisSummary?: { lines: string[] };
  /** Raw monitoring timestamps (24h validation window). */
  hypothesisIngestionMeta?: {
    continuousControlValidationStartedAtUtc?: string | null;
    continuousControlValidationEndedAtUtc?: string | null;
    deepMonitoringStartedAtUtc?: string | null;
    deepMonitoringEndedAtUtc?: string | null;
  };
  /** Negative-outcome / due diligence: agentic labor & MHE (Man-Hour Equivalent). */
  operationalResourceUtilization?: {
    totalScrutinyHours: number;
    agenticReasoningCycles: number;
    mheHumanHours: number;
    primaryAssetName: string;
  };
  /** RiskEvent.financialRisk_cents as string for JSON / PDF budget math. */
  financialRiskCents?: string;
};

export function extractForensicCalibrationFromReasoningLogs(
  logs: Array<{ plan: Prisma.JsonValue; agentName: string; createdAt: Date }>,
): { driftMs: number | null; calibrationMathSummary: string | null } {
  const sorted = [...logs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  for (const L of sorted) {
    if (L.agentName !== "Ironscribe") continue;
    const p = L.plan as Record<string, unknown>;
    if (p?.forensicHandshake !== true) continue;
    const cm = p.calibrationMath as Record<string, unknown> | undefined;
    if (cm && typeof cm.driftMs === "number") {
      const summary = JSON.stringify(cm, null, 2);
      return { driftMs: cm.driftMs as number, calibrationMathSummary: summary };
    }
  }
  return { driftMs: null, calibrationMathSummary: null };
}

export async function loadIncidentReportPayload(threatId: string): Promise<IncidentReportPayload | null> {
  const row = await prisma.riskEvent.findFirst({
    where: { id: threatId },
    include: {
      reasoningLogs: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!row) return null;

  const auditLogs = await prisma.auditLog.findMany({
    where: { simThreatId: threatId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      action: true,
      justification: true,
      operatorId: true,
      createdAt: true,
    },
  });

  const { driftMs, calibrationMathSummary } = extractForensicCalibrationFromReasoningLogs(row.reasoningLogs);
  const ingestion =
    row.ingestionDetails && typeof row.ingestionDetails === "object" && !Array.isArray(row.ingestionDetails)
      ? (row.ingestionDetails as Record<string, unknown>)
      : {};
  const predictiveObj =
    ingestion.predictiveFidelity &&
    typeof ingestion.predictiveFidelity === "object" &&
    !Array.isArray(ingestion.predictiveFidelity)
      ? (ingestion.predictiveFidelity as Record<string, unknown>)
      : null;
  const predictiveFidelity = predictiveObj
    ? {
        predictedPath: Array.isArray(predictiveObj.predictedPath)
          ? predictiveObj.predictedPath.filter((x): x is string => typeof x === "string")
          : [],
        actualPath: Array.isArray(predictiveObj.actualPath)
          ? predictiveObj.actualPath.filter((x): x is string => typeof x === "string")
          : [],
        divergencePoints: Array.isArray(predictiveObj.divergencePoints)
          ? predictiveObj.divergencePoints.filter((x): x is string => typeof x === "string")
          : [],
        predictionAccuracyScorePct:
          typeof predictiveObj.predictionAccuracyScorePct === "number"
            ? predictiveObj.predictionAccuracyScorePct
            : 0,
        handoverEfficiencyMs:
          typeof predictiveObj.handoverEfficiencyMs === "number"
            ? predictiveObj.handoverEfficiencyMs
            : null,
        strategicPivotTriggered: predictiveObj.strategicPivotTriggered === true,
        metricHash:
          typeof predictiveObj.metricHash === "string" ? predictiveObj.metricHash : "",
        computedAtUtc:
          typeof predictiveObj.computedAtUtc === "string" ? predictiveObj.computedAtUtc : "",
      }
    : undefined;

  const assetClass = (raw: string | null | undefined): string => {
    const s = (raw ?? "").trim().toUpperCase();
    if (!s) return "Infrastructure Node";
    if (s.includes("DB") || s.includes("SQL") || s.includes("LEDGER")) return "Database";
    if (s.includes("AUTH") || s.includes("IAM") || s.includes("SSO")) return "Identity Gateway";
    if (s.includes("API") || s.includes("GATEWAY") || s.includes("EDGE")) return "API Gateway";
    if (s.includes("S3") || s.includes("BUCKET")) return "Object Storage";
    if (s.includes("WEB") || s.includes("HTTP")) return "Web Server";
    return "Infrastructure Node";
  };
  const anonymizedTacticalSummary = {
    predictiveAccuracyScore: predictiveFidelity?.predictionAccuracyScorePct ?? null,
    mitigationStrategy:
      predictiveFidelity && predictiveFidelity.predictionAccuracyScorePct < 50
        ? "Strategic pivot with self-correction recovery and containment retargeting."
        : "Stable defense with autonomous pre-positioning and containment hardening.",
    tacticalSignals: row.reasoningLogs.slice(-12).map((r) => ({
      assetClass: assetClass(r.targetAsset),
      escalationLogic: r.escalationLogic ? String(r.escalationLogic).replace(/\s+/g, " ").slice(0, 180) : null,
      isCorrection: r.isCorrection,
      confidence: r.confidence,
      createdAtUtc: r.createdAt.toISOString(),
    })),
  };
  const deepMonitoringObj =
    ingestion.deepMonitoring &&
    typeof ingestion.deepMonitoring === "object" &&
    !Array.isArray(ingestion.deepMonitoring)
      ? (ingestion.deepMonitoring as Record<string, unknown>)
      : null;
  const continuousControlObj =
    ingestion.continuousControlValidation &&
    typeof ingestion.continuousControlValidation === "object" &&
    !Array.isArray(ingestion.continuousControlValidation)
      ? (ingestion.continuousControlValidation as Record<string, unknown>)
      : null;
  const sentinelVerificationObj =
    ingestion.sentinelVerification &&
    typeof ingestion.sentinelVerification === "object" &&
    !Array.isArray(ingestion.sentinelVerification)
      ? (ingestion.sentinelVerification as Record<string, unknown>)
      : null;
  const scannedAssets = Array.from(
    new Set(
      row.reasoningLogs
        .map((r) => r.targetAsset?.trim())
        .filter((v): v is string => Boolean(v)),
    ),
  );
  if (row.targetEntity?.trim()) scannedAssets.unshift(row.targetEntity.trim());
  const windowStartUtc =
    (continuousControlObj && typeof continuousControlObj.startedAt === "string"
      ? continuousControlObj.startedAt
      : null) ??
    (deepMonitoringObj && typeof deepMonitoringObj.startedAt === "string"
      ? deepMonitoringObj.startedAt
      : null);
  const windowEndUtc =
    (continuousControlObj && typeof continuousControlObj.monitoringExpiry === "string"
      ? continuousControlObj.monitoringExpiry
      : null) ??
    (sentinelVerificationObj && typeof sentinelVerificationObj.evaluatedAt === "string"
      ? sentinelVerificationObj.evaluatedAt
      : null);

  const dueDiligence = {
    scannedAssets: Array.from(new Set(scannedAssets)),
    monitoringStartedAtUtc: windowStartUtc,
    monitoringEndedAtUtc: windowEndUtc,
  };

  const sentinelIntake =
    ingestion.sentinelIntake && typeof ingestion.sentinelIntake === "object" && !Array.isArray(ingestion.sentinelIntake)
      ? (ingestion.sentinelIntake as Record<string, unknown>)
      : null;
  const hypothesisLines: string[] = [];
  if (sentinelIntake) {
    const sym = sentinelIntake.observedSymptom;
    if (typeof sym === "string" && sym.trim()) hypothesisLines.push(`Observed symptom category: ${sym.trim()}.`);
    const conf = sentinelIntake.confidenceLevel;
    if (typeof conf === "number") hypothesisLines.push(`Operator confidence: ${conf}%.`);
    const cf = sentinelIntake.complianceFramework;
    if (typeof cf === "string" && cf.trim()) hypothesisLines.push(`Compliance framework selected: ${cf.trim()}.`);
  }
  if (hypothesisLines.length === 0) {
    hypothesisLines.push(`Title: ${row.title}. Source: ${row.sourceAgent}.`);
  }

  const hypothesisIngestionMeta = {
    continuousControlValidationStartedAtUtc:
      continuousControlObj && typeof continuousControlObj.startedAt === "string"
        ? continuousControlObj.startedAt
        : null,
    continuousControlValidationEndedAtUtc:
      continuousControlObj && typeof continuousControlObj.monitoringExpiry === "string"
        ? continuousControlObj.monitoringExpiry
        : null,
    deepMonitoringStartedAtUtc:
      deepMonitoringObj && typeof deepMonitoringObj.startedAt === "string"
        ? deepMonitoringObj.startedAt
        : null,
    deepMonitoringEndedAtUtc:
      deepMonitoringObj && typeof deepMonitoringObj.monitoringExpiry === "string"
        ? deepMonitoringObj.monitoringExpiry
        : null,
  };

  const laborParsed = parseLaborTracker(ingestion.laborTracker);
  const primaryAssetName =
    row.targetEntity?.trim() || dueDiligence.scannedAssets[0] || "General Infrastructure";
  const mheHumanHours =
    laborParsed.mheHumanHours ??
    Math.round(computeMheHumanHours(laborParsed.byAgent) * 100) / 100;
  const operationalResourceUtilization = {
    totalScrutinyHours: 24.0,
    agenticReasoningCycles:
      laborParsed.totalReasoningCyclesAtClose ?? laborParsed.totalReasoningCycles,
    mheHumanHours,
    primaryAssetName,
  };

  return {
    threat: {
      id: row.id,
      title: row.title,
      status: row.status,
      sourceAgent: row.sourceAgent,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
    reasoningLogs: row.reasoningLogs.map((r) => ({
      id: r.id,
      agentName: r.agentName,
      escalationLogic: r.escalationLogic,
      reasoning: r.reasoning,
      plan: r.plan,
      confidence: r.confidence,
      createdAt: r.createdAt,
      operationalMode: r.operationalMode,
      isCorrection: r.isCorrection,
      targetAsset: r.targetAsset ?? null,
    })),
    auditLogs,
    forensicDriftMsAtDrillStart: driftMs,
    calibrationMathSummary,
    predictiveFidelity,
    anonymizedTacticalSummary,
    dueDiligence,
    mappedControls: Array.isArray(row.mappedControls) ? row.mappedControls : [],
    complianceFramework: String(row.complianceFramework ?? "SOC2"),
    hypothesisSummary: { lines: hypothesisLines },
    hypothesisIngestionMeta,
    operationalResourceUtilization,
    financialRiskCents: row.financialRisk_cents.toString(),
  };
}
