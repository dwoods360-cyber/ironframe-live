import { createHash } from "crypto";
import type { DeAckReason, ThreatState } from "@prisma/client";

export type ReceiptThreatRowInput = {
  id: string;
  title: string;
  sourceAgent: string;
  status: ThreatState;
  tenantCompanyId: bigint | null;
  deAckReason: DeAckReason | null;
  isFalsePositive: boolean;
  dispositionStatus: string | null;
  receiptHash: string | null;
  ingestionDetails: string | null;
  updatedAt: Date;
  score: number;
  targetEntity: string;
  financialRisk_cents: bigint;
  createdAt: Date;
};

export function toReceiptThreatScalars(
  row: ReceiptThreatRowInput,
  patch?: Partial<DigitalReceiptThreatScalars>,
): DigitalReceiptThreatScalars {
  const base: DigitalReceiptThreatScalars = {
    id: row.id,
    title: row.title,
    sourceAgent: row.sourceAgent,
    status: row.status,
    tenantCompanyId: row.tenantCompanyId != null ? row.tenantCompanyId.toString() : null,
    deAckReason: row.deAckReason,
    isFalsePositive: row.isFalsePositive,
    dispositionStatus: row.dispositionStatus,
    receiptHash: row.receiptHash,
    ingestionDetails: row.ingestionDetails,
    updatedAt: row.updatedAt.toISOString(),
    score: row.score,
    targetEntity: row.targetEntity,
    financialRisk_cents: row.financialRisk_cents.toString(),
    createdAt: row.createdAt.toISOString(),
  };
  return { ...base, ...patch };
}

export type DigitalReceiptThreatScalars = {
  id: string;
  title: string;
  sourceAgent: string;
  status: ThreatState;
  tenantCompanyId: string | null;
  deAckReason: DeAckReason | null;
  isFalsePositive: boolean;
  dispositionStatus: string | null;
  receiptHash: string | null;
  ingestionDetails: string | null;
  updatedAt: string;
  createdAt: string;
  score: number;
  targetEntity: string;
  financialRisk_cents: string;
};

export type DigitalReceiptAuditStub = {
  id: string;
  action: string;
  operatorId: string;
  createdAt: string;
  isSimulation: boolean;
  justificationPreview: string | null;
};

export function sha256HexCanonical(obj: unknown): string {
  return createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

export function buildDigitalReceiptDocument(input: {
  plane: "production" | "shadow";
  goldenSource: boolean;
  threat: DigitalReceiptThreatScalars;
  auditTail: DigitalReceiptAuditStub[];
}): { receipt: unknown; hash: string } {
  const receipt = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    plane: input.plane,
    goldenSource: input.goldenSource,
    threat: input.threat,
    auditTail: input.auditTail,
  };
  return { receipt, hash: sha256HexCanonical(receipt) };
}

/** Prefix for shadow-plane AuditLog.justification so receipts can correlate without ThreatEvent FK. */
export function shadowReceiptAuditStub(simThreatId: string): { simThreatId: string; receiptPlane: "shadow" } {
  return { receiptPlane: "shadow", simThreatId };
}
