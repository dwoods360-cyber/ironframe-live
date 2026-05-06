"use server";

import { ThreatState, type Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { runHybridRetrievalSession } from "@/lib/db/hybridRetrievalSession";
import {
  IRONWATCH_CLOSED_AUDIT_GAP_RE,
  IRONWATCH_HISTORICAL_FLEXIBILITY_RE,
  IRONWATCH_MODERN_REGULATORY_STRICT_RE,
  IRONWATCH_SEMANTIC_DRIFT_THRESHOLD,
  IRONWATCH_SHADOW_DISSENT_AUDIT_LABEL,
  IRONWATCH_SHADOW_DISSENT_LABEL,
  matchesIronwatchHistoricalMemoryKeywords,
} from "@/lib/constants/grcGovernance";
import { computeHybridFlemmingRecall } from "@/app/utils/ironwatchHybridRetrieval";
import { probeShadowDissentWithAgent13CosineKnn } from "@/app/actions/agentActions";

const GRC_GOLD_GOVERNANCE_BLOCK_ACTION = "GRC_GOLD_GOVERNANCE_BLOCK";

type IronwatchDb = Prisma.TransactionClient | typeof prisma;

function controlIdsLikelySame(a: string, b: string): boolean {
  const x = a.trim().toUpperCase();
  const y = b.trim().toUpperCase();
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.length >= 3 && y.includes(x)) return true;
  if (y.length >= 3 && x.includes(y)) return true;
  return false;
}

/**
 * Cross-audit continuity: prior CLOSED_ARCHIVED risks, AuditLog dispositions, and sealed governance
 * diagnostics for the same control imply forensic finality — re-ingestion is an audit inconsistency.
 */
export async function evaluateAuditContinuityDissent(
  params: {
    tenantCompanyId: bigint;
    tenantUuid: string;
    controlId: string;
    justification: string;
  },
  db: IronwatchDb = prisma,
): Promise<{ flagged: boolean; summary: string; snippet: string }> {
  void params.justification;
  const control = params.controlId.trim();
  if (!control) return { flagged: false, summary: "", snippet: "" };

  const closedRisks = await db.riskEvent.findMany({
    where: {
      tenantCompanyId: params.tenantCompanyId,
      status: ThreatState.CLOSED_ARCHIVED,
    },
    select: { title: true, mappedControls: true },
    take: 120,
  });

  for (const r of closedRisks) {
    const mappedHit = r.mappedControls.some((c) => controlIdsLikelySame(control, c));
    const titleHit = r.title.toUpperCase().includes(control.toUpperCase());
    if (mappedHit || titleHit) {
      return {
        flagged: true,
        summary: `${IRONWATCH_SHADOW_DISSENT_AUDIT_LABEL} — SimThreatEvent history shows control ${control} reached CLOSED_ARCHIVED; this ingestion contradicts that closed audit gap unless formally reopened.`,
        snippet: r.title.slice(0, 280),
      };
    }
  }

  const auditRows = await db.auditLog.findMany({
    where: { governance_tenant_uuid: params.tenantUuid },
    select: { action: true, justification: true },
    orderBy: { createdAt: "desc" },
    take: 250,
  });

  const auditCorpus = auditRows
    .map((row) => `${row.action} ${row.justification ?? ""}`.trim())
    .filter(Boolean);
  if (auditCorpus.length > 0) {
    const hybridAudit = computeHybridFlemmingRecall(
      `${control} ${params.justification}`.trim(),
      auditCorpus,
      0.18,
      0.26,
    );
    if (hybridAudit.matched) {
      const sealedBlobs = auditCorpus.filter((b) => IRONWATCH_CLOSED_AUDIT_GAP_RE.test(b));
      if (sealedBlobs.length > 0) {
        const mentionsControl = sealedBlobs.some((b) => b.toLowerCase().includes(control.toLowerCase()));
        if (mentionsControl) {
          return {
            flagged: true,
            summary: `${IRONWATCH_SHADOW_DISSENT_AUDIT_LABEL} — Hybrid retrieval over AuditLog surfaced a sealed / closed disposition alongside this control; new risk conflicts with prior audit finality.`,
            snippet: sealedBlobs[0].slice(0, 280),
          };
        }
      }
    }
  }

  for (const row of auditRows) {
    const blob = `${row.action} ${row.justification ?? ""}`;
    if (!blob.toLowerCase().includes(control.toLowerCase())) continue;
    if (!IRONWATCH_CLOSED_AUDIT_GAP_RE.test(blob)) continue;
    return {
      flagged: true,
      summary: `${IRONWATCH_SHADOW_DISSENT_AUDIT_LABEL} — AuditLog references control ${control} under a closed or sealed disposition; reconcile before accepting a new active deficiency.`,
      snippet: blob.slice(0, 280),
    };
  }

  const diags = await db.simulationDiagnosticLog.findMany({
    where: {
      tenantUuid: params.tenantUuid,
      action: GRC_GOLD_GOVERNANCE_BLOCK_ACTION,
    },
    select: { payload: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  for (const d of diags) {
    const raw = JSON.stringify(d.payload ?? {});
    if (!raw.toLowerCase().includes(control.toLowerCase())) continue;
    if (/\bsealed|dissentResolution|forensicSeal|governance\s*block/i.test(raw)) {
      return {
        flagged: true,
        summary: `${IRONWATCH_SHADOW_DISSENT_AUDIT_LABEL} — A sealed GRC governance diagnostic references this control; new ingestion conflicts with prior forensic ledger finality.`,
        snippet: raw.slice(0, 280),
      };
    }
  }

  return { flagged: false, summary: "", snippet: "" };
}

export type IronwatchHybridGovernanceScan = {
  matched: boolean;
  vectorRecallScore: number;
  semanticDistance: number;
  lowConfidenceSemanticDrift: boolean;
  shadowDissent: boolean;
  shadowDissentLogistics: boolean;
  shadowDissentAuditInconsistency: boolean;
  shadowDissentSummary: string;
  historicalContextSnippet: string;
};

function pushLogisticsContext(sink: string[], text: string, maxChars = 480): void {
  const t = text.trim();
  if (!t || !matchesIronwatchHistoricalMemoryKeywords(t)) return;
  sink.push(t.length > maxChars ? `${t.slice(0, maxChars)}…` : t);
}

function finalizeIronwatchScan(input: {
  matched: boolean;
  vectorRecallScore: number;
  justification: string;
  logisticsContextTexts: string[];
  semanticDistance?: number;
}): IronwatchHybridGovernanceScan {
  const strictModern = IRONWATCH_MODERN_REGULATORY_STRICT_RE.test(input.justification);
  const flexInHistory = input.logisticsContextTexts.some((t) => IRONWATCH_HISTORICAL_FLEXIBILITY_RE.test(t));
  const logisticsDissent =
    input.matched && input.logisticsContextTexts.length > 0 && strictModern && flexInHistory;
  const historicalContextSnippet = input.logisticsContextTexts[0] ?? "";
  const shadowDissentSummary = logisticsDissent
    ? `${IRONWATCH_SHADOW_DISSENT_LABEL} — Evidence vault or historical narrative suggests legacy operational flexibility (e.g., waiver or informal exception) while the current justification asserts strict regulatory posture. Product Owner or designated CISO attestation is required.`
    : "";
  const semanticDistance = input.semanticDistance ?? 0;
  const lowConfidenceSemanticDrift = semanticDistance > IRONWATCH_SEMANTIC_DRIFT_THRESHOLD;
  return {
    matched: input.matched,
    vectorRecallScore: input.vectorRecallScore,
    semanticDistance,
    lowConfidenceSemanticDrift,
    shadowDissent: logisticsDissent,
    shadowDissentLogistics: logisticsDissent,
    shadowDissentAuditInconsistency: false,
    shadowDissentSummary,
    historicalContextSnippet,
  };
}

async function mergeAuditContinuityIntoIronwatchScan(
  scan: IronwatchHybridGovernanceScan,
  ctx: { tenantCompanyId: bigint; tenantUuid: string | null; controlId: string; justification: string },
  tx: Prisma.TransactionClient,
): Promise<IronwatchHybridGovernanceScan> {
  if (!ctx.tenantUuid) return scan;
  const audit = await evaluateAuditContinuityDissent(
    {
      tenantCompanyId: ctx.tenantCompanyId,
      tenantUuid: ctx.tenantUuid,
      controlId: ctx.controlId,
      justification: ctx.justification,
    },
    tx,
  );
  if (!audit.flagged) return scan;
  const mergedDissent = scan.shadowDissent || audit.flagged;
  let summary = scan.shadowDissentSummary;
  if (audit.flagged && scan.shadowDissentLogistics) {
    summary = `${audit.summary} · ${scan.shadowDissentSummary}`;
  } else if (audit.flagged) {
    summary = audit.summary;
  }
  return {
    ...scan,
    shadowDissent: mergedDissent,
    shadowDissentAuditInconsistency: true,
    shadowDissentSummary: summary,
    historicalContextSnippet: audit.snippet || scan.historicalContextSnippet,
  };
}

export async function ironwatchCrossReferenceHistoricalEvidence(params: {
  tenantCompanyId: bigint;
  justification: string;
  controlId: string;
}): Promise<IronwatchHybridGovernanceScan> {
  const control = params.controlId.trim();
  const justification = params.justification.trim();
  const query = `${justification} ${control}`;
  const logisticsContextTexts: string[] = [];

  const companyRow = await prisma.company.findUnique({
    where: { id: params.tenantCompanyId },
    select: { tenantId: true },
  });
  const tenantUuid = companyRow?.tenantId ?? null;

  const auditCtx = {
    tenantCompanyId: params.tenantCompanyId,
    tenantUuid,
    controlId: control,
    justification,
  };

  return runHybridRetrievalSession(prisma, async (tx) => {
  if (matchesIronwatchHistoricalMemoryKeywords(query)) {
    pushLogisticsContext(logisticsContextTexts, query);
    return mergeAuditContinuityIntoIronwatchScan(
      finalizeIronwatchScan({
        matched: true,
        vectorRecallScore: 1,
        justification,
        logisticsContextTexts,
        semanticDistance: 0,
      }),
      auditCtx,
      tx,
    );
  }

  const corpus: string[] = [];

  if (companyRow?.tenantId) {
    const attachments = await tx.evidenceAttachment.findMany({
      where: { tenantId: companyRow.tenantId },
      select: { attachmentNote: true },
      orderBy: { createdAt: "desc" },
      take: 120,
    });
    for (const a of attachments) {
      const note = a.attachmentNote?.trim() ?? "";
      if (!note) continue;
      corpus.push(note);
      pushLogisticsContext(logisticsContextTexts, note);
      if (matchesIronwatchHistoricalMemoryKeywords(note)) {
        return mergeAuditContinuityIntoIronwatchScan(
          finalizeIronwatchScan({
            matched: true,
            vectorRecallScore: 1,
            justification,
            logisticsContextTexts,
            semanticDistance: 0,
          }),
          auditCtx,
          tx,
        );
      }
    }
  }

  const stopWords = new Set([
    "the",
    "and",
    "for",
    "that",
    "with",
    "this",
    "from",
    "risk",
    "mission",
    "when",
    "what",
    "have",
    "been",
  ]);
  const tokens = [
    ...justification
      .split(/\s+/)
      .map((w) => w.replace(/[^a-zA-Z0-9-]/g, ""))
      .filter((w) => w.length >= 4 && !stopWords.has(w.toLowerCase())),
    control,
  ]
    .filter(Boolean)
    .slice(0, 18);

  const needleLower = tokens.map((t) => t.toLowerCase());

  const rows = await tx.riskEvent.findMany({
    where: { tenantCompanyId: params.tenantCompanyId },
    select: {
      title: true,
      mappedControls: true,
      aiReport: true,
      ingestionDetails: true,
    },
    orderBy: { createdAt: "desc" },
    take: 140,
  });

  for (const row of rows) {
    const blobFull = `${row.title} ${row.mappedControls.join(" ")} ${String(row.aiReport ?? "")} ${JSON.stringify(row.ingestionDetails ?? {})}`;
    corpus.push(blobFull);
    pushLogisticsContext(logisticsContextTexts, blobFull);
    if (matchesIronwatchHistoricalMemoryKeywords(blobFull)) {
      return mergeAuditContinuityIntoIronwatchScan(
        finalizeIronwatchScan({
          matched: true,
          vectorRecallScore: 1,
          justification,
          logisticsContextTexts,
          semanticDistance: 0,
        }),
        auditCtx,
        tx,
      );
    }
    const blob = blobFull.toLowerCase();
    if (needleLower.some((n) => n.length >= 3 && blob.includes(n))) {
      return mergeAuditContinuityIntoIronwatchScan(
        finalizeIronwatchScan({
          matched: true,
          vectorRecallScore: 0.85,
          justification,
          logisticsContextTexts,
          semanticDistance: 0.15,
        }),
        auditCtx,
        tx,
      );
    }
  }

  const logRows = await tx.reasoningLog.findMany({
    where: { threat: { tenantCompanyId: params.tenantCompanyId } },
    select: { reasoning: true },
    orderBy: { createdAt: "desc" },
    take: 120,
  });

  for (const lr of logRows) {
    corpus.push(lr.reasoning);
    pushLogisticsContext(logisticsContextTexts, lr.reasoning);
    if (matchesIronwatchHistoricalMemoryKeywords(lr.reasoning)) {
      return mergeAuditContinuityIntoIronwatchScan(
        finalizeIronwatchScan({
          matched: true,
          vectorRecallScore: 1,
          justification,
          logisticsContextTexts,
          semanticDistance: 0,
        }),
        auditCtx,
        tx,
      );
    }
    const r = lr.reasoning.toLowerCase();
    if (needleLower.some((n) => n.length >= 3 && r.includes(n))) {
      return mergeAuditContinuityIntoIronwatchScan(
        finalizeIronwatchScan({
          matched: true,
          vectorRecallScore: 0.85,
          justification,
          logisticsContextTexts,
          semanticDistance: 0.15,
        }),
        auditCtx,
        tx,
      );
    }
  }

  let pgVectorBestSimilarity = 0;
  try {
    const { matches } = await probeShadowDissentWithAgent13CosineKnn({
      tenantCompanyId: params.tenantCompanyId,
      queryUtf8: query,
      limit: 12,
    });
    if (matches.length > 0) {
      pgVectorBestSimilarity = Math.max(...matches.map((m) => m.similarity));
    }
  } catch {
    /* pgvector table / extension optional in some environments */
  }

  const hybrid = computeHybridFlemmingRecall(query, corpus, 0.2, 0.28);
  const fusedRecall = Math.max(hybrid.vectorRecallScore, pgVectorBestSimilarity);
  const fusedSemantic =
    pgVectorBestSimilarity > hybrid.vectorRecallScore
      ? 1 - pgVectorBestSimilarity
      : hybrid.semanticDistance;
  if (hybrid.matched) {
    for (const doc of corpus) {
      if (matchesIronwatchHistoricalMemoryKeywords(doc)) pushLogisticsContext(logisticsContextTexts, doc);
    }
  }
  return mergeAuditContinuityIntoIronwatchScan(
    finalizeIronwatchScan({
      matched: hybrid.matched,
      vectorRecallScore: fusedRecall,
      justification,
      logisticsContextTexts,
      semanticDistance: fusedSemantic,
    }),
    auditCtx,
    tx,
  );
  });
}
