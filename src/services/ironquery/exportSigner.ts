import "server-only";

import { createHash, createSign, createVerify } from "node:crypto";
import { normalizeCsvPayload, type CsvRow } from "@/src/services/ironquery/csvNormalizer";

type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | CanonicalValue[]
  | { [key: string]: CanonicalValue };

export type TamperEvidentMetadata = {
  tenantId: string;
  generatedByUserId: string;
  timestamp: string;
};

export type TamperEvidentSeal = {
  algorithm: "sha256-rsa";
  bodySha256: string;
  metadataSha256: string;
  publicKeyId: string;
  signature: string;
  signedDigest: string;
  metadata: TamperEvidentMetadata;
};

export type PdfDescriptorSection = {
  id: string;
  title: string;
  dataHash: string;
  rowsCount: number;
};

export type PdfExportDescriptor = {
  exportId: string;
  dataSnapshotTimestamp: string;
  contentSchemaVersion: number;
  sections: PdfDescriptorSection[];
};

export class ExportSignerConfigError extends Error {
  constructor(message: string) {
    super(`EPIC_16_EXPORT_SIGNER_CONFIG: ${message}`);
    this.name = "ExportSignerConfigError";
  }
}

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPdfDescriptorSection(input: unknown): input is PdfDescriptorSection {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const row = input as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    row.id.trim().length > 0 &&
    typeof row.title === "string" &&
    row.title.trim().length > 0 &&
    typeof row.dataHash === "string" &&
    /^[a-f0-9]{64}$/i.test(row.dataHash.trim()) &&
    typeof row.rowsCount === "number" &&
    Number.isInteger(row.rowsCount) &&
    row.rowsCount >= 0
  );
}

export function isPdfExportDescriptor(input: unknown): input is PdfExportDescriptor {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const record = input as Record<string, unknown>;
  if (typeof record.exportId !== "string" || !UUID_V4_RE.test(record.exportId.trim())) return false;
  if (
    typeof record.dataSnapshotTimestamp !== "string" ||
    Number.isNaN(new Date(record.dataSnapshotTimestamp).getTime())
  ) {
    return false;
  }
  if (
    typeof record.contentSchemaVersion !== "number" ||
    !Number.isInteger(record.contentSchemaVersion) ||
    record.contentSchemaVersion < 1
  ) {
    return false;
  }
  if (!Array.isArray(record.sections) || !record.sections.every((entry) => isPdfDescriptorSection(entry))) {
    return false;
  }
  return true;
}

function assertPdfExportDescriptor(input: unknown): asserts input is PdfExportDescriptor {
  if (!isPdfExportDescriptor(input)) {
    throw new Error("EPIC_16_PDF_DESCRIPTOR_INVALID");
  }
}

function toCanonicalValue(input: unknown): CanonicalValue {
  if (input == null) return null;
  if (typeof input === "bigint") return input.toString();
  if (typeof input === "string" || typeof input === "number" || typeof input === "boolean") {
    return input;
  }
  if (input instanceof Date) return input.toISOString();
  if (Array.isArray(input)) {
    return input.map((entry) => toCanonicalValue(entry));
  }
  if (typeof input === "object") {
    const output: Record<string, CanonicalValue> = {};
    const entries = Object.entries(input as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    for (const [key, value] of entries) {
      output[key] = toCanonicalValue(value);
    }
    return output;
  }
  return String(input);
}

/**
 * Deterministic export canonicalization for CSV/PDF descriptors and JSON payloads.
 * - Strings normalize line endings to LF.
 * - Objects/arrays sort keys recursively before serialization.
 */
export function canonicalizeExportPayload(payload: unknown): Uint8Array {
  if (typeof payload === "string") {
    return Buffer.from(payload.replace(/\r\n/g, "\n"), "utf8");
  }
  return Buffer.from(JSON.stringify(toCanonicalValue(payload)), "utf8");
}

export function canonicalizeCsvRows(rows: CsvRow[], columnOrder?: string[]): Uint8Array {
  const normalizedCsv = normalizeCsvPayload(rows, { columnOrder });
  return canonicalizeExportPayload(normalizedCsv);
}

export function canonicalizePdfDescriptor(descriptor: PdfExportDescriptor): Uint8Array {
  assertPdfExportDescriptor(descriptor);
  return canonicalizeExportPayload(descriptor);
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(Buffer.from(bytes)).digest("hex");
}

function normalizePem(raw: string): string {
  return raw.replace(/\\n/g, "\n").trim();
}

function resolveSigningPrivateKeyPem(): string {
  const raw = process.env.PRIVATE_KEY?.trim() || process.env.IRONFRAME_EXPORT_PRIVATE_KEY?.trim();
  if (!raw) {
    throw new ExportSignerConfigError("PRIVATE_KEY (or IRONFRAME_EXPORT_PRIVATE_KEY) is required.");
  }
  return normalizePem(raw);
}

function resolveSigningPublicKeyId(): string {
  const id = process.env.PUBLIC_KEY_ID?.trim() || process.env.IRONFRAME_EXPORT_PUBLIC_KEY_ID?.trim();
  if (!id) {
    throw new ExportSignerConfigError(
      "PUBLIC_KEY_ID (or IRONFRAME_EXPORT_PUBLIC_KEY_ID) is required.",
    );
  }
  return id;
}

function resolveVerificationPublicKeyPem(publicKeyId: string): string | null {
  const normalizedId = publicKeyId.trim();
  if (!normalizedId) return null;
  const dynamicEnv = `PUBLIC_KEY_${normalizedId.toUpperCase().replace(/[^A-Z0-9_]/g, "_")}`;
  const dynamicValue = process.env[dynamicEnv]?.trim();
  if (dynamicValue) return normalizePem(dynamicValue);
  const defaultId = process.env.PUBLIC_KEY_ID?.trim();
  const defaultPem = process.env.PUBLIC_KEY?.trim();
  if (defaultId === normalizedId && defaultPem) {
    return normalizePem(defaultPem);
  }
  return null;
}

export function generateTamperEvidentSeal(args: {
  payload: unknown;
  tenantId: string;
  generatedByUserId: string;
  timestamp: string;
}): TamperEvidentSeal {
  const tenantId = args.tenantId.trim();
  const generatedByUserId = args.generatedByUserId.trim();
  const timestamp = args.timestamp.trim();

  if (!tenantId) throw new Error("EPIC_16_EXPORT_TENANT_REQUIRED");
  if (!generatedByUserId) throw new Error("EPIC_16_EXPORT_GENERATED_BY_REQUIRED");
  if (!timestamp) throw new Error("EPIC_16_EXPORT_TIMESTAMP_REQUIRED");

  const bodyBytes = canonicalizeExportPayload(args.payload);
  const bodySha256 = sha256Hex(bodyBytes);
  const metadata: TamperEvidentMetadata = { tenantId, generatedByUserId, timestamp };
  const metadataBytes = canonicalizeExportPayload(metadata);
  const metadataSha256 = sha256Hex(metadataBytes);
  const signedDigest = `${bodySha256}:${metadataSha256}`;

  const signer = createSign("RSA-SHA256");
  signer.update(signedDigest, "utf8");
  signer.end();
  const signature = signer.sign(resolveSigningPrivateKeyPem(), "base64");

  return {
    algorithm: "sha256-rsa",
    bodySha256,
    metadataSha256,
    publicKeyId: resolveSigningPublicKeyId(),
    signature,
    signedDigest,
    metadata,
  };
}

export function verifyTamperEvidentSeal(args: {
  payload: unknown;
  seal: TamperEvidentSeal;
}): { ok: true } | { ok: false; error: string } {
  const bodySha256 = sha256Hex(canonicalizeExportPayload(args.payload));
  if (bodySha256 !== args.seal.bodySha256) {
    return { ok: false, error: "EPIC_16_EXPORT_BODY_HASH_MISMATCH" };
  }

  const metadataSha256 = sha256Hex(canonicalizeExportPayload(args.seal.metadata));
  if (metadataSha256 !== args.seal.metadataSha256) {
    return { ok: false, error: "EPIC_16_EXPORT_METADATA_HASH_MISMATCH" };
  }

  const signedDigest = `${bodySha256}:${metadataSha256}`;
  if (signedDigest !== args.seal.signedDigest) {
    return { ok: false, error: "EPIC_16_EXPORT_DIGEST_MISMATCH" };
  }

  const publicKeyPem = resolveVerificationPublicKeyPem(args.seal.publicKeyId);
  if (!publicKeyPem) {
    return { ok: false, error: "EPIC_16_EXPORT_PUBLIC_KEY_UNAVAILABLE" };
  }

  try {
    const verifier = createVerify("RSA-SHA256");
    verifier.update(signedDigest, "utf8");
    verifier.end();
    const ok = verifier.verify(publicKeyPem, args.seal.signature, "base64");
    if (!ok) {
      return { ok: false, error: "EPIC_16_EXPORT_SIGNATURE_INVALID" };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "EPIC_16_EXPORT_SIGNATURE_VERIFY_FAILED",
    };
  }
}
