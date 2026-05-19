import "server-only";

import { createHash } from "crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import prisma from "@/lib/prisma";
import { TAS_CHAOS_COMPLIANCE_DIRECTIVES } from "@/app/config/tasChaosComplianceDirectives";
import {
  eventTimestamp,
  getLatestClosedChaosRunForTenant,
  type ChaosRunTelemetryRecord,
  telemetryRunFingerprint,
} from "@/app/lib/chaosRunTelemetry";
import { fetchLastWillFromOffSite, findLatestLocalLwtArchiveId } from "@/app/lib/lastWillAndTestament";
import { DEAD_MAN_SWITCH_SIMULATION_TTL_MS } from "@/app/lib/deadMansSwitch";
import { readGovernanceMaturityState } from "@/app/lib/governanceMaturityState";
import {
  buildFinancialDefenseNarrative,
  computeCostOfNonCompliance,
  type CostOfNonComplianceResult,
} from "@/app/utils/financialRisk";

export type ComplianceDeltaRow = {
  directiveId: string;
  tasLineRef: number;
  requirement: string;
  expected: string;
  actual: string;
  delta: string;
  status: "OPTIMAL" | "SUB_OPTIMAL" | "FAIL";
};

export type IrontechPostMortemReport = {
  reportId: string;
  generatedAt: string;
  tenantId: string;
  scenario: string;
  isSimulation: boolean;
  runId: string | null;
  containment: {
    tasVoidAt: string | null;
    ironlockFreezeAt: string | null;
    containmentMs: number | null;
    ironlockAgent: "IRONLOCK_AGENT_06";
    threatsFrozen: number;
    shadowFrozen: number;
  };
  isolation: {
    observationWindowMs: number;
    bleedIncidentCount: number;
    bleedSamples: Array<{ at: string; action: string; summary: string }>;
    integrityVerdict: "PASS" | "FAIL";
  };
  forensicQuality: {
    lwtArchiveId: string | null;
    auditEntriesSampled: number;
    minJustificationLength: number;
    requiredMinLength: number;
    entriesBelowMinimum: number;
    verdict: "PASS" | "FAIL";
  };
  dmsLearning: {
    dmsTriggered: boolean;
    wipeExpected: boolean;
    wipeComplete: boolean;
    residualFindings: string[];
    failurePoint: string | null;
  };
  complianceDelta: ComplianceDeltaRow[];
  financialDefenseSummary?: {
    maturityScoreAtEvent: number;
    financialImpact: CostOfNonComplianceResult;
    narrative: string;
  };
  reportSha256: string;
  signedSeal: string;
};

const REPORT_DIR = join(process.cwd(), "storage", "constitutional", "irontech-post-mortem");

function ensureReportDir(): void {
  if (!existsSync(REPORT_DIR)) mkdirSync(REPORT_DIR, { recursive: true });
}

function reportPath(tenantId: string, reportId: string): string {
  return join(REPORT_DIR, `${tenantId.trim().toLowerCase()}-${reportId}.json`);
}

export function readStoredIrontechPostMortem(
  tenantId: string,
  reportId: string,
): IrontechPostMortemReport | null {
  try {
    const path = reportPath(tenantId, reportId);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8")) as IrontechPostMortemReport;
  } catch {
    return null;
  }
}

export function readLatestIrontechPostMortemForTenant(tenantId: string): IrontechPostMortemReport | null {
  ensureReportDir();
  const tid = tenantId.trim().toLowerCase();
  const prefix = `${tid}-`;
  const files = existsSync(REPORT_DIR)
    ? readdirSync(REPORT_DIR).filter((f) => f.startsWith(prefix) && f.endsWith(".json"))
    : [];
  let latest: IrontechPostMortemReport | null = null;
  for (const file of files) {
    try {
      const rec = JSON.parse(
        readFileSync(join(REPORT_DIR, file), "utf8"),
      ) as IrontechPostMortemReport;
      if (!latest || Date.parse(rec.generatedAt) > Date.parse(latest.generatedAt)) {
        latest = rec;
      }
    } catch {
      /* skip */
    }
  }
  return latest;
}

function storeReport(report: IrontechPostMortemReport): void {
  ensureReportDir();
  writeFileSync(reportPath(report.tenantId, report.reportId), JSON.stringify(report, null, 2), "utf8");
}

function msBetween(a: number | null, b: number | null): number | null {
  if (a == null || b == null) return null;
  return Math.max(0, b - a);
}

function formatDeltaSeconds(deltaMs: number | null, slaMs: number): ComplianceDeltaRow["status"] {
  if (deltaMs == null) return "FAIL";
  if (deltaMs <= slaMs) return "OPTIMAL";
  return "SUB_OPTIMAL";
}

async function scanIsolationBleed(params: {
  tenantId: string;
  windowStart: Date;
  windowEnd: Date;
}): Promise<IrontechPostMortemReport["isolation"]> {
  const bleedSamples: IrontechPostMortemReport["isolation"]["bleedSamples"] = [];
  const tid = params.tenantId.trim();

  const rows = await prisma.auditLog.findMany({
    where: {
      createdAt: { gte: params.windowStart, lte: params.windowEnd },
      OR: [
        { justification: { contains: "CROSS-TENANT", mode: "insensitive" } },
        { justification: { contains: "ISOLATION BREACH", mode: "insensitive" } },
        { justification: { contains: "IRONGUARD", mode: "insensitive" } },
        { action: { contains: "SENTINEL", mode: "insensitive" } },
      ],
    },
    select: { id: true, action: true, justification: true, createdAt: true, tenantId: true, governance_tenant_uuid: true },
    take: 100,
    orderBy: { createdAt: "desc" },
  });

  for (const row of rows) {
    const rowTenant = row.tenantId?.trim() || row.governance_tenant_uuid?.trim() || "";
    const crossTenant =
      (rowTenant && rowTenant !== tid) ||
      /cross-tenant|isolation breach|unauthorized cross-tenant/i.test(row.justification ?? "");
    if (!crossTenant && !/SENTINEL|IRONGUARD BREACH/i.test(`${row.action} ${row.justification ?? ""}`)) {
      continue;
    }
    bleedSamples.push({
      at: row.createdAt.toISOString(),
      action: row.action,
      summary: (row.justification ?? "").slice(0, 160),
    });
  }

  return {
    observationWindowMs: params.windowEnd.getTime() - params.windowStart.getTime(),
    bleedIncidentCount: bleedSamples.length,
    bleedSamples: bleedSamples.slice(0, 8),
    integrityVerdict: bleedSamples.length === 0 ? "PASS" : "FAIL",
  };
}

async function assessForensicQuality(
  tenantId: string,
  lwtArchiveId: string | null,
): Promise<IrontechPostMortemReport["forensicQuality"]> {
  const requiredMinLength = 50;
  let archiveId = lwtArchiveId;
  let auditEntries = 0;
  let minLen = Number.POSITIVE_INFINITY;
  let below = 0;

  if (!archiveId) {
    archiveId = findLatestLocalLwtArchiveId();
  }

  const lwt = archiveId ? await fetchLastWillFromOffSite(archiveId) : null;
  if (lwt?.auditEntries?.length) {
    auditEntries = lwt.auditEntries.length;
    for (const e of lwt.auditEntries) {
      const len = (e.justification ?? "").trim().length;
      if (len < minLen) minLen = len;
      if (len < requiredMinLength) below += 1;
    }
  }

  if (!Number.isFinite(minLen)) minLen = 0;

  return {
    lwtArchiveId: archiveId,
    auditEntriesSampled: auditEntries,
    minJustificationLength: minLen,
    requiredMinLength,
    entriesBelowMinimum: below,
    verdict: below === 0 && auditEntries > 0 ? "PASS" : auditEntries === 0 ? "FAIL" : "FAIL",
  };
}

function assessDmsLearning(
  run: ChaosRunTelemetryRecord | null,
): IrontechPostMortemReport["dmsLearning"] {
  const scorch = run?.events.find((e) => e.kind === "SCORCH_COMPLETE")?.payload as
    | {
        shadowThreatsCleared?: number;
        prodThreatsCleared?: number;
        sessionsPurged?: number;
        agentCacheCleared?: number;
        vaultSecretsCleared?: number;
      }
    | undefined;
  const dmsTriggered = Boolean(run?.events.some((e) => e.kind === "DMS_TRIGGERED"));
  const freeze = run?.events.find((e) => e.kind === "IRONLOCK_FREEZE")?.payload as
    | { threatsFrozen?: number; shadowFrozen?: number }
    | undefined;
  const hadThreats = (freeze?.threatsFrozen ?? 0) + (freeze?.shadowFrozen ?? 0) > 0;

  const residualFindings: string[] = [];
  if (dmsTriggered && hadThreats) {
    if ((scorch?.shadowThreatsCleared ?? 0) === 0 && (scorch?.prodThreatsCleared ?? 0) === 0) {
      residualFindings.push("DMS fired but zero active threat rows cleared.");
    }
    if ((scorch?.sessionsPurged ?? 0) === 0) {
      residualFindings.push("Governed sessions not purged — possible DMS partial failure.");
    }
    if ((scorch?.agentCacheCleared ?? 0) === 0 && (scorch?.vaultSecretsCleared ?? 0) === 0) {
      residualFindings.push("Agent cache / vault secrets reported zero clears.");
    }
  }
  if (!dmsTriggered && run?.isSimulation) {
    residualFindings.push("Simulation DMS never triggered before post-mortem close.");
  }

  const wipeComplete = dmsTriggered && residualFindings.length === 0;
  let failurePoint: string | null = null;
  if (residualFindings.length > 0) {
    failurePoint = residualFindings[0] ?? "Unknown DMS residual state.";
  }

  return {
    dmsTriggered,
    wipeExpected: hadThreats || dmsTriggered,
    wipeComplete,
    residualFindings,
    failurePoint,
  };
}

function buildComplianceDelta(params: {
  containmentMs: number | null;
  bleedCount: number;
  minJustificationLength: number;
  dmsWipeComplete: boolean;
}): ComplianceDeltaRow[] {
  return TAS_CHAOS_COMPLIANCE_DIRECTIVES.map((d) => {
    if (d.metric === "containmentMs") {
      const sla = d.slaMs ?? 1000;
      const actualMs = params.containmentMs;
      const status = formatDeltaSeconds(actualMs, sla);
      const deltaSec = actualMs == null ? null : (actualMs - sla) / 1000;
      const humanDelta =
        deltaSec == null
          ? "No telemetry"
          : `${deltaSec >= 0 ? "+" : ""}${deltaSec.toFixed(1)}s (${status === "OPTIMAL" ? "Within SLA" : "Sub-Optimal"})`;
      const narrative =
        d.id === "DIRECTIVE_4" && actualMs != null
          ? `TAS.md Directive 4 (Ln ${d.tasLineRef}) requires isolation in <${sla / 1000}s. Actual isolation: ${(actualMs / 1000).toFixed(1)}s. Delta: ${humanDelta}.`
          : humanDelta;
      return {
        directiveId: d.id,
        tasLineRef: d.tasLineRef,
        requirement: d.requirement,
        expected: `<${sla / 1000}s`,
        actual: actualMs == null ? "—" : `${(actualMs / 1000).toFixed(1)}s`,
        delta: narrative,
        status,
      };
    }
    if (d.metric === "isolationBleedCount") {
      const max = d.slaMaxBleed ?? 0;
      const status: ComplianceDeltaRow["status"] =
        params.bleedCount <= max ? "OPTIMAL" : "FAIL";
      return {
        directiveId: d.id,
        tasLineRef: d.tasLineRef,
        requirement: d.requirement,
        expected: `${max} cross-tenant incidents`,
        actual: `${params.bleedCount}`,
        delta: `${params.bleedCount - max} (${status === "OPTIMAL" ? "Within SLA" : "Breach"})`,
        status,
      };
    }
    if (d.metric === "lwtJustificationMinLen") {
      const min = d.slaMin ?? 50;
      const status: ComplianceDeltaRow["status"] =
        params.minJustificationLength >= min ? "OPTIMAL" : "FAIL";
      return {
        directiveId: d.id,
        tasLineRef: d.tasLineRef,
        requirement: d.requirement,
        expected: `≥${min} characters`,
        actual: `${params.minJustificationLength} chars (min sampled)`,
        delta: `${params.minJustificationLength - min} chars`,
        status,
      };
    }
    const status: ComplianceDeltaRow["status"] = params.dmsWipeComplete ? "OPTIMAL" : "FAIL";
    return {
      directiveId: d.id,
      tasLineRef: d.tasLineRef,
      requirement: d.requirement,
      expected: "Full tenant scorch",
      actual: params.dmsWipeComplete ? "Complete" : "Incomplete / residual data",
      delta: status === "OPTIMAL" ? "0 residual" : "Residual detected (see DMS learning)",
      status,
    };
  });
}

/**
 * Irontech (Agent 11) — generate JSON post-mortem after chaos ends (Phoenix or closed run).
 */
export async function generateIrontechPostMortemReport(params: {
  tenantId: string;
  run?: ChaosRunTelemetryRecord | null;
  lwtArchiveId?: string | null;
}): Promise<IrontechPostMortemReport> {
  const tenantId = params.tenantId.trim();
  const run = params.run ?? getLatestClosedChaosRunForTenant(tenantId);

  const voidAt = run ? eventTimestamp(run, "TAS_VOID") ?? eventTimestamp(run, "RUN_STARTED") : null;
  const freezeAt = run ? eventTimestamp(run, "IRONLOCK_FREEZE") : null;
  const containmentMs = msBetween(voidAt, freezeAt);

  const freezePayload = run?.events.find((e) => e.kind === "IRONLOCK_FREEZE")?.payload as
    | { threatsFrozen?: number; shadowFrozen?: number }
    | undefined;

  const windowStart = run ? new Date(run.startedAt) : new Date(Date.now() - DEAD_MAN_SWITCH_SIMULATION_TTL_MS);
  const windowEnd = run?.closedAt ? new Date(run.closedAt) : new Date();

  const isolation = await scanIsolationBleed({ tenantId, windowStart, windowEnd });
  const forensicQuality = await assessForensicQuality(tenantId, params.lwtArchiveId ?? null);
  const dmsLearning = assessDmsLearning(run);

  const complianceDelta = buildComplianceDelta({
    containmentMs,
    bleedCount: isolation.bleedIncidentCount,
    minJustificationLength: forensicQuality.minJustificationLength,
    dmsWipeComplete: dmsLearning.wipeComplete,
  });

  const reportId = createHash("sha256")
    .update(`${tenantId}:${Date.now()}:${run?.runId ?? "orphan"}`, "utf8")
    .digest("hex")
    .slice(0, 16);

  const body: Omit<IrontechPostMortemReport, "reportSha256" | "signedSeal"> = {
    reportId,
    generatedAt: new Date().toISOString(),
    tenantId,
    scenario: run?.scenario ?? "CONSTITUTIONAL_COLLAPSE",
    isSimulation: run?.isSimulation ?? true,
    runId: run?.runId ?? null,
    containment: {
      tasVoidAt: voidAt ? new Date(voidAt).toISOString() : null,
      ironlockFreezeAt: freezeAt ? new Date(freezeAt).toISOString() : null,
      containmentMs,
      ironlockAgent: "IRONLOCK_AGENT_06",
      threatsFrozen: freezePayload?.threatsFrozen ?? 0,
      shadowFrozen: freezePayload?.shadowFrozen ?? 0,
    },
    isolation,
    forensicQuality,
    dmsLearning,
    complianceDelta,
    financialDefenseSummary,
  };

  const reportSha256 = createHash("sha256").update(JSON.stringify(body), "utf8").digest("hex");
  const signedSeal = createHash("sha256")
    .update(`IRONTECH_POST_MORTEM:${reportSha256}:${tenantId}`, "utf8")
    .digest("hex");

  const report: IrontechPostMortemReport = { ...body, reportSha256, signedSeal };
  storeReport(report);

  try {
    const { auditLogCreateLoose } = await import("@/lib/auditLogLoose");
    await auditLogCreateLoose({
      data: {
        action: "IRONTECH_POST_MORTEM",
        justification: JSON.stringify({
          reportId: report.reportId,
          reportSha256: report.reportSha256,
          containmentMs: report.containment.containmentMs,
          isolationVerdict: report.isolation.integrityVerdict,
          dmsFailurePoint: report.dmsLearning.failurePoint,
        }),
        operatorId: "IRONTECH_AGENT_11",
        threatId: null,
        isSimulation: report.isSimulation,
        governance_tenant_uuid: tenantId,
      },
    });
  } catch {
    /* best-effort */
  }

  let scoreBeforeMaturity: number | null = null;
  try {
    const { readGovernanceMaturityState } = await import("@/app/lib/governanceMaturityState");
    scoreBeforeMaturity = (await readGovernanceMaturityState()).current.score;
  } catch {
    /* ignore */
  }

  try {
    const { recalculateSystemMaturityScore } = await import("@/app/services/governanceScoring");
    const nextState = await recalculateSystemMaturityScore({
      tenantId,
      trigger: "IRONTECH_POST_MORTEM",
    });
    const scoreAfter = nextState.current.score;

    try {
      const {
        runIrontallyShadowCertificationCheck,
        persistAndAuditIrontallyShadow,
      } = await import("@/app/services/irontallyShadowMode");
      const shadow = runIrontallyShadowCertificationCheck({
        scoreBefore: scoreBeforeMaturity,
        scoreAfter,
        scenario: report.scenario,
        tenantId,
      });
      await persistAndAuditIrontallyShadow(shadow, tenantId);
    } catch (e) {
      console.error("[generateIrontechPostMortemReport] Irontally shadow failed", e);
    }
  } catch (e) {
    console.error("[generateIrontechPostMortemReport] maturity recalc failed", e);
  }

  return report;
}

export function getPostMortemPdfStoragePath(tenantId: string, reportId: string): string {
  return join(REPORT_DIR, `${tenantId.trim().toLowerCase()}-${reportId}.pdf`);
}
