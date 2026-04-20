import type {
  OpSupportDiagnosticComponentRow,
  OpSupportDiagnosticFailureEvent,
} from "@/app/lib/opsupportDashTypes";
import {
  OPERATIONAL_DEFICIENCY_REPORT,
  OPERATIONAL_SELF_TEST_PASS,
  parseReportPayloadFromJsonValue,
  parseSelfTestPassPayloadFromJsonValue,
} from "@/app/lib/opsupport/operationalDeficiencyQueue";

/** System self-test pass (shadow plane). */
export const COMPONENT_HEALTH_PASS_POINTS = 1;

/** Weighted deficiency impact by triage severity at report time. */
export function failSeverityWeightPoints(severity: string | null | undefined): number {
  const u = (severity ?? "").toString().toUpperCase();
  if (u === "CRITICAL") return -10;
  if (u === "HIGH") return -5;
  return -2;
}

/**
 * Maps cumulative weighted points to a 0–100 bar (emerald-heavy when high).
 * Neutral baseline 50; strong passes push toward 100, weighted fails toward 0.
 */
export function healthPointsToBarPercent(healthPoints: number): number {
  return Math.max(0, Math.min(100, Math.round(50 + healthPoints)));
}

type FailNorm = {
  kind: "fail";
  path: string;
  at: Date;
  logId: string;
  reportId: string;
  comment: string;
  gitRevision: string | null;
  geminiRepairPacket: string;
  severityLabel: string;
  threatId: string;
  threatTitle: string;
  threatStatus: string;
  likelihood: number;
  impact: number;
  ingestionDetails: string | null;
};

type PassNorm = { kind: "pass"; path: string; at: Date; logId: string };

type Norm = PassNorm | FailNorm;

export type SimulationDiagnosticLogShape = {
  id: string;
  createdAt: Date;
  action: string;
  payload: unknown;
  resolvedAt?: Date | null;
};

/**
 * Mean time-to-resolve (seconds) per `sourceComponentPath` from resolved deficiency rows.
 */
export function computeAverageTtrSecondsByPath(
  logs: Array<{ createdAt: Date; action: string; payload: unknown; resolvedAt?: Date | null }>,
): Map<string, { sumSec: number; n: number }> {
  const m = new Map<string, { sumSec: number; n: number }>();
  for (const row of logs) {
    if (row.action !== OPERATIONAL_DEFICIENCY_REPORT || !row.resolvedAt) continue;
    const report = parseReportPayloadFromJsonValue(row.payload);
    if (!report) continue;
    const path = (report.sourceComponentPath ?? "unknown").trim() || "unknown";
    const sec = (row.resolvedAt.getTime() - row.createdAt.getTime()) / 1000;
    if (!Number.isFinite(sec) || sec < 0) continue;
    let e = m.get(path);
    if (!e) {
      e = { sumSec: 0, n: 0 };
      m.set(path, e);
    }
    e.sumSec += sec;
    e.n += 1;
  }
  return m;
}

function normalizeDiagnosticLogs(
  logs: Array<{ id: string; createdAt: Date; action: string; payload: unknown }>,
): Norm[] {
  const out: Norm[] = [];
  for (const row of logs) {
    if (row.action === OPERATIONAL_DEFICIENCY_REPORT) {
      const report = parseReportPayloadFromJsonValue(row.payload);
      if (!report?.reportId || !report.snapshot) continue;
      const path = (report.sourceComponentPath ?? "unknown").trim() || "unknown";
      const snap = report.snapshot;
      out.push({
        kind: "fail",
        path,
        at: row.createdAt,
        logId: row.id,
        reportId: report.reportId,
        comment: (report.comment ?? "").trim(),
        gitRevision: report.gitRevision ?? null,
        geminiRepairPacket: (report.geminiRepairPacket ?? "").trim(),
        severityLabel: snap.severityLabel ?? "MEDIUM",
        threatId: snap.threatId ?? "",
        threatTitle: snap.threatTitle ?? "",
        threatStatus: snap.status ?? "—",
        likelihood: snap.likelihood ?? 8,
        impact: snap.impact ?? 9,
        ingestionDetails: snap.ingestionDetailsFull ?? snap.ingestionDetailsTruncated ?? null,
      });
    } else if (row.action === OPERATIONAL_SELF_TEST_PASS) {
      const p = parseSelfTestPassPayloadFromJsonValue(row.payload);
      if (!p) continue;
      const path = (p.sourceComponentPath ?? "unknown").trim() || "unknown";
      out.push({ kind: "pass", path, at: row.createdAt, logId: row.id });
    }
  }
  return out;
}

function toFailureEvent(n: FailNorm): OpSupportDiagnosticFailureEvent {
  return {
    logId: n.logId,
    reportId: n.reportId,
    createdAt: n.at.toISOString(),
    comment: n.comment,
    gitRevision: n.gitRevision,
    geminiRepairPacket: n.geminiRepairPacket,
    severityLabel: n.severityLabel,
    threatId: n.threatId || undefined,
    threatTitle: n.threatTitle || undefined,
    threatStatus: n.threatStatus,
    likelihood: n.likelihood,
    impact: n.impact,
    ingestionDetails: n.ingestionDetails,
  };
}

/**
 * Reliability engine: reads `SimulationDiagnosticLog`-shaped rows and aggregates
 * weighted health per `sourceComponentPath` (Kimbot / Attbot surfaces, etc.).
 */
export function calculateComponentHealth(logs: SimulationDiagnosticLogShape[]): OpSupportDiagnosticComponentRow[] {
  const ttrByPath = computeAverageTtrSecondsByPath(logs);
  const norms = normalizeDiagnosticLogs(logs);
  const byPath = new Map<
    string,
    {
      passCount: number;
      failCount: number;
      healthPoints: number;
      failures: OpSupportDiagnosticFailureEvent[];
    }
  >();

  for (const n of norms) {
    let b = byPath.get(n.path);
    if (!b) {
      b = { passCount: 0, failCount: 0, healthPoints: 0, failures: [] };
      byPath.set(n.path, b);
    }
    if (n.kind === "pass") {
      b.passCount += 1;
      b.healthPoints += COMPONENT_HEALTH_PASS_POINTS;
    } else {
      b.failCount += 1;
      b.healthPoints += failSeverityWeightPoints(n.severityLabel);
      b.failures.push(toFailureEvent(n));
    }
  }

  const rows: OpSupportDiagnosticComponentRow[] = [];
  for (const [sourceComponentPath, b] of byPath) {
    b.failures.sort((x, y) => (x.createdAt < y.createdAt ? 1 : x.createdAt > y.createdAt ? -1 : 0));
    const latest = b.failures[0];
    const total = b.passCount + b.failCount;
    const reliabilityScore = total === 0 ? null : Math.round((b.passCount / total) * 1000) / 10;
    const ttr = ttrByPath.get(sourceComponentPath);
    const avgTtrSeconds =
      ttr && ttr.n > 0 ? Math.round((ttr.sumSec / ttr.n) * 10) / 10 : null;
    const ttrSampleCount = ttr?.n ?? 0;
    rows.push({
      sourceComponentPath,
      passCount: b.passCount,
      failCount: b.failCount,
      healthPoints: b.healthPoints,
      healthBarPercent: healthPointsToBarPercent(b.healthPoints),
      reliabilityScore,
      latestDeficiencyComment: latest?.comment ?? null,
      lastFailureGitRevision: latest?.gitRevision ?? null,
      lastFailureAt: latest?.createdAt ?? null,
      avgTtrSeconds,
      ttrSampleCount,
      failures: b.failures,
    });
  }

  rows.sort((a, b) => {
    if (a.healthBarPercent !== b.healthBarPercent) return a.healthBarPercent - b.healthBarPercent;
    if (a.failCount !== b.failCount) return b.failCount - a.failCount;
    return b.passCount + b.failCount - (a.passCount + a.failCount);
  });

  return rows;
}
