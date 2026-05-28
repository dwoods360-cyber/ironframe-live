import { createSign, generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  assertTenantBoundAsymmetricSignature,
  PkiVerificationGuardError,
  resolvePkiPublicKeyPem,
  tenantBoundsPayloadMessage,
  verifyTenantBoundAsymmetricSignature,
} from "@/app/lib/crypto/pkiSignatureVerifier";

describe("pkiSignatureVerifier — Epic 11", () => {
  let privatePem = "";
  let publicPem = "";
  const tenantUuid = "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01";
  const entityId = "threat-vault-pki-001";

  beforeEach(() => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
    process.env.PUBLIC_KEY_VAULT_RELEASE = publicPem;
    process.env.PUBLIC_KEY_CISO_HANDSHAKE = publicPem;
  });

  afterEach(() => {
    delete process.env.PUBLIC_KEY_VAULT_RELEASE;
    delete process.env.PUBLIC_KEY_CISO_HANDSHAKE;
  });

  function signMessage(message: string): string {
    const signer = createSign("RSA-SHA256");
    signer.update(message, "utf8");
    signer.end();
    return signer.sign(privatePem, "base64");
  }

  it("resolves configured role PEM keys fail-closed when malformed", () => {
    const resolved = resolvePkiPublicKeyPem("VAULT_RELEASE");
    expect(resolved).not.toBeNull();
    expect(resolved).toContain("BEGIN PUBLIC KEY");
    process.env.PUBLIC_KEY_VAULT_RELEASE = "not-a-pem";
    expect(resolvePkiPublicKeyPem("VAULT_RELEASE")).toBeNull();
  });

  it("verifies tenant-bound vault release signatures", () => {
    const message = `${entityId}:${tenantUuid}:supervisor-001`;
    const signature = signMessage(message);

    expect(tenantBoundsPayloadMessage(tenantUuid, entityId, message)).toBe(true);
    expect(
      verifyTenantBoundAsymmetricSignature({
        role: "VAULT_RELEASE",
        tenantUuid,
        entityId,
        message,
        signature,
        financialRiskCents: 470000000n,
      }),
    ).toBe(true);
  });

  it("returns false for tenant mismatch and invalid signatures", () => {
    const message = `${entityId}:${tenantUuid}:supervisor-001`;
    expect(
      verifyTenantBoundAsymmetricSignature({
        role: "VAULT_RELEASE",
        tenantUuid: "other-tenant-uuid",
        entityId,
        message,
        signature: signMessage(message),
      }),
    ).toBe(false);

    expect(
      verifyTenantBoundAsymmetricSignature({
        role: "VAULT_RELEASE",
        tenantUuid,
        entityId,
        message,
        signature: "invalid-signature",
      }),
    ).toBe(false);
  });

  it("throws guard exception on assert failure", () => {
    expect(() =>
      assertTenantBoundAsymmetricSignature({
        role: "CISO_HANDSHAKE",
        tenantUuid,
        entityId,
        message: `${entityId}:approval-1:operator-1`,
        signature: "bad-signature",
      }),
    ).toThrow(PkiVerificationGuardError);
  });
});
