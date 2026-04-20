/** `SimulationDiagnosticLog.action` values for shadow-plane structural self-test / deficiency trail. */
export const OPERATIONAL_DEFICIENCY_REPORT = "OPERATIONAL_DEFICIENCY_REPORT";
export const OPERATIONAL_DEFICIENCY_RESOLVED = "OPERATIONAL_DEFICIENCY_RESOLVED";
export const OPERATIONAL_SELF_TEST_PASS = "OPERATIONAL_SELF_TEST_PASS";

export type OperationalDeficiencySnapshotV1 = {
  threatId: string;
  threatTitle: string;
  status: string;
  /** DB `score` (1–10 liability-style) when present. */
  dbScore: number;
  severityLabel: "MEDIUM" | "HIGH" | "CRITICAL";
  likelihood: number;
  impact: number;
  residualScore: number;
  /** Full raw ingestion JSON/text at report time (deterministic repair / Irontech). */
  ingestionDetailsFull: string | null;
  /** @deprecated Legacy snapshots only */
  ingestionDetailsTruncated?: string | null;
  ingestionDiagnostics: string[];
  capturedAt: string;
};

export type OperationalDeficiencyReportJustificationV1 = {
  schemaVersion: 1;
  reportId: string;
  priority: "HIGH";
  tenantUuid: string;
  comment: string;
  snapshot: OperationalDeficiencySnapshotV1;
  /** UI surface the PO filed from (repair routing). */
  sourceComponentPath: string;
  /** Best-effort git / deploy revision at submit time. */
  gitRevision: string | null;
  /** Exact COPY FOR GEMINI block persisted for audit / diff. */
  geminiRepairPacket: string;
};

export type OperationalDeficiencyResolvedJustificationV1 = {
  schemaVersion: 1;
  resolvesReportId: string;
  resolvedAt: string;
  tenantUuid: string;
};

/** Payload shape for `OPERATIONAL_SELF_TEST_PASS` rows in `SimulationDiagnosticLog`. */
export type OperationalSelfTestPassPayloadV1 = {
  schemaVersion: 1;
  kind: "SELF_TEST_PASS";
  tenantUuid: string;
  threatId: string;
  threatTitle: string;
  status: string;
  dbScore: number;
  likelihood: number;
  impact: number;
  residualScore: number;
  severityLabel: string;
  sourceComponentPath: string;
  gitRevision: string | null;
  capturedAt: string;
};

export function residualScoreToSeverityLabel(residual: number): "MEDIUM" | "HIGH" | "CRITICAL" {
  if (residual < 30) return "MEDIUM";
  if (residual <= 70) return "HIGH";
  return "CRITICAL";
}

export function extractIngestionDiagnostics(ingestionDetails: string | null | undefined): string[] {
  const out: string[] = [];
  if (!ingestionDetails?.trim()) return out;
  try {
    const j = JSON.parse(ingestionDetails) as Record<string, unknown>;
    const scan = j.irongateScan as { status?: string; scannedAt?: string } | undefined;
    if (scan?.status === "MALICIOUS") {
      out.push(`Irongate: MALICIOUS (${scan.scannedAt ?? "unknown time"})`);
    }
    const err = j.error ?? j.lastError ?? j.ingressError;
    if (typeof err === "string" && err.trim()) out.push(`Ingestion error: ${err.trim().slice(0, 500)}`);
    if (typeof j.grcJustification === "string" && /fail|error|block/i.test(j.grcJustification)) {
      out.push(`GRC note (flagged): ${j.grcJustification.trim().slice(0, 280)}`);
    }
  } catch {
    if (/\b(error|fail|blocked|denied)\b/i.test(ingestionDetails)) {
      out.push("Raw ingestion text appears to reference an error (unparsed JSON).");
    }
  }
  return out;
}

export function parseReportPayload(raw: string | null): OperationalDeficiencyReportJustificationV1 | null {
  if (!raw?.trim()) return null;
  try {
    const j = JSON.parse(raw) as OperationalDeficiencyReportJustificationV1 & {
      sourceComponentPath?: string;
      gitRevision?: string | null;
      geminiRepairPacket?: string;
    };
    if (j?.schemaVersion !== 1 || !j.reportId || !j.snapshot) return null;
    const snap = j.snapshot as OperationalDeficiencySnapshotV1 & {
      ingestionDetailsFull?: string | null;
      ingestionDetailsTruncated?: string | null;
    };
    const ingestionDetailsFull =
      snap.ingestionDetailsFull ?? snap.ingestionDetailsTruncated ?? null;
    return {
      ...j,
      snapshot: { ...snap, ingestionDetailsFull },
      sourceComponentPath: j.sourceComponentPath ?? "unknown",
      gitRevision: j.gitRevision ?? null,
      geminiRepairPacket: j.geminiRepairPacket ?? "",
    };
  } catch {
    return null;
  }
}

export function parseReportPayloadFromJsonValue(value: unknown): OperationalDeficiencyReportJustificationV1 | null {
  if (value == null) return null;
  const raw = typeof value === "string" ? value : JSON.stringify(value);
  return parseReportPayload(raw);
}

export function parseResolvedPayload(raw: string | null): OperationalDeficiencyResolvedJustificationV1 | null {
  if (!raw?.trim()) return null;
  try {
    const j = JSON.parse(raw) as OperationalDeficiencyResolvedJustificationV1 & { tenantUuid?: string };
    if (j?.schemaVersion !== 1 || !j.resolvesReportId) return null;
    return {
      schemaVersion: 1,
      resolvesReportId: j.resolvesReportId,
      resolvedAt: j.resolvedAt ?? "",
      tenantUuid: typeof j.tenantUuid === "string" ? j.tenantUuid : "",
    };
  } catch {
    return null;
  }
}

export function parseResolvedPayloadFromJsonValue(value: unknown): OperationalDeficiencyResolvedJustificationV1 | null {
  if (value == null) return null;
  const raw = typeof value === "string" ? value : JSON.stringify(value);
  return parseResolvedPayload(raw);
}

export function parseSelfTestPassPayloadFromJsonValue(value: unknown): OperationalSelfTestPassPayloadV1 | null {
  if (value == null) return null;
  try {
    const j =
      typeof value === "string"
        ? (JSON.parse(value) as Record<string, unknown>)
        : (value as Record<string, unknown>);
    if (j?.schemaVersion !== 1 || j.kind !== "SELF_TEST_PASS") return null;
    if (typeof j.tenantUuid !== "string" || typeof j.threatId !== "string") return null;
    const path = typeof j.sourceComponentPath === "string" ? j.sourceComponentPath.trim() : "";
    return {
      schemaVersion: 1,
      kind: "SELF_TEST_PASS",
      tenantUuid: j.tenantUuid,
      threatId: j.threatId,
      threatTitle: typeof j.threatTitle === "string" ? j.threatTitle : "",
      status: typeof j.status === "string" ? j.status : "",
      dbScore: typeof j.dbScore === "number" && Number.isFinite(j.dbScore) ? j.dbScore : 0,
      likelihood: typeof j.likelihood === "number" && Number.isFinite(j.likelihood) ? j.likelihood : 0,
      impact: typeof j.impact === "number" && Number.isFinite(j.impact) ? j.impact : 0,
      residualScore: typeof j.residualScore === "number" && Number.isFinite(j.residualScore) ? j.residualScore : 0,
      severityLabel: typeof j.severityLabel === "string" ? j.severityLabel : "",
      sourceComponentPath: path.length > 0 ? path : "unknown",
      gitRevision: typeof j.gitRevision === "string" || j.gitRevision === null ? (j.gitRevision as string | null) : null,
      capturedAt: typeof j.capturedAt === "string" ? j.capturedAt : "",
    };
  } catch {
    return null;
  }
}
