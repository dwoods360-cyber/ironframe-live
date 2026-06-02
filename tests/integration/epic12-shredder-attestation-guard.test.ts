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
      findFirst: vi.fn(),
    },
    threatApproval: {
      findUnique: vi.fn(),
    },
    evidenceAttachment: {
      findFirst: vi.fn(),
      findMany: vi.fn(async () => []),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

import { executeDigitalShred } from "@/app/actions/shredderActions";
import { EPIC_12_SHRED_BLOCK_MESSAGE } from "@/app/lib/evidence/signedAttestationGuard";
import { EPIC_12_WORM_DELETE_BLOCK_MESSAGE } from "@/app/lib/evidence/wormStoragePolicy";

describe("Epic 12 — shredder attestation immutability guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EVIDENCE_WORM_OBJECT_LOCK = "true";
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

  it("blocks shred when post-mortem artifact is on a WORM storage path", async () => {
    prismaMock.riskEvent.findFirst.mockResolvedValue({
      id: "risk-worm-sealed-001",
      title: "WORM sealed report",
      financialRisk_cents: 25_000n,
      postMortemReportPath: "supabase://evidence-locker/incident-reports/tenant/pm.pdf",
      tenantCompanyId: 100n,
    });
    prismaMock.threatEvent.findFirst.mockResolvedValue(null);

    const result = await executeDigitalShred("risk-worm-sealed-001", "operator-001");

    expect(result).toEqual({ ok: false, error: EPIC_12_WORM_DELETE_BLOCK_MESSAGE });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("blocks shred when attached evidence artifacts are on WORM storage paths", async () => {
    prismaMock.riskEvent.findFirst.mockResolvedValue({
      id: "risk-evidence-worm-001",
      title: "WORM evidence attached",
      financialRisk_cents: 15_000n,
      postMortemReportPath: null,
      tenantCompanyId: 100n,
    });
    prismaMock.threatEvent.findFirst.mockResolvedValue(null);
    prismaMock.evidenceAttachment.findMany.mockResolvedValue([
      {
        artifact: {
          storagePath: "supabase://evidence-locker/worm/tenant/artifact.pdf",
        },
      },
    ]);

    const result = await executeDigitalShred("risk-evidence-worm-001", "operator-001");

    expect(result).toEqual({ ok: false, error: EPIC_12_WORM_DELETE_BLOCK_MESSAGE });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
