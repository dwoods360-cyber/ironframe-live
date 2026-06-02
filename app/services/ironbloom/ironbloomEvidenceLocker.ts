import "server-only";

import { createHash, randomUUID } from "crypto";
import path from "path";
import prisma from "@/lib/prisma";
import { writeLocalWormBytes } from "@/app/lib/evidence/wormStoragePolicy";
import { uploadImmutableWormObject } from "@/app/lib/evidence/supabaseWormStorage";

export type IronbloomEvidenceCanonical = {
  sealVersion: 1;
  tenantId: string;
  recordedAt: string;
  unitsKwh: number;
  carbonIntensityGco2PerKwh: number;
  aleCents: string;
  zone: string;
  metricTonsCo2e?: number;
  threatId?: string | null;
  /** EPA SCC layer (cents) + operational ALE — total societal value stamp. */
  sccComponentCents?: string | null;
  totalSocietalValueCents?: string | null;
  socialCostOfCarbonCentsPerTon?: string | null;
};

const IRONBLOOM_EVIDENCE_OPERATOR = "IRONBLOOM_AGENT_18";

export function canonicalizeIronbloomEvidence(record: IronbloomEvidenceCanonical): string {
  const ordered = {
    sealVersion: record.sealVersion,
    tenantId: record.tenantId,
    recordedAt: record.recordedAt,
    unitsKwh: record.unitsKwh,
    carbonIntensityGco2PerKwh: record.carbonIntensityGco2PerKwh,
    aleCents: record.aleCents,
    zone: record.zone,
    metricTonsCo2e: record.metricTonsCo2e ?? null,
    threatId: record.threatId ?? null,
    sccComponentCents: record.sccComponentCents ?? null,
    totalSocietalValueCents: record.totalSocietalValueCents ?? null,
    socialCostOfCarbonCentsPerTon: record.socialCostOfCarbonCentsPerTon ?? null,
  };
  return JSON.stringify(ordered);
}

export function hashIronbloomEvidence(canonical: string): string {
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

async function writeCanonicalBytes(tenantId: string, bytes: Uint8Array): Promise<string> {
  const safeName = `ironbloom-${Date.now()}-${randomUUID()}.json`;
  const objectPath = `worm/${tenantId}/ironbloom/${safeName}`;

  const uploaded = await uploadImmutableWormObject({
    objectPath,
    bytes,
    mimeType: "application/json",
    tenantId,
  });
  if (uploaded.ok) {
    return uploaded.storagePath;
  }

  return writeLocalWormBytes({
    relativeDir: path.join("uploads", "evidence", tenantId),
    fileName: safeName,
    bytes,
  });
}

/**
 * Immutable Evidence Locker row for each Ironbloom scoring event (SHA-256 over canonical JSON).
 */
export async function sealIronbloomSustainabilityEvidence(params: {
  tenantId: string;
  record: IronbloomEvidenceCanonical;
  entityId: string;
}): Promise<{ artifactId: string; sha256: string; canonical: string; storagePath: string }> {
  const canonical = canonicalizeIronbloomEvidence(params.record);
  const sha256 = hashIronbloomEvidence(canonical);
  const bytes = new TextEncoder().encode(canonical);
  const storagePath = await writeCanonicalBytes(params.tenantId, bytes);

  const artifact = await prisma.evidenceArtifact.create({
    data: {
      tenantId: params.tenantId,
      uploadedByUserId: IRONBLOOM_EVIDENCE_OPERATOR,
      sha256,
      storagePath,
      mimeType: "application/json",
    },
    select: { id: true },
  });

  await prisma.evidenceAttachment.create({
    data: {
      tenantId: params.tenantId,
      artifactId: artifact.id,
      entityType: "AUDIT_LOG",
      entityId: params.entityId,
      attachedByUserId: IRONBLOOM_EVIDENCE_OPERATOR,
      attachmentNote: "Ironbloom sustainability ALE forensic seal",
    },
  });

  return {
    artifactId: artifact.id,
    sha256,
    canonical,
    storagePath,
  };
}
