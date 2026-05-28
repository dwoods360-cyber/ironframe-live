import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { verifyTenantBoundAsymmetricSignature } from "@/app/lib/crypto/pkiSignatureVerifier";
import { parseIngestionDetailsForMerge } from "@/app/utils/ingestionDetailsMerge";

export const EPIC_12_SHRED_BLOCK_MESSAGE =
  "EPIC_12_ATTESTATION_IMMUTABILITY_BLOCK: Signed GRC attestation or vault release seal prohibits digital shred.";

const VAULT_DISPOSITION = "BANK_VAULT_HITL_RELEASE";

const INTEGRITY_ATTESTATION_EVENT_TYPES = [
  "BANK_VAULT_DUAL_GATE_ATTESTATION",
  "BANK_VAULT_OVERRIDE_COMMITTED",
] as const;

function hasNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export type AttestationVerificationContext = {
  tenantUuid: string;
  entityId: string;
  financialRiskCents?: bigint;
};

function verifyBankVaultReleasePki(
  release: Record<string, unknown>,
  ctx: AttestationVerificationContext,
): boolean {
  const signature = release.attestationSignature;
  const challengeMessage = release.challengeMessage;
  if (!hasNonEmptyString(signature) || !hasNonEmptyString(challengeMessage)) {
    return false;
  }
  return verifyTenantBoundAsymmetricSignature({
    role: "VAULT_RELEASE",
    tenantUuid: ctx.tenantUuid,
    entityId: ctx.entityId,
    message: challengeMessage,
    signature,
    financialRiskCents: ctx.financialRiskCents,
  });
}

function verifyCisoHandshakePki(
  handshake: Record<string, unknown>,
  ctx: AttestationVerificationContext,
): boolean {
  const signature = handshake.attestationSignature;
  const approvalId = handshake.resolutionApprovalId;
  const approvedBy = handshake.approvedByUserId;
  if (!hasNonEmptyString(signature)) {
    return false;
  }
  if (!hasNonEmptyString(approvalId) || !hasNonEmptyString(approvedBy)) {
    return false;
  }
  const message = `${ctx.entityId.trim()}:${approvalId.trim()}:${approvedBy.trim()}`;
  return verifyTenantBoundAsymmetricSignature({
    role: "CISO_HANDSHAKE",
    tenantUuid: ctx.tenantUuid,
    entityId: ctx.entityId,
    message,
    signature,
    financialRiskCents: ctx.financialRiskCents,
  });
}

/** PKI-verified attestation markers (Epic 11) — fail-closed without valid asymmetric signatures. */
export function ingestionDetailsPassPkiAttestation(
  raw: string | Prisma.JsonValue | null | undefined,
  ctx: AttestationVerificationContext,
): boolean {
  const j = parseIngestionDetailsForMerge(raw);

  const release = j.bankVaultHitlRelease;
  if (release && typeof release === "object" && !Array.isArray(release)) {
    if (verifyBankVaultReleasePki(release as Record<string, unknown>, ctx)) {
      return true;
    }
  }

  const handshake = j.shadowCisoHandshake;
  if (handshake && typeof handshake === "object" && !Array.isArray(handshake)) {
    if (verifyCisoHandshakePki(handshake as Record<string, unknown>, ctx)) {
      return true;
    }
  }

  return false;
}

/** Parse-time signals from merged ingestion JSON (ThreatEvent string or RiskEvent JSONB). */
export function ingestionDetailsIndicateSignedAttestation(
  raw: string | Prisma.JsonValue | null | undefined,
  ctx?: AttestationVerificationContext,
): boolean {
  if (ctx && ingestionDetailsPassPkiAttestation(raw, ctx)) {
    return true;
  }

  const j = parseIngestionDetailsForMerge(raw);

  const release = j.bankVaultHitlRelease;
  if (release && typeof release === "object" && !Array.isArray(release)) {
    const sig = (release as Record<string, unknown>).attestationSignature;
    if (hasNonEmptyString(sig)) return true;
  }

  const handshake = j.shadowCisoHandshake;
  if (handshake && typeof handshake === "object" && !Array.isArray(handshake)) {
    const sig = (handshake as Record<string, unknown>).attestationSignature;
    if (hasNonEmptyString(sig)) return true;
  }

  return false;
}

function forensicSealIndicatesSigned(seal: Prisma.JsonValue | null | undefined): boolean {
  if (!seal || typeof seal !== "object" || Array.isArray(seal)) return false;
  const o = seal as Record<string, unknown>;
  return hasNonEmptyString(o.signature) || hasNonEmptyString(o.attestationSignature);
}

/**
 * Epic 12 — WORM guard: true when vault dual-gate, GRC receipt, or approved attestation
 * would make a digital shred a protocol violation.
 */
export async function riskEventHasSignedAttestationBlockingShred(args: {
  tenantUuid: string;
  riskEventId: string;
  companyIds: bigint[];
}): Promise<boolean> {
  const { tenantUuid, riskEventId, companyIds } = args;
  const attestationCtx: AttestationVerificationContext = {
    tenantUuid,
    entityId: riskEventId,
  };

  const [risk, threat, integrityHit, forensicLedger] = await Promise.all([
    prisma.riskEvent.findFirst({
      where: { id: riskEventId, tenantId: tenantUuid },
      select: {
        ingestionDetails: true,
        dispositionStatus: true,
        receiptHash: true,
        forensicSeal: true,
        governanceHash: true,
        financialRisk_cents: true,
      },
    }),
    prisma.threatEvent.findFirst({
      where: { id: riskEventId, tenantCompanyId: { in: companyIds } },
      select: {
        ingestionDetails: true,
        dispositionStatus: true,
        receiptHash: true,
        resolutionApprovalId: true,
      },
    }),
    prisma.integrityEvent.findFirst({
      where: {
        tenantId: tenantUuid,
        entityId: riskEventId,
        eventType: { in: [...INTEGRITY_ATTESTATION_EVENT_TYPES] },
      },
      select: { id: true },
    }),
    prisma.forensicSealLedger.findFirst({
      where: { tenantId: tenantUuid, riskEventId },
      select: { id: true },
    }),
  ]);

  if (integrityHit) return true;
  if (forensicLedger) return true;

  if (risk) {
    attestationCtx.financialRiskCents = risk.financialRisk_cents ?? undefined;
    if (risk.dispositionStatus === VAULT_DISPOSITION) return true;
    if (hasNonEmptyString(risk.receiptHash)) return true;
    if (forensicSealIndicatesSigned(risk.forensicSeal)) return true;
    if (ingestionDetailsIndicateSignedAttestation(risk.ingestionDetails, attestationCtx)) return true;
  }

  if (threat) {
    if (threat.dispositionStatus === VAULT_DISPOSITION) return true;
    if (hasNonEmptyString(threat.receiptHash)) return true;
    if (ingestionDetailsIndicateSignedAttestation(threat.ingestionDetails, attestationCtx)) return true;

    if (hasNonEmptyString(threat.resolutionApprovalId)) {
      const [approval, evidenceLink] = await Promise.all([
        prisma.threatApproval.findUnique({
          where: { id: threat.resolutionApprovalId },
          select: { status: true, threatId: true, tenantId: true },
        }),
        prisma.evidenceAttachment.findFirst({
          where: {
            tenantId: tenantUuid,
            entityType: "THREAT_EVENT",
            entityId: riskEventId,
          },
          select: { id: true },
        }),
      ]);
      if (
        approval?.status === "APPROVED" &&
        approval.threatId === riskEventId &&
        approval.tenantId === tenantUuid &&
        evidenceLink
      ) {
        return true;
      }
    }
  }

  return false;
}
