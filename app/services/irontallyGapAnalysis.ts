import { createHash } from "crypto";
import {
  extractRequiredDaysFromRegulation,
  TAS_CONSTITUTIONAL_OBLIGATIONS,
  type TasConstitutionalObligation,
} from "@/app/config/tasConstitutionalObligations";
import { tasKeywordMatches } from "@/app/config/tasRegulatoryKeywords";
import type { RegulatoryDriftAlert, RegulatoryDriftSeverity } from "@/app/types/complianceDrift";
import { stableRegulatoryItemId } from "@/app/lib/complianceDriftState";

export type RegulatoryFeedItem = {
  source: string;
  sourceUrl: string;
  title: string;
  description: string;
  publishedAt?: string;
  link: string;
};

export type GapAnalysisResult = {
  alert: RegulatoryDriftAlert | null;
  matchedObligation: TasConstitutionalObligation | null;
};

function inferSeverity(params: {
  requiredDays: number | null;
  constitutionalDays: number | null;
  daysToDeadline: number;
  driftGapDays: number;
}): RegulatoryDriftSeverity {
  const { requiredDays, constitutionalDays, daysToDeadline, driftGapDays } = params;
  if (requiredDays != null && constitutionalDays != null && driftGapDays >= 15) {
    return "CRITICAL";
  }
  if (daysToDeadline <= 30 || driftGapDays >= 10) return "CRITICAL";
  if (daysToDeadline <= 90 || driftGapDays >= 5) return "HIGH";
  if (driftGapDays > 0) return "MEDIUM";
  return "LOW";
}

function buildPulseMessage(alert: {
  tasSection: string;
  tasSectionTitle: string;
  lawSummary: string;
  deadline: string;
  authority: string;
}): string {
  const monthYear = new Date(alert.deadline).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
  return (
    `TAS DRIFT DETECTED: Section ${alert.tasSection} (${alert.tasSectionTitle}) is non-compliant with ` +
    `upcoming ${monthYear} ${alert.authority} rule — ${alert.lawSummary}`
  );
}

function constitutionalNotificationDays(obligation: TasConstitutionalObligation): number | null {
  if (obligation.id === "incident_response_notification") return 45;
  return obligation.impliedRequiredDays ?? null;
}

/**
 * Irontally (Agent 19) — semantic comparison of external regulation vs TAS.md constitutional posture.
 */
export function analyzeRegulatoryGap(item: RegulatoryFeedItem): GapAnalysisResult {
  const corpus = `${item.title}\n${item.description}`;
  const keywordHits = tasKeywordMatches(corpus);
  if (keywordHits.length === 0) {
    return { alert: null, matchedObligation: null };
  }

  let obligation: TasConstitutionalObligation | null = null;
  for (const o of TAS_CONSTITUTIONAL_OBLIGATIONS) {
    if (o.regulationTriggers.some((re) => re.test(corpus))) {
      obligation = o;
      break;
    }
  }
  if (!obligation) {
    obligation = TAS_CONSTITUTIONAL_OBLIGATIONS[0];
  }

  const requiredDays = extractRequiredDaysFromRegulation(corpus) ?? obligation.impliedRequiredDays ?? 30;
  const constitutionalDays = constitutionalNotificationDays(obligation);
  const driftGapDays =
    constitutionalDays != null && requiredDays < constitutionalDays
      ? constitutionalDays - requiredDays
      : 0;

  const isDriftDetected = driftGapDays > 0 || keywordHits.some((k) => /breach|notification|sb24/i.test(k));

  const published = item.publishedAt ? Date.parse(item.publishedAt) : Date.now();
  const deadlineMs = published + 365 * 24 * 60 * 60 * 1000;
  const deadline =
    obligation.id === "incident_response_notification"
      ? "2026-06-01T00:00:00.000Z"
      : new Date(deadlineMs).toISOString();

  const daysToDeadline = Math.ceil((Date.parse(deadline) - Date.now()) / (24 * 60 * 60 * 1000));
  const severity = inferSeverity({
    requiredDays,
    constitutionalDays,
    daysToDeadline,
    driftGapDays,
  });

  const lawSummary =
    requiredDays != null && /breach|notification|reg s-p/i.test(corpus)
      ? `New ${item.source} rule requires ${requiredDays}-day breach notification.`
      : `Regulatory shift detected (${item.source}): ${item.title.slice(0, 120)}`;

  const id = stableRegulatoryItemId(item.source, item.title, item.link);

  const alert: RegulatoryDriftAlert = {
    id,
    detectedAt: new Date().toISOString(),
    source: item.source,
    sourceUrl: item.link || item.sourceUrl,
    lawSummary,
    lawExcerpt: corpus.slice(0, 500),
    tasSection: obligation.tasSection,
    tasSectionTitle: obligation.tasSectionTitle,
    tasAnchorId: obligation.anchorId,
    tasLine: obligation.tasLine,
    tasCurrentPosture: obligation.currentPosture,
    agentLabel: obligation.agentLabel,
    isDriftDetected,
    severity,
    deadline,
    status: "ACTIVE",
    pulseMessage: "",
    keywordHits,
    obligationId: obligation.id,
  };

  alert.pulseMessage = buildPulseMessage({
    tasSection: alert.tasSection,
    tasSectionTitle: alert.tasSectionTitle,
    lawSummary: alert.lawSummary,
    deadline: alert.deadline,
    authority: item.source.split(" ")[0] ?? item.source,
  });

  if (!isDriftDetected) {
    return { alert: null, matchedObligation: obligation };
  }

  return { alert, matchedObligation: obligation };
}

export function analyzeRegulatoryBatch(items: RegulatoryFeedItem[]): RegulatoryDriftAlert[] {
  const alerts: RegulatoryDriftAlert[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const { alert } = analyzeRegulatoryGap(item);
    if (alert && !seen.has(alert.id)) {
      seen.add(alert.id);
      alerts.push(alert);
    }
  }
  return alerts;
}

export function hashAmendmentDraftId(alertId: string): string {
  return createHash("sha256").update(`tas-amendment:${alertId}`, "utf8").digest("hex").slice(0, 12);
}
