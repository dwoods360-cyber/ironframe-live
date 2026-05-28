import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  unstable_noStore: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => {
      if (name === "ironframe-tenant") {
        return { value: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01" };
      }
      return undefined;
    },
  })),
}));

vi.mock("@/app/utils/serverAuth", () => ({
  getSupabaseSessionUser: vi.fn(async () => ({ id: "operator-001" })),
}));

vi.mock("@/app/actions/agentActions", () => ({
  ironwatchSignShredReceiptPayload: vi.fn(async () => "deadbeef".repeat(8)),
  ironwatchEmitForensicShredIntel: vi.fn(async () => undefined),
}));

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    company: {
      findMany: vi.fn(async () => [{ id: 100n }]),
      findUnique: vi.fn(async () => ({ sector: "Financial" })),
    },
    riskEvent: {
      findFirst: vi.fn(),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    evidenceChapter: {
      findFirst: vi.fn(async () => null),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    auditReceipt: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: "receipt-1" })),
    },
    integrityEvent: {
      findFirst: vi.fn(async () => null),
    },
    forensicSealLedger: {
      findFirst: vi.fn(async () => null),
    },
    threatEvent: {
      findFirst: vi.fn(async () => null),
    },
    threatApproval: {
      findUnique: vi.fn(),
    },
    evidenceAttachment: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

import { executeDigitalShred } from "@/app/actions/shredderActions";
import { EPIC_12_SHRED_BLOCK_MESSAGE } from "@/app/lib/evidence/signedAttestationGuard";

describe("Epic 12 — shredder attestation immutability guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.riskEvent.findFirst.mockReset();
    prismaMock.threatEvent.findFirst.mockReset();
    prismaMock.integrityEvent.findFirst.mockReset();
    prismaMock.forensicSealLedger.findFirst.mockReset();
    prismaMock.$transaction.mockReset();
  });

  it("blocks shred and skips DB mutations when bank vault dual-gate attestation exists", async () => {
    prismaMock.riskEvent.findFirst.mockResolvedValue({
      id: "risk-vault-sealed-001",
      title: "Vault sealed case",
      financialRisk_cents: 50_000n,
      postMortemReportPath: "uploads/post-mortem.pdf",
      tenantCompanyId: 100n,
    });
    prismaMock.threatEvent.findFirst.mockResolvedValue({
      ingestionDetails: JSON.stringify({
        bankVaultHitlRelease: {
          event: "BANK_VAULT_HITL_RELEASE",
          attestationSignature: "vault-sig-abc",
        },
      }),
      dispositionStatus: "BANK_VAULT_HITL_RELEASE",
      receiptHash: "receipt-sha256-anchor",
      resolutionApprovalId: null,
    });

    const result = await executeDigitalShred("risk-vault-sealed-001", "operator-001");

    expect(result).toEqual({ ok: false, error: EPIC_12_SHRED_BLOCK_MESSAGE });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("allows shred when no attestation signals are present", async () => {
    prismaMock.riskEvent.findFirst.mockResolvedValue({
      id: "risk-unattested-001",
      title: "Open chapter",
      financialRisk_cents: 10_000n,
      postMortemReportPath: null,
      tenantCompanyId: 100n,
    });
    prismaMock.threatEvent.findFirst.mockResolvedValue(null);
    prismaMock.$transaction.mockResolvedValue([]);

    const result = await executeDigitalShred("risk-unattested-001", "operator-001");

    expect(result.ok).toBe(true);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });
});
