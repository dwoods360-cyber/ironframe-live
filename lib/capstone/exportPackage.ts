/**
 * Capstone / lab export package generator (Mission 4).
 * Server-issued only — hash is computed here, never trusted from the client.
 */
import { createHash } from "node:crypto";

export type ExportFormat = "JSON" | "CSV";

export type AuditRecord = {
  controlId: string;
  framework: string;
  systemOfRecord: string;
  collectorId: string;
  ingestTimestampUtc: string;
  scopeHash: string;
  targetEnclave: string;
  /** Prefer redacted fellow:{shortId} for portfolio exports */
  operatorSignOff: string;
  verificationStatus: "VERIFIED" | "QUARANTINED" | "EXEMPT";
  lossExposureCents: bigint;
};

export type CapstonePackageMetadata = {
  fellowId: string;
  tenantEnclaveId: string;
  academicTrack: string;
  exportedAtUtc: string;
  version: string;
};

export type GeneratedCapstonePackage = {
  format: ExportFormat;
  fileName: string;
  mimeType: string;
  content: string;
  exportPackageHash: string;
  recordCount: number;
  manifest: {
    metadata: CapstonePackageMetadata;
    sha256: string;
    byteLength: number;
  };
};

function escapeCsvCell(value: string | number | bigint | boolean): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function formatAuditRecordsToCsv(
  records: AuditRecord[],
  metadata: CapstonePackageMetadata,
): string {
  const metaHeader = [
    `# Ironframe Academic Fellowship — lab export register`,
    `# Fellow ID: ${metadata.fellowId}`,
    `# Tenant Enclave: ${metadata.tenantEnclaveId}`,
    `# Track: ${metadata.academicTrack}`,
    `# Export Timestamp: ${metadata.exportedAtUtc}`,
    `# Schema Version: ${metadata.version}`,
    `# Note: loss_exposure_cents is whole integer cents (BIGINT)`,
  ].join("\n");

  const headers = [
    "control_id",
    "framework",
    "system_of_record",
    "collector_id",
    "ingest_timestamp_utc",
    "scope_hash",
    "target_enclave",
    "operator_sign_off",
    "verification_status",
    "loss_exposure_cents",
  ];

  const rows = records.map((record) =>
    [
      escapeCsvCell(record.controlId),
      escapeCsvCell(record.framework),
      escapeCsvCell(record.systemOfRecord),
      escapeCsvCell(record.collectorId),
      escapeCsvCell(record.ingestTimestampUtc),
      escapeCsvCell(record.scopeHash),
      escapeCsvCell(record.targetEnclave),
      escapeCsvCell(record.operatorSignOff),
      escapeCsvCell(record.verificationStatus),
      record.lossExposureCents.toString(),
    ].join(","),
  );

  return `${metaHeader}\n\n${headers.join(",")}\n${rows.join("\n")}`;
}

export function formatAuditRecordsToJson(
  records: AuditRecord[],
  metadata: CapstonePackageMetadata,
): string {
  const serializableRecords = records.map((record) => ({
    controlId: record.controlId,
    framework: record.framework,
    systemOfRecord: record.systemOfRecord,
    collectorId: record.collectorId,
    ingestTimestampUtc: record.ingestTimestampUtc,
    scopeHash: record.scopeHash,
    targetEnclave: record.targetEnclave,
    operatorSignOff: record.operatorSignOff,
    verificationStatus: record.verificationStatus,
    lossExposureCents: record.lossExposureCents.toString(),
  }));

  const payload = {
    manifest: {
      generator: "Ironframe Academic Fellowship Sandbox",
      version: metadata.version,
      exportedAtUtc: metadata.exportedAtUtc,
      fellowId: metadata.fellowId,
      tenantEnclaveId: metadata.tenantEnclaveId,
      academicTrack: metadata.academicTrack,
      recordCount: records.length,
    },
    auditRegister: serializableRecords,
  };

  return JSON.stringify(payload, null, 2);
}

export function generateCapstonePackage(
  records: AuditRecord[],
  metadata: CapstonePackageMetadata,
  format: ExportFormat,
): GeneratedCapstonePackage {
  if (!records.length) {
    throw new Error("Cannot generate export package: audit register contains 0 records.");
  }

  const content =
    format === "CSV"
      ? formatAuditRecordsToCsv(records, metadata)
      : formatAuditRecordsToJson(records, metadata);

  const exportPackageHash = createHash("sha256").update(content, "utf8").digest("hex");
  const timestampFileToken = metadata.exportedAtUtc.replace(/[:.]/g, "-");
  const fileName = `ironframe_lab_export_${metadata.fellowId.slice(0, 8)}_${timestampFileToken}.${format.toLowerCase()}`;
  const mimeType = format === "CSV" ? "text/csv" : "application/json";

  return {
    format,
    fileName,
    mimeType,
    content,
    exportPackageHash,
    recordCount: records.length,
    manifest: {
      metadata,
      sha256: exportPackageHash,
      byteLength: Buffer.byteLength(content, "utf8"),
    },
  };
}
