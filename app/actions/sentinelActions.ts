"use server";

import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { ThreatState, SimThreatSource, ComplianceFramework } from "@prisma/client";
import { getCompanyIdForActiveTenant } from "@/app/lib/grc/clearanceThreatResolve";
import { revalidatePath } from "next/cache";
import { getIronwatchAgent13Attestation, getIronwatchMatchMessage } from "@/app/actions/agentActions";
import { ironwatchCrossReferenceHistoricalEvidence } from "@/app/actions/ironwatchGovernanceActions";
import { recordResilienceIntelStreamLine } from "@/app/actions/resilienceIntelStreamActions";
import {
  DEFENSE_REGULATORY_SHIELD_BADGE_LABEL,
  normalizeGrcProfileName,
} from "@/lib/constants/grcGovernance";
import {
  computeGovernanceSealHash,
  mergeGovernanceHashWithIngestionRecord,
} from "@/lib/crypto";
import { computeSentinelFinancialRiskCents } from "@/app/utils/irontrustDeterministicMath";
import { resolveIntegrityLedgerAuthorizedLabel } from "@/app/utils/serverAuth";
import { recordAgentComputeUsage } from "@/app/actions/agentComputeActions";
import { GRC_GOLD_OPERATION_SENTINEL_SWEEP_PREVIEW } from "@/lib/constants/grcGold";

const GRC_GOLD_GOVERNANCE_BLOCK_ACTION = "GRC_GOLD_GOVERNANCE_BLOCK";

function isValidSha256Hex(s: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(s.trim());
}

function escapeSqlStringLiteral(s: string): string {
  return s.replace(/'/g, "''");
}

/** Exact playback query string stored on the JSONB ledger (Flemming / Postgres 18 protocol). */
function buildFlemmingPostgres18ForensicPlaybackQuery(threatId: string, tenantCompanyId: bigint): string {
  const idLit = escapeSqlStringLiteral(threatId);
  return `SELECT id, "financialRisk_cents", "ingestionDetails"->'forensic_reasoning_log' AS forensic_reasoning_log FROM "SimThreatEvent" WHERE id = '${idLit}' AND "tenantCompanyId" = ${tenantCompanyId.toString()}::bigint;`;
}

/** Snapshot persisted under `ingestionDetails.forensic_reasoning_log` (JSONB). */
export type FlemmingForensicReasoningLogV1 = {
  version: 1;
  protocol: "FLEMMING_POSTGRES18";
  postgres18LedgerTable: "SimThreatEvent";
  postgres18ExactQuery: string;
  agent5IronscribeCitation: {
    sourceDocumentHashSha256: string;
    pageReference: string;
  };
  agent3IrontrustDeterministic: {
    formulaExplanation: string;
    baseImpactCentsDecimal?: string;
    governanceImpactMultiplierBpsDecimal?: string;
    governedImpactCentsDecimal?: string;
    /** Legacy ledger (pre–Postgres-18 multiplier column). */
    aleBaselineCentsDecimal?: string;
    financialRiskCentsDecimal?: string;
  };
  ironwatchAgent13: {
    semanticDistance: number;
    vectorRecallScore: number;
    lowConfidenceSemanticDrift: boolean;
  };
  capturedAt: string;
};

export type GovernancePlaybackResult =
  | {
      ok: true;
      log: FlemmingForensicReasoningLogV1 | null;
      forensicSeal: Record<string, unknown> | null;
      governanceHash: string | null;
    }
  | { ok: false; error: string };

export type IngestGovernedRiskFormState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | {
      status: "success";
      threatId: string;
      ironwatchSidebarAlert: string | null;
      regulatoryShieldBadge: string | null;
      shadowDissent: boolean;
    };

export type SentinelObservedSymptom =
  | "PERFORMANCE_DROP"
  | "UNAUTHORIZED_ACCESS"
  | "DATA_DRIFT"
  | "SERVICE_DEGRADATION"
  | "INTEGRITY_ALERT"
  | "OTHER";

type TriggerSentinelHunchInput = {
  targetAsset: string;
  observedSymptom: SentinelObservedSymptom;
  confidenceLevel: number;
  complianceFramework: "SOC2" | "ISO27001" | "NIST";
};

export async function triggerSentinelHunch(
  input: TriggerSentinelHunchInput,
): Promise<{ ok: true; threatId: string } | { ok: false; error: string }> {
  const targetAsset = input.targetAsset?.trim();
  if (!targetAsset) return { ok: false, error: "Target asset is required." };

  if (!Number.isFinite(input.confidenceLevel)) {
    return { ok: false, error: "Confidence level must be a number." };
  }
  const confidence = Math.max(0, Math.min(100, Math.round(input.confidenceLevel)));

  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) {
    return { ok: false, error: "Missing company context for tenant isolation." };
  }

  if (!Object.values(ComplianceFramework).includes(input.complianceFramework as ComplianceFramework)) {
    return { ok: false, error: "Compliance framework selection is required." };
  }
  const complianceFramework = input.complianceFramework as ComplianceFramework;

  const mappedControls =
    complianceFramework === ComplianceFramework.ISO27001
      ? ["ISO27001 Annex A.8.2"]
      : complianceFramework === ComplianceFramework.NIST
        ? ["NIST PR.AC-3"]
        : ["SOC2 CC6.1"];

  const hunchTenant = await prisma.company.findUnique({
    where: { id: companyId },
    select: { tenantId: true },
  });
  if (hunchTenant?.tenantId == null) {
    return { ok: false, error: "Missing tenant boundary for Sentinel hypothesis." };
  }

  const threat = await prisma.riskEvent.create({
    data: {
      title: `Sentinel Hypothesis: ${targetAsset}`,
      sourceAgent: "HUMAN_SENTINEL",
      source: SimThreatSource.HUMAN_SENTINEL,
      status: ThreatState.IDENTIFIED,
      severity: confidence >= 70 ? "HIGH" : confidence >= 40 ? "MEDIUM" : "LOW",
      score: Math.max(1, confidence),
      priority_score: Math.max(1, confidence),
      targetEntity: targetAsset,
      tenantCompanyId: companyId,
      tenantId: hunchTenant.tenantId,
      threatVelocity: 1.0,
      complianceFramework,
      mappedControls,
      monitoringExpiry: null,
      ingestionDetails: {
        sentinelIntake: {
          observedSymptom: input.observedSymptom,
          confidenceLevel: confidence,
          complianceFramework,
          verificationPhaseRequired: true,
          submittedAt: new Date().toISOString(),
        },
        isDeepMonitoring: false,
      } satisfies Prisma.InputJsonValue,
    },
    select: { id: true },
  });

  revalidatePath("/");
  return { ok: true, threatId: threat.id };
}

/** Sentinel interview — CMMC / ITAR / HIPAA governance entry. */
export type SentinelRegulatoryFramework = "CMMC_L3" | "ITAR" | "HIPAA";

export type IngestGovernedRiskInput = {
  regulatoryFramework: SentinelRegulatoryFramework;
  controlId: string;
  systemOwner: string;
  impactJustification: string;
  /** Agent 5 (Ironscribe) — SHA-256 of the source document bytes (hex, 64 chars). */
  sourceDocumentHashSha256: string;
  /** Agent 5 — printed page or PDF page reference for the regulatory claim. */
  pageReference: string;
  /** Product Owner / profile-bound digital signature (must match Security Profile full name server-side). */
  digitalSignature: string;
  /** Optional operator context carried from the sweep terminal. */
  agentInstruction?: string;
};

/** @deprecated Use `IngestGovernedRiskInput`. */
export type SubmitSentinelGrcInterviewInput = IngestGovernedRiskInput;

function mapSentinelRegulatoryToCompliance(fw: SentinelRegulatoryFramework): ComplianceFramework {
  switch (fw) {
    case "HIPAA":
      return ComplianceFramework.ISO27001;
    case "CMMC_L3":
    case "ITAR":
    default:
      return ComplianceFramework.NIST;
  }
}

/** Pre-submit Ironwatch scan for Sentinel modal (no DB writes — HITL preview). */
export async function previewSentinelGovernanceScan(input: {
  regulatoryFramework: SentinelRegulatoryFramework;
  controlId: string;
  impactJustification: string;
}): Promise<
  | {
      ok: true;
      ironwatchMatched: boolean;
      shadowDissent: boolean;
      shadowDissentAuditInconsistency: boolean;
      shadowDissentSummary: string;
      vectorRecallScore: number;
      semanticDistance: number;
      lowConfidenceSemanticDrift: boolean;
      /** Wall-clock hybrid retrieval duration (ms) for Agentic Compute HUD. */
      agenticComputeMs: number;
    }
  | { ok: false; error: string }
> {
  const controlId = input.controlId?.trim();
  const impactJustification = input.impactJustification?.trim();
  if (!controlId) return { ok: false, error: "Control identifier is required." };
  if (!impactJustification) return { ok: false, error: "Impact justification is required." };

  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) {
    return { ok: false, error: "Missing company context for tenant isolation." };
  }

  const tenantCompany = await prisma.company.findUnique({
    where: { id: companyId },
    select: { tenantId: true },
  });

  const t0 = Date.now();
  const ironwatch = await ironwatchCrossReferenceHistoricalEvidence({
    tenantCompanyId: companyId,
    justification: impactJustification,
    controlId,
  });
  const agenticComputeMs = Date.now() - t0;

  if (tenantCompany?.tenantId) {
    void recordAgentComputeUsage({
      tenantId: tenantCompany.tenantId,
      agentId: "13",
      durationMs: agenticComputeMs,
      tokensIn: Math.max(1, Math.round(impactJustification.length / 4)),
      tokensOut: 0,
      operationType: GRC_GOLD_OPERATION_SENTINEL_SWEEP_PREVIEW,
    });
  }

  return {
    ok: true,
    ironwatchMatched: ironwatch.matched,
    shadowDissent: ironwatch.shadowDissent,
    shadowDissentAuditInconsistency: ironwatch.shadowDissentAuditInconsistency,
    shadowDissentSummary: ironwatch.shadowDissentSummary,
    vectorRecallScore: ironwatch.vectorRecallScore,
    semanticDistance: ironwatch.semanticDistance,
    lowConfidenceSemanticDrift: ironwatch.lowConfidenceSemanticDrift,
    agenticComputeMs,
  };
}

export type IngestGovernedRiskResult =
  | {
      ok: true;
      threatId: string;
      ironwatchMatched: boolean;
      ironwatchSidebarAlert: string | null;
      regulatoryShieldBadge: string | null;
      shadowDissent: boolean;
    }
  | { ok: false; error: string };

/**
 * GRC Gold — governed Sentinel interview: Ironwatch memory scan → forensic custody chain → CONFIRMED (Active Risks).
 * Defense tenants: 1.6× ALE multiplier + CMMC L3 shield badge.
 */
export async function ingestGovernedRisk(input: IngestGovernedRiskInput): Promise<IngestGovernedRiskResult> {
  const controlId = input.controlId?.trim();
  const systemOwner = input.systemOwner?.trim();
  const impactJustification = input.impactJustification?.trim();
  const digitalSignature = input.digitalSignature?.trim();
  const sourceHash = input.sourceDocumentHashSha256?.trim() ?? "";
  const pageReference = input.pageReference?.trim() ?? "";
  if (!controlId) return { ok: false, error: "Control identifier is required." };
  if (!systemOwner) return { ok: false, error: "System owner is required." };
  if (!impactJustification) return { ok: false, error: "Impact justification is required." };
  if (!sourceHash || !isValidSha256Hex(sourceHash)) {
    return {
      ok: false,
      error: "Source document hash is required — provide a 64-character SHA-256 hex digest of the regulatory source.",
    };
  }
  if (!pageReference) {
    return { ok: false, error: "Page reference is required for every regulatory claim (Agent 5 citation gate)." };
  }
  if (!digitalSignature) return { ok: false, error: "Digital signature is required." };

  const { displayName: profileDisplayName, userId: operatorUserId } =
    await resolveIntegrityLedgerAuthorizedLabel();
  if (normalizeGrcProfileName(digitalSignature) !== normalizeGrcProfileName(profileDisplayName)) {
    return {
      ok: false,
      error:
        "Digital signature must match your Security Profile full name (Product Owner or designated CISO attestation).",
    };
  }

  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) {
    return { ok: false, error: "Missing company context for tenant isolation." };
  }

  const companyRow = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      name: true,
      tenantId: true,
      tenant: { select: { industry: true, ale_baseline: true } },
    },
  });

  if (!companyRow?.tenantId) {
    return { ok: false, error: "Missing tenant boundary for governance block." };
  }

  const industry = companyRow?.tenant?.industry?.trim() ?? "";
  const complianceFramework = mapSentinelRegulatoryToCompliance(input.regulatoryFramework);

  const ironwatch = await ironwatchCrossReferenceHistoricalEvidence({
    tenantCompanyId: companyId,
    justification: impactJustification,
    controlId,
  });
  const ironwatchMatched = ironwatch.matched;
  const shadowDissent = ironwatch.shadowDissent;
  const shadowDissentAudit = ironwatch.shadowDissentAuditInconsistency;
  const shadowDissentLogistics = ironwatch.shadowDissentLogistics;

  const agent13Attestation = await getIronwatchAgent13Attestation();
  const ironwatchMatchMessage = await getIronwatchMatchMessage();

  const isDefenseTenant = industry === "Defense";
  const regulatoryShieldBadge = isDefenseTenant ? DEFENSE_REGULATORY_SHIELD_BADGE_LABEL : null;

  const aleSeed =
    companyRow?.tenant?.ale_baseline != null && companyRow.tenant.ale_baseline > 0n
      ? companyRow.tenant.ale_baseline
      : 50_000_000n;

  const aleComputation = computeSentinelFinancialRiskCents({
    aleBaselineCents: aleSeed,
    industryTrimmed: industry,
  });

  const mappedControls = [controlId];
  if (regulatoryShieldBadge) mappedControls.push(regulatoryShieldBadge);

  const t0 = Date.now();
  const forensicPath = {
    agent5: {
      agentId: 5,
      phase: "Ingestion",
      signedAt: new Date(t0).toISOString(),
    },
    agent6: {
      agentId: 6,
      phase: "Elevation",
      signedAt: new Date(t0 + 1000).toISOString(),
    },
    agent13: {
      agentId: 13,
      phase: "Shredding",
      signedAt: new Date(t0 + 2000).toISOString(),
    },
  };

  const submittedAt = new Date().toISOString();
  const dissentResolution: Prisma.InputJsonValue = {
    resolvedAt: submittedAt,
    productOwnerProfileName: profileDisplayName,
    shadowDissentActive: shadowDissent,
    verificationMethod: "PO_OR_CISO_PROFILE_ATTESTATION",
  };

  const sentinelInterviewCore = {
    regulatoryFramework: input.regulatoryFramework,
    controlId,
    systemOwner,
    impactJustification,
    sourceDocumentHashSha256: sourceHash.toLowerCase(),
    pageReference,
    agentInstruction: input.agentInstruction?.trim() || undefined,
    submittedAt,
    ironwatchHistoricalCrossReference: ironwatchMatched,
    ironwatchVectorRecallScore: ironwatch.vectorRecallScore,
    ironwatchSemanticDistance: ironwatch.semanticDistance,
    ironwatchLowConfidenceSemanticDrift: ironwatch.lowConfidenceSemanticDrift,
    ironwatchSignature: agent13Attestation,
    shadowDissent,
    shadowDissentLogistics,
    shadowDissentAuditInconsistency: shadowDissentAudit,
    shadowDissentSummary: shadowDissent ? ironwatch.shadowDissentSummary : undefined,
    historicalContextSnippet: ironwatch.historicalContextSnippet || undefined,
  };

  const ironwatchDirective =
    shadowDissentAudit && shadowDissentLogistics
      ? "SHADOW_DISSENT_COMBINED"
      : shadowDissentAudit
        ? "SHADOW_DISSENT_AUDIT"
        : shadowDissent
          ? "SHADOW_DISSENT"
          : "PRIMARY_DIRECTIVE_ALIGNED";

  const reasoningEscalationLogic = shadowDissentAudit
    ? "IRONWATCH_SHADOW_DISSENT_AUDIT_INCONSISTENCY"
    : shadowDissent
      ? "IRONWATCH_SHADOW_DISSENT_LOGIC_ANOMALY"
      : "IRONWATCH_HISTORICAL_BASELINE_ATTESTATION";

  const forensicReasoningBlock: Prisma.InputJsonValue = {
    version: 1,
    regulatoryAnalysis: {
      agentId: 5,
      role: "Ironscribe",
      regulatoryFramework: input.regulatoryFramework,
      controlId,
      impactSummary: impactJustification.slice(0, 4000),
      sourceDocumentHashSha256: sourceHash.toLowerCase(),
      pageReference,
      citationGate: "SHA256_PAGE_REF_REQUIRED",
      verifiedAt: forensicPath.agent5.signedAt,
    },
    dissentingOpinion: {
      agentId: 13,
      role: "Ironwatch",
      directive: ironwatchDirective,
      hybridRetrievalScore: ironwatch.vectorRecallScore,
      semanticDistance: ironwatch.semanticDistance,
      lowConfidenceSemanticDrift: ironwatch.lowConfidenceSemanticDrift,
      historicalCrossReference: ironwatchMatched,
      shadowDissent,
      shadowDissentAuditInconsistency: shadowDissentAudit,
      shadowDissentLogistics,
      rationale: shadowDissent ? ironwatch.shadowDissentSummary : agent13Attestation,
      historicalContextSnippet: ironwatch.historicalContextSnippet || undefined,
    },
  };

  const forensicLedgerBundle: Prisma.InputJsonValue = {
    version: 1,
    engine: "postgres18_jsonb_forensic_ledger",
    sealedAt: submittedAt,
    agentReasoning: forensicReasoningBlock,
    humanAttestation: {
      profileCanonicalName: profileDisplayName,
      operatorUserId,
      verificationMethod: "PO_OR_CISO_PROFILE_ATTESTATION",
      productOwnerSignatureCaptured: true,
    },
  };

  const draftIngestionPatch: Prisma.InputJsonValue = {
    sentinelGrcInterview: {
      ...sentinelInterviewCore,
      lifecyclePhase: "DRAFT_HYPOTHESIS",
    },
    regulatoryShieldBadge: regulatoryShieldBadge ?? undefined,
    forensicPath,
    isDeepMonitoring: true,
    governanceMode: "SENTINEL_GRC_INTERVIEW",
    governanceLifecyclePhase: "DRAFT_HYPOTHESIS",
  };

  const threat = await prisma.$transaction(async (tx) => {
    const draft = await tx.riskEvent.create({
      data: {
        title: `Sentinel GRC · ${controlId} (${input.regulatoryFramework})`,
        sourceAgent: "SENTINEL_GRC_INTERVIEW",
        source: SimThreatSource.HUMAN_SENTINEL,
        status: ThreatState.IDENTIFIED,
        severity: "HIGH",
        score: 88,
        priority_score: 92,
        targetEntity: companyRow?.name ?? "Enterprise Asset",
        tenantCompanyId: companyId,
        tenantId: companyRow.tenantId,
        threatVelocity: 1.25,
        complianceFramework,
        mappedControls,
        monitoringExpiry: null,
        assigneeId: systemOwner,
        aiReport: impactJustification,
        financialRisk_cents: aleComputation.governedImpactCents,
        baseImpactCents: aleComputation.baseImpactCents,
        governanceImpactMultiplier: aleComputation.governanceImpactMultiplierBps,
        governanceHash: null,
        ingestionDetails: draftIngestionPatch,
      },
      select: { id: true },
    });

    const baseGovernanceSeal = computeGovernanceSealHash({
      riskId: draft.id,
      cisoSignature: digitalSignature,
      timestampIso: submittedAt,
    });

    const forensicSeal: Prisma.InputJsonValue = {
      riskId: draft.id,
      productOwnerSignature: digitalSignature,
      profileCanonicalName: profileDisplayName,
      operatorUserId,
      signedAt: submittedAt,
      verificationMethod: "PO_OR_CISO_PROFILE_ATTESTATION",
      shadowDissentOverridden: shadowDissent,
      dissentResolutionAt: submittedAt,
      governanceHashSha256: baseGovernanceSeal,
      sealAlgorithm: "SHA-256:v1:cisoName|timestampIso|riskId",
      agentReasoning: forensicReasoningBlock,
      forensicPath,
      dissentResolution,
    };

    await tx.reasoningLog.create({
      data: {
        threatId: draft.id,
        agentName: "Ironwatch",
        targetAsset: controlId,
        escalationLogic: reasoningEscalationLogic,
        plan: {
          forensicReasoningBlock,
          agentId: 13,
          phase: shadowDissent ? "SHADOW_DISSENT" : "HISTORICAL_CROSS_REFERENCE",
          matchedPriorEvidence: ironwatchMatched,
          vectorRecallScore: ironwatch.vectorRecallScore,
          semanticDistance: ironwatch.semanticDistance,
          lowConfidenceSemanticDrift: ironwatch.lowConfidenceSemanticDrift,
          forensicPath,
        } satisfies Prisma.InputJsonValue,
        reasoning: shadowDissent ? ironwatch.shadowDissentSummary : agent13Attestation,
        confidence: shadowDissent ? 0.72 : ironwatchMatched ? 0.94 : 0.88,
        isCorrection: shadowDissent,
        operationalMode: "HYBRID",
      },
    });

    const forensicReasoningLog: FlemmingForensicReasoningLogV1 = {
      version: 1,
      protocol: "FLEMMING_POSTGRES18",
      postgres18LedgerTable: "SimThreatEvent",
      postgres18ExactQuery: buildFlemmingPostgres18ForensicPlaybackQuery(draft.id, companyId),
      agent5IronscribeCitation: {
        sourceDocumentHashSha256: sourceHash.toLowerCase(),
        pageReference,
      },
      agent3IrontrustDeterministic: {
        formulaExplanation: aleComputation.formulaExplanation,
        baseImpactCentsDecimal: aleComputation.baseImpactCents.toString(),
        governanceImpactMultiplierBpsDecimal: aleComputation.governanceImpactMultiplierBps.toString(),
        governedImpactCentsDecimal: aleComputation.governedImpactCents.toString(),
      },
      ironwatchAgent13: {
        semanticDistance: ironwatch.semanticDistance,
        vectorRecallScore: ironwatch.vectorRecallScore,
        lowConfidenceSemanticDrift: ironwatch.lowConfidenceSemanticDrift,
      },
      capturedAt: submittedAt,
    };

    const finalIngestionPatch: Prisma.InputJsonValue = {
      sentinelGrcInterview: {
        ...sentinelInterviewCore,
        lifecyclePhase: "SEALED_ACTIVE",
      },
      regulatoryShieldBadge: regulatoryShieldBadge ?? undefined,
      forensicPath,
      isDeepMonitoring: true,
      governanceMode: "SENTINEL_GRC_INTERVIEW",
      governanceLifecyclePhase: "SEALED_ACTIVE",
      dissentResolution,
      forensicLedgerBundle,
      forensic_reasoning_log: forensicReasoningLog as Prisma.InputJsonValue,
    };

    const ingestionJsonUtf8 = JSON.stringify(finalIngestionPatch);
    const governance_hash = mergeGovernanceHashWithIngestionRecord({
      baseSealHash: baseGovernanceSeal,
      ingestionJsonUtf8,
    });

    const forensicSealFinal: Prisma.InputJsonValue = {
      ...(forensicSeal as Record<string, unknown>),
      governanceHashSha256: governance_hash,
      sealAlgorithm: "SHA-256:v2:baseSeal|ingestionJsonUtf8",
    };

    await tx.riskEvent.updateMany({
      where: { id: draft.id },
      data: {
        status: ThreatState.CONFIRMED,
        forensicSeal: forensicSealFinal,
        governanceHash: governance_hash,
        ingestionDetails: finalIngestionPatch,
      },
    });

    await tx.forensicSealLedger.create({
      data: {
        tenantId: companyRow.tenantId,
        id: draft.id,
        riskEventId: draft.id,
        governanceHash: governance_hash,
        sealJson: forensicSealFinal,
      },
    });

    await tx.simulationDiagnosticLog.create({
      data: {
        tenantUuid: companyRow.tenantId,
        simThreatId: draft.id,
        action: GRC_GOLD_GOVERNANCE_BLOCK_ACTION,
        payload: {
          version: 2,
          threatId: draft.id,
          agent5Ironscribe: {
            agentId: 5,
            role: "Ironscribe",
            verifiedAt: forensicPath.agent5.signedAt,
            phase: "INGESTION_VERIFICATION",
          },
          agent13Ironwatch: {
            agentId: 13,
            role: "Ironwatch",
            memoryMatch: ironwatchMatched,
            vectorRecallScore: ironwatch.vectorRecallScore,
            hybridRetrieval: "KEYWORD_PLUS_LEXICAL_VECTOR",
            shadowDissent,
            shadowDissentAuditInconsistency: shadowDissentAudit,
          },
          dissentResolution: {
            resolvedAt: submittedAt,
            shadowDissentActive: shadowDissent,
            productOwnerProfileName: profileDisplayName,
          },
          sealedAt: submittedAt,
          engine: "postgres_transactional_governance_block",
        } satisfies Prisma.InputJsonValue,
        operatorId: profileDisplayName.length > 120 ? profileDisplayName.slice(0, 120) : profileDisplayName,
      },
    });

    return draft;
  });

  if (shadowDissent) {
    await recordResilienceIntelStreamLine(
      `⚠️ [IRONWATCH] | ${ironwatch.shadowDissentSummary}`,
      threat.id,
    );
  } else if (ironwatchMatched) {
    await recordResilienceIntelStreamLine(ironwatchMatchMessage, threat.id);
  }

  revalidatePath("/");

  return {
    ok: true,
    threatId: threat.id,
    ironwatchMatched,
    ironwatchSidebarAlert: shadowDissent
      ? ironwatch.shadowDissentSummary
      : ironwatchMatched
        ? ironwatchMatchMessage
        : null,
    regulatoryShieldBadge,
    shadowDissent,
  };
}

/**
 * Reasoning Playback — `forensic_reasoning_log`, column `forensic_seal` (JSONB), and `governance_hash`.
 */
export async function getForensicReasoningPlayback(threatId: string): Promise<GovernancePlaybackResult> {
  const tid = threatId?.trim();
  if (!tid) return { ok: false, error: "Threat id is required." };

  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) {
    return { ok: false, error: "Missing company context for tenant isolation." };
  }

  const row = await prisma.riskEvent.findFirst({
    where: { id: tid, tenantCompanyId: companyId },
    select: { ingestionDetails: true, forensicSeal: true, governanceHash: true },
  });

  if (!row?.ingestionDetails || typeof row.ingestionDetails !== "object" || Array.isArray(row.ingestionDetails)) {
    return { ok: false, error: "No ingestion ledger found for this threat." };
  }

  const details = row.ingestionDetails as Record<string, unknown>;
  const rawLog = details.forensic_reasoning_log;
  const log =
    rawLog && typeof rawLog === "object" && !Array.isArray(rawLog)
      ? (rawLog as FlemmingForensicReasoningLogV1)
      : null;

  const seal = row.forensicSeal;
  const forensicSeal =
    seal && typeof seal === "object" && !Array.isArray(seal) ? (seal as Record<string, unknown>) : null;

  return {
    ok: true,
    log,
    forensicSeal,
    governanceHash: row.governanceHash ?? null,
  };
}

export type GovernanceIntegrityOutcome = "match" | "mismatch" | "no_seal";

/**
 * Heartbeat: SHA-256(riskId, CISO/PO signature, seal timestamp) vs `governance_hash`.
 * `no_seal` — not a governed ingest (neutral); `mismatch` — tamper or incomplete seal.
 */
export async function verifyGovernanceIntegrity(
  threatId: string,
): Promise<{ ok: true; outcome: GovernanceIntegrityOutcome } | { ok: false; error: string }> {
  const tid = threatId?.trim();
  if (!tid) return { ok: false, error: "Threat id is required." };

  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) {
    return { ok: false, error: "Missing company context for tenant isolation." };
  }

  const row = await prisma.riskEvent.findFirst({
    where: { id: tid, tenantCompanyId: companyId },
    select: { id: true, governanceHash: true, forensicSeal: true, ingestionDetails: true },
  });

  if (!row) return { ok: false, error: "Threat not found." };
  if (!row.governanceHash) {
    return { ok: true, outcome: "no_seal" };
  }

  const seal = row.forensicSeal;
  if (seal == null || typeof seal !== "object" || Array.isArray(seal)) {
    return { ok: true, outcome: "mismatch" };
  }
  const s = seal as Record<string, unknown>;
  const sig = typeof s.productOwnerSignature === "string" ? s.productOwnerSignature : null;
  const ts = typeof s.signedAt === "string" ? s.signedAt : null;
  if (!sig || !ts) {
    return { ok: true, outcome: "mismatch" };
  }

  const baseExpected = computeGovernanceSealHash({
    riskId: row.id,
    cisoSignature: sig,
    timestampIso: ts,
  });
  let mergedExpected = baseExpected;
  if (row.ingestionDetails != null && typeof row.ingestionDetails === "object" && !Array.isArray(row.ingestionDetails)) {
    mergedExpected = mergeGovernanceHashWithIngestionRecord({
      baseSealHash: baseExpected,
      ingestionJsonUtf8: JSON.stringify(row.ingestionDetails),
    });
  }
  const ok =
    row.governanceHash === mergedExpected ||
    row.governanceHash === baseExpected ||
    (typeof s.governanceHashSha256 === "string" && s.governanceHashSha256 === row.governanceHash);
  return { ok: true, outcome: ok ? "match" : "mismatch" };
}

export type AuditorRiskLedgerRow = {
  id: string;
  title: string;
  mappedControls: string[];
  governanceHash: string | null;
  digitalSignature: string | null;
  signedAt: string | null;
};

/** Auditor view — tabular evidence strip (tenant-scoped shadow RiskEvent ledger). */
export async function listAuditorRiskLedger(): Promise<
  { ok: true; rows: AuditorRiskLedgerRow[] } | { ok: false; error: string }
> {
  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) {
    return { ok: false, error: "Missing company context for tenant isolation." };
  }

  const rows = await prisma.riskEvent.findMany({
    where: { tenantCompanyId: companyId },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      title: true,
      mappedControls: true,
      governanceHash: true,
      forensicSeal: true,
    },
  });

  const mapped: AuditorRiskLedgerRow[] = rows.map((r) => {
    let digitalSignature: string | null = null;
    let signedAt: string | null = null;
    if (r.forensicSeal != null && typeof r.forensicSeal === "object" && !Array.isArray(r.forensicSeal)) {
      const fs = r.forensicSeal as Record<string, unknown>;
      digitalSignature = typeof fs.productOwnerSignature === "string" ? fs.productOwnerSignature : null;
      signedAt = typeof fs.signedAt === "string" ? fs.signedAt : null;
    }
    return {
      id: r.id,
      title: r.title,
      mappedControls: r.mappedControls ?? [],
      governanceHash: r.governanceHash ?? null,
      digitalSignature,
      signedAt,
    };
  });

  return { ok: true, rows: mapped };
}

export async function ingestGovernedRiskFormAction(
  _prev: IngestGovernedRiskFormState,
  formData: FormData,
): Promise<IngestGovernedRiskFormState> {
  const fw = formData.get("regulatoryFramework");
  const regulatoryFramework =
    fw === "CMMC_L3" || fw === "ITAR" || fw === "HIPAA" ? fw : null;
  if (!regulatoryFramework) {
    return { status: "error", error: "Regulatory framework is required." };
  }

  const controlId = String(formData.get("controlId") ?? "").trim();
  const systemOwner = String(formData.get("systemOwner") ?? "").trim();
  const impactJustification = String(formData.get("impactJustification") ?? "").trim();
  const sourceDocumentHashSha256 = String(formData.get("sourceDocumentHashSha256") ?? "").trim();
  const pageReference = String(formData.get("pageReference") ?? "").trim();
  const digitalSignature = String(formData.get("digitalSignature") ?? "").trim();
  const agentInstructionRaw = formData.get("agentInstruction");
  const agentInstruction =
    typeof agentInstructionRaw === "string" && agentInstructionRaw.trim()
      ? agentInstructionRaw.trim()
      : undefined;

  const res = await ingestGovernedRisk({
    regulatoryFramework,
    controlId,
    systemOwner,
    impactJustification,
    sourceDocumentHashSha256,
    pageReference,
    digitalSignature,
    agentInstruction,
  });

  if (!res.ok) {
    return { status: "error", error: res.error };
  }
  return {
    status: "success",
    threatId: res.threatId,
    ironwatchSidebarAlert: res.ironwatchSidebarAlert ?? null,
    regulatoryShieldBadge: res.regulatoryShieldBadge ?? null,
    shadowDissent: res.shadowDissent,
  };
}

/** @deprecated Use `ingestGovernedRisk`. */
export async function submitSentinelGrcInterview(
  input: IngestGovernedRiskInput,
): Promise<IngestGovernedRiskResult> {
  return ingestGovernedRisk(input);
}
