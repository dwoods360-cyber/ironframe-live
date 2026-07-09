import "server-only";

import { createHash } from "crypto";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  mergeDriftAlerts,
  readComplianceDriftState,
  writeComplianceDriftState,
} from "@/app/lib/complianceDriftState";
import {
  readRegulatoryIngestionState,
  writeRegulatoryIngestionState,
} from "@/app/lib/regulatoryIngestionState";
import { getTasMdAbsolutePath } from "@/app/lib/tasMdIntegrity";
import { readFileSync } from "fs";
import { analyzeRegulatoryGap } from "@/app/services/irontallyGapAnalysis";
import { notifyCisoCriticalDrift } from "@/app/services/regulatoryCisoNotify";
import { runShadowAuditForRegulation } from "@/app/services/regulatoryShadowAudit";
import { recalculateSystemMaturityScore } from "@/app/services/governanceScoring";
import { GOVERNANCE_EXPOSURE_ENVELOPE_BILLIONS } from "@/app/utils/financialRisk";
import type {
  ComparisonDiffRow,
  IngestedRegulationRecord,
  RequirementBlock,
  RegulatoryComparisonSnapshot,
} from "@/app/types/regulatoryIngestion";
import { resolveGeminiFlashModel } from "@/app/config/geminiModels";

const AMENDMENT_MODEL = resolveGeminiFlashModel(process.env.GEMINI_IRONSIGHT_MODEL);

export type IngestRegulationInput = {
  source: IngestedRegulationRecord["source"];
  authority: string;
  title: string;
  sourceUrl: string;
  localPath: string | null;
  sha256: string;
  mimeType: string;
  blocks: RequirementBlock[];
};

function buildDiffRows(blocks: RequirementBlock[], _tasMd: string): ComparisonDiffRow[] {
  return blocks.map((block) => {
    const { alert, matchedObligation } = analyzeRegulatoryGap({
      source: block.authority,
      sourceUrl: "",
      title: block.title,
      description: block.body,
      link: block.sectionRef,
      publishedAt: block.effectiveDate ?? undefined,
    });

    const gap = alert?.isDriftDetected ?? !matchedObligation;
    return {
      requirementId: block.blockId,
      authority: block.authority,
      requirementTitle: block.title,
      requirementText: block.body.slice(0, 500),
      tasSection: alert?.tasSection ?? matchedObligation?.tasSection ?? null,
      tasDirectiveLabels: matchedObligation
        ? [matchedObligation.agentLabel]
        : alert
          ? [alert.agentLabel]
          : [],
      status: gap ? "GAP" : "ALIGNED",
      diffTone: gap ? "red" : "green",
      gapReason: alert?.lawSummary ?? (gap ? "No TAS directive covers this requirement block." : null),
    };
  });
}

async function draftAmendmentFromRegulation(
  block: RequirementBlock,
  tasSection: string,
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!apiKey) return null;

  let tasExcerpt = "";
  try {
    tasExcerpt = readFileSync(getTasMdAbsolutePath(), "utf8").slice(0, 6000);
  } catch {
    /* ignore */
  }

  const google = createGoogleGenerativeAI({ apiKey });
  try {
    const { text } = await generateText({
      model: google(AMENDMENT_MODEL),
      prompt: `Irontally — 1-click TAS amendment for Section ${tasSection} from new regulation:\n${block.body.slice(0, 3000)}\n\nPreserve $${GOVERNANCE_EXPOSURE_ENVELOPE_BILLIONS}B posture.\n\nTAS excerpt:\n${tasExcerpt}`,
      maxOutputTokens: 2048,
    });
    return text.trim();
  } catch {
    return null;
  }
}

/**
 * Full pipeline: gap analysis → comparison snapshot → shadow audit → CISO alert → maturity recalc.
 */
export async function processIngestedRegulation(input: IngestRegulationInput): Promise<{
  regulationId: string;
  alertIds: string[];
  snapshot: RegulatoryComparisonSnapshot;
}> {
  const regulationId = input.sha256.slice(0, 16);
  const record: IngestedRegulationRecord = {
    id: regulationId,
    ingestedAt: new Date().toISOString(),
    source: input.source,
    authority: input.authority,
    title: input.title,
    sourceUrl: input.sourceUrl,
    localPath: input.localPath,
    sha256: input.sha256,
    mimeType: input.mimeType,
    blocks: input.blocks,
    ironscribeOperator: "IRONSCRIBE_AGENT_5",
  };

  let tasMd = "";
  try {
    tasMd = readFileSync(getTasMdAbsolutePath(), "utf8");
  } catch {
    tasMd = "";
  }

  const diffRows = buildDiffRows(input.blocks, tasMd);
  const gapCount = diffRows.filter((r) => r.status === "GAP").length;
  const snapshot: RegulatoryComparisonSnapshot = {
    snapshotId: createHash("sha256").update(`${regulationId}:${Date.now()}`, "utf8").digest("hex").slice(0, 12),
    generatedAt: new Date().toISOString(),
    regulationId,
    diffRows,
    gapCount,
    alignedCount: diffRows.length - gapCount,
  };

  const shadow = runShadowAuditForRegulation({
    regulationId,
    blocks: input.blocks,
  });

  const feedItems = input.blocks.map((b) => ({
    source: input.authority,
    sourceUrl: input.sourceUrl,
    title: b.title,
    description: b.body,
    link: `${input.sourceUrl}#${b.blockId}`,
    publishedAt: b.effectiveDate ?? undefined,
  }));

  const alerts = feedItems
    .map((item) => analyzeRegulatoryGap(item).alert)
    .filter((a): a is NonNullable<typeof a> => a != null);

  if (shadow.wouldFailChaosSimulation) {
    const extra = analyzeRegulatoryGap({
      source: input.authority,
      sourceUrl: input.sourceUrl,
      title: shadow.narrative,
      description: shadow.narrative,
      link: input.sourceUrl,
    }).alert;
    if (extra) alerts.push({ ...extra, severity: "CRITICAL" as const });
  }

  const driftPrev = await readComplianceDriftState();
  const merged = mergeDriftAlerts(driftPrev.alerts, alerts);

  const ingestPrev = await readRegulatoryIngestionState();
  const cisoNotifications = [...ingestPrev.cisoNotifications];

  const criticalAlerts = alerts.filter((a) => a.severity === "CRITICAL" && a.isDriftDetected);
  const amendmentByAlert = new Map<string, string | null>();

  for (const alert of criticalAlerts) {
    const block = input.blocks.find((b) => alert.lawExcerpt.includes(b.body.slice(0, 80))) ?? input.blocks[0];
    const amendment = block ? await draftAmendmentFromRegulation(block, alert.tasSection) : null;
    amendmentByAlert.set(alert.id, amendment);
    const note = await notifyCisoCriticalDrift({
      alert,
      regulationId,
      amendmentPreview: amendment,
    });
    cisoNotifications.unshift(note);
  }

  await writeComplianceDriftState({
    ...driftPrev,
    lastPollAt: new Date().toISOString(),
    alerts: merged.map((a) => {
      const preview = amendmentByAlert.get(a.id);
      return preview ? { ...a, amendmentDraftId: a.amendmentDraftId ?? `auto-${a.id.slice(0, 8)}` } : a;
    }),
    pollStats: {
      ...driftPrev.pollStats,
      newAlerts: alerts.length,
    },
  });

  await writeRegulatoryIngestionState({
    ...ingestPrev,
    regulations: [record, ...ingestPrev.regulations],
    latestComparison: snapshot,
    cisoNotifications,
    lastScoutRunAt: new Date().toISOString(),
  });

  await recalculateSystemMaturityScore({ trigger: "REGULATORY_INGESTION_PIPELINE" });

  return {
    regulationId,
    alertIds: alerts.map((a) => a.id),
    snapshot,
  };
}

export async function getLatestComparisonWithDiffs(): Promise<RegulatoryComparisonSnapshot | null> {
  const state = await readRegulatoryIngestionState();
  return state.latestComparison;
}
