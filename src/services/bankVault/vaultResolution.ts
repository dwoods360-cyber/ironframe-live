import "server-only";

import { EventSource, ThreatState } from "@prisma/client";
import prisma from "@/lib/prisma";
import { auditLogCreateLooseTx } from "@/lib/auditLogLoose";
import {
  buildBankVaultChallengeMessage,
  cryptoVerifySignature,
  vaultIntegrityDisplayHash,
} from "@/lib/security/vaultCrypto";
import { mergeIngestionDetailsPatch } from "@/app/utils/ingestionDetailsMerge";
import { updateThreatWithIntegrity } from "@/src/services/threatStateService";
import { integrityService } from "@/src/services/integrityService";

export const GRC_PROTOCOL_VIOLATION =
  "GRC_PROTOCOL_VIOLATION: Missing approved attestation or invalid secondary signature.";

export type BankVaultVerificationArgs = {
  threatId: string;
  tenantId: string;
  operatorId: string;
  supervisorPublicKey: string;
  /** Base64 RSA-SHA256 signature over the challenge message. */
  transactionSignature: string;
};

export type BankVaultCommitResult = {
  status: "PERMANENT_RELEASE_SEALED";
  integrityHash: string;
  eventHash: string;
  payloadHash: string;
};

async function assertThreatTenantScope(
  threatId: string,
  tenantId: string,
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
): Promise<{
  id: string;
  ingestionDetails: string | null;
  tenantCompanyId: bigint;
}> {
  const threatRecord = await tx.threatEvent.findUnique({
    where: { id: threatId },
    select: { id: true, tenantCompanyId: true, ingestionDetails: true },
  });

  if (!threatRecord?.tenantCompanyId) {
    throw new Error(`TENANT_MISMATCH: Unauthorized access attempt to asset ${threatId}`);
  }

  const company = await tx.company.findUnique({
    where: { id: threatRecord.tenantCompanyId },
    select: { tenantId: true },
  });

  if (!company?.tenantId || company.tenantId !== tenantId.trim()) {
    throw new Error(`TENANT_MISMATCH: Unauthorized access attempt to asset ${threatId}`);
  }

  return {
    id: threatRecord.id,
    ingestionDetails: threatRecord.ingestionDetails,
    tenantCompanyId: threatRecord.tenantCompanyId,
  };
}

/**
 * Epic 11.4 — Dual-gate cryptographic vault attestation.
 * Gate A: supervisor signature on replay-bound challenge.
 * Gate B: transactional threat update + immutable integrity hash chain + AuditLog.
 */
export async function verifyAndCommitVaultResolution(
  args: BankVaultVerificationArgs,
): Promise<BankVaultCommitResult> {
  const threatId = args.threatId.trim();
  const tenantId = args.tenantId.trim();
  const operatorId = args.operatorId.trim();

  if (!threatId || !tenantId || !operatorId) {
    throw new Error("GRC_PROTOCOL_VIOLATION: threatId, tenantId, and operatorId are required.");
  }

  const challengeMessage = buildBankVaultChallengeMessage(threatId, tenantId, operatorId);

  const isSignatureAuthentic = cryptoVerifySignature({
    publicKey: args.supervisorPublicKey,
    signature: args.transactionSignature,
    message: challengeMessage,
  });

  if (!isSignatureAuthentic) {
    throw new Error(GRC_PROTOCOL_VIOLATION);
  }

  const releaseStamp = {
    event: "BANK_VAULT_HITL_RELEASE",
    timestamp: new Date().toISOString(),
    verifiedByOperator: operatorId,
    attestationSignature: args.transactionSignature.trim(),
    challengeMessage,
    tasSection: "Epic 11.4",
  };

  return prisma.$transaction(async (tx) => {
    const threat = await assertThreatTenantScope(threatId, tenantId, tx);

    const mergedIngestion = mergeIngestionDetailsPatch(threat.ingestionDetails, {
      bankVaultHitlRelease: releaseStamp,
    });

    await updateThreatWithIntegrity({
      threatId,
      changes: {
        status: ThreatState.RESOLVED,
        assigneeId: operatorId,
        dispositionStatus: "BANK_VAULT_HITL_RELEASE",
        ingestionDetails: mergedIngestion,
      },
      actorUserId: operatorId,
      eventType: "BANK_VAULT_OVERRIDE_COMMITTED",
      source: EventSource.SYSTEM,
      tx,
      ledgerPayloadExtras: {
        dualGateVerified: true,
        challengeMessage,
        attestationSignature: args.transactionSignature.trim(),
        supervisorKeyRef: args.supervisorPublicKey.trim().slice(0, 64),
      },
    });

    const ledgerEntry = await integrityService.logEvent(tx, {
      tenantId,
      eventType: "BANK_VAULT_DUAL_GATE_ATTESTATION",
      entityType: "THREAT_EVENT",
      entityId: threatId,
      actorUserId: operatorId,
      source: EventSource.SYSTEM,
      payload: {
        threatId,
        operatorId,
        challengeMessage,
        attestationSignature: args.transactionSignature.trim(),
        releaseStamp,
      },
    });

    await auditLogCreateLooseTx(tx, {
      data: {
        action: "BANK_VAULT_OVERRIDE_COMMITTED",
        operatorId,
        governance_tenant_uuid: tenantId,
        threatId,
        isSimulation: false,
        justification:
          "Dual-lock cryptographic handshake successfully matched. Administrative override signed off.",
      },
    });

    return {
      status: "PERMANENT_RELEASE_SEALED",
      integrityHash: vaultIntegrityDisplayHash(args.transactionSignature),
      eventHash: ledgerEntry.eventHash,
      payloadHash: ledgerEntry.payloadHash,
    };
  });
}
