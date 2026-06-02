import { createHash } from "node:crypto";
import { verifyTenantBoundAsymmetricSignature } from "@/app/lib/crypto/pkiSignatureVerifier";
import { resolveVaultPublicKeyPem } from "@/lib/security/vaultPublicKeyEnv";

export type VaultSignatureVerifyInput = {
  /** PEM (SPKI) or configured key id (`PUBLIC_KEY_<ID>` env). */
  publicKey: string;
  /** Base64 RSA-SHA256 signature over `message`. */
  signature: string;
  message: string;
};

function resolvePublicKeyPem(publicKeyOrId: string): string | null {
  return resolveVaultPublicKeyPem(publicKeyOrId);
}

/**
 * Epic 11.4 — Gate A: verify secondary supervisor hardware/software signature (RSA-SHA256).
 */
export function cryptoVerifySignature(input: VaultSignatureVerifyInput): boolean {
  const pem = resolvePublicKeyPem(input.publicKey);
  if (!pem) return false;

  const tenantUuid = extractTenantFromVaultMessage(input.message);
  const entityId = extractEntityFromVaultMessage(input.message);
  if (tenantUuid && entityId) {
    return verifyTenantBoundAsymmetricSignature({
      role: "VAULT_RELEASE",
      tenantUuid,
      entityId,
      message: input.message,
      signature: input.signature,
      publicKeyPemOverride: pem,
    });
  }

  return false;
}

function extractTenantFromVaultMessage(message: string): string {
  const parts = message.split(":");
  return parts.length >= 2 ? parts[1].trim() : "";
}

function extractEntityFromVaultMessage(message: string): string {
  const parts = message.split(":");
  return parts.length >= 1 ? parts[0].trim() : "";
}

/** Challenge block for dual-gate attestation (replay-resistant binding). */
export function buildBankVaultChallengeMessage(
  threatId: string,
  tenantId: string,
  operatorId: string,
): string {
  return `${threatId.trim()}:${tenantId.trim()}:${operatorId.trim()}`;
}

export function vaultIntegrityDisplayHash(signatureBase64: string): string {
  return createHash("sha256").update(signatureBase64.trim(), "utf8").digest("hex").slice(0, 16);
}
