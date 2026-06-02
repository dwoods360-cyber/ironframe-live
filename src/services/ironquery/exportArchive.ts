import "server-only";

import prisma from "@/lib/prisma";
import { uploadImmutableWormObject } from "@/app/lib/evidence/supabaseWormStorage";
import {
  canonicalizeExportPayload,
  canonicalizeCsvRows,
  canonicalizePdfDescriptor,
  generateTamperEvidentSeal,
  isPdfExportDescriptor,
  type TamperEvidentSeal,
} from "@/src/services/ironquery/exportSigner";
import { normalizeCsvPayload, type CsvRow } from "@/src/services/ironquery/csvNormalizer";

export type ArchiveClassification = "financial" | "forensic";
export type ArchiveFormat = "csv" | "pdf";

export type ArchiveComplianceReportInput = {
  tenantId: string;
  generatedByUserId: string;
  classification: ArchiveClassification;
  format: ArchiveFormat;
  payload: unknown;
};

export type ArchiveComplianceReportResult = {
  artifactId: string;
  storagePath: string;
  objectPath: string;
  canonicalSha256: string;
  seal: TamperEvidentSeal;
};

function normalizeUtcTimestampForPath(isoTimestamp: string): string {
  return isoTimestamp.replace(/[:.]/g, "-");
}

export function buildCanonicalExportPayloadBytes(payload: unknown, format: ArchiveFormat): Uint8Array {
  if (format === "csv") {
    if (typeof payload === "string") {
      return Buffer.from(payload.replace(/\r\n/g, "\n"), "utf8");
    }
    if (Array.isArray(payload)) {
      const csv = normalizeCsvPayload(payload as CsvRow[]);
      return canonicalizeExportPayload(csv);
    }
    throw new Error("EPIC_16_CSV_PAYLOAD_INVALID");
  }

  if (format === "pdf") {
    if (!isPdfExportDescriptor(payload)) {
      throw new Error("EPIC_16_PDF_DESCRIPTOR_INVALID");
    }
    return canonicalizePdfDescriptor(payload);
  }

  if (typeof payload === "string") {
    return Buffer.from(payload, "utf8");
  }
  if (Array.isArray(payload)) {
    return canonicalizeCsvRows(payload as CsvRow[]);
  }
  return canonicalizeExportPayload(payload);
}

/**
 * Epic 16 — append-only archive flow:
 * 1) Canonicalize + sign
 * 2) Persist immutable object into WORM bucket
 * 3) Record artifact metadata for retrieval history
 */
export async function archiveComplianceReport(
  input: ArchiveComplianceReportInput,
): Promise<ArchiveComplianceReportResult> {
  const tenantId = input.tenantId.trim();
  const generatedByUserId = input.generatedByUserId.trim();
  if (!tenantId) throw new Error("EPIC_16_EXPORT_TENANT_REQUIRED");
  if (!generatedByUserId) throw new Error("EPIC_16_EXPORT_USER_REQUIRED");

  const generatedAt = new Date().toISOString();
  const payloadBytes = buildCanonicalExportPayloadBytes(input.payload, input.format);
  const seal = generateTamperEvidentSeal({
    payload: Buffer.from(payloadBytes).toString("base64"),
    tenantId,
    generatedByUserId,
    timestamp: generatedAt,
  });

  const envelope = {
    epic: "EPIC_16",
    generatedAt,
    tenantId,
    generatedByUserId,
    format: input.format,
    classification: input.classification,
    bodyBase64: Buffer.from(payloadBytes).toString("base64"),
    seal,
  };

  const canonicalEnvelope = canonicalizeExportPayload(envelope);
  const objectPath = `${input.classification}/${tenantId}/ironquery/${normalizeUtcTimestampForPath(
    generatedAt,
  )}-${seal.bodySha256}.${input.format}.sealed.json`;
  const upload = await uploadImmutableWormObject({
    bucket: "worm",
    objectPath,
    bytes: canonicalEnvelope,
    mimeType: "application/json",
    tenantId,
  });
  if (!upload.ok) {
    throw new Error(`EPIC_16_EXPORT_ARCHIVE_FAILED: ${upload.error}`);
  }

  const artifact = await prisma.evidenceArtifact.create({
    data: {
      tenantId,
      uploadedByUserId: generatedByUserId,
      sha256: seal.bodySha256,
      storagePath: upload.storagePath,
      mimeType: "application/json",
    },
    select: { id: true },
  });

  console.info(
    "[epic16-ironquery-export]",
    JSON.stringify({
      action: "ARCHIVED",
      tenantId,
      objectPath,
      storagePath: upload.storagePath,
      sha256: seal.bodySha256,
    }),
  );

  return {
    artifactId: artifact.id,
    storagePath: upload.storagePath,
    objectPath,
    canonicalSha256: seal.bodySha256,
    seal,
  };
}
