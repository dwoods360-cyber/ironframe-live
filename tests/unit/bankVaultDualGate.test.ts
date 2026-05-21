import { createSign, generateKeyPairSync } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, integrityLogEvent } = vi.hoisted(() => ({
  prismaMock: {
    threatEvent: { findUnique: vi.fn(), update: vi.fn() },
    company: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(prismaMock)),
  },
  integrityLogEvent: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: prismaMock }));

vi.mock("@/src/services/integrityService", () => ({
  integrityService: { logEvent: integrityLogEvent },
}));

vi.mock("@/src/services/threatStateService", () => ({
  updateThreatWithIntegrity: vi.fn(async () => ({ id: "threat-1", status: "RESOLVED" })),
}));

import {
  buildBankVaultChallengeMessage,
  cryptoVerifySignature,
} from "@/lib/security/vaultCrypto";
import { verifyAndCommitVaultResolution, GRC_PROTOCOL_VIOLATION } from "@/src/services/bankVault/vaultResolution";

describe("Epic 11.4 bank vault dual-gate", () => {
  let privatePem = "";
  let publicPem = "";

  beforeEach(() => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
    vi.clearAllMocks();

    prismaMock.threatEvent.findUnique.mockResolvedValue({
      id: "threat-vault-1",
      tenantCompanyId: 42n,
      ingestionDetails: "{}",
    });
    prismaMock.company.findUnique.mockResolvedValue({
      tenantId: "tenant-medshield-uuid",
    });
    integrityLogEvent.mockResolvedValue({
      eventHash: "evt-hash-abc",
      payloadHash: "payload-hash-def",
    });
    prismaMock.auditLog.create.mockResolvedValue({ id: "audit-1" });
  });

  it("verifies RSA-SHA256 signatures on the challenge block", () => {
    const message = buildBankVaultChallengeMessage("t1", "tenant-a", "op-1");
    const signer = createSign("RSA-SHA256");
    signer.update(message, "utf8");
    signer.end();
    const signature = signer.sign(privatePem, "base64");

    expect(
      cryptoVerifySignature({ publicKey: publicPem, signature, message }),
    ).toBe(true);
    expect(
      cryptoVerifySignature({ publicKey: publicPem, signature: "bad", message }),
    ).toBe(false);
  });

  it("commits resolution when signature and tenant scope match", async () => {
    const tenantId = "tenant-medshield-uuid";
    const threatId = "threat-vault-1";
    const operatorId = "supervisor-001";
    const message = buildBankVaultChallengeMessage(threatId, tenantId, operatorId);
    const signer = createSign("RSA-SHA256");
    signer.update(message, "utf8");
    signer.end();
    const transactionSignature = signer.sign(privatePem, "base64");

    const result = await verifyAndCommitVaultResolution({
      threatId,
      tenantId,
      operatorId,
      supervisorPublicKey: publicPem,
      transactionSignature,
    });

    expect(result.status).toBe("PERMANENT_RELEASE_SEALED");
    expect(result.eventHash).toBe("evt-hash-abc");
    expect(result.integrityHash).toHaveLength(16);
    expect(integrityLogEvent).toHaveBeenCalled();
    expect(prismaMock.auditLog.create).toHaveBeenCalled();
  });

  it("rejects invalid secondary signatures", async () => {
    await expect(
      verifyAndCommitVaultResolution({
        threatId: "threat-vault-1",
        tenantId: "tenant-medshield-uuid",
        operatorId: "op-1",
        supervisorPublicKey: publicPem,
        transactionSignature: "not-a-valid-signature",
      }),
    ).rejects.toThrow(GRC_PROTOCOL_VIOLATION);
  });

  it("rejects tenant mismatch", async () => {
    prismaMock.company.findUnique.mockResolvedValue({ tenantId: "other-tenant" });
    const tenantId = "tenant-medshield-uuid";
    const message = buildBankVaultChallengeMessage("threat-vault-1", tenantId, "op-1");
    const signer = createSign("RSA-SHA256");
    signer.update(message, "utf8");
    signer.end();
    const transactionSignature = signer.sign(privatePem, "base64");

    await expect(
      verifyAndCommitVaultResolution({
        threatId: "threat-vault-1",
        tenantId,
        operatorId: "op-1",
        supervisorPublicKey: publicPem,
        transactionSignature,
      }),
    ).rejects.toThrow(/TENANT_MISMATCH/i);
  });
});
