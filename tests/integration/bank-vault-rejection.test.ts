import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const MEDSHIELD_TENANT_UUID = "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => {
      if (name === "ironframe-tenant") {
        return { value: MEDSHIELD_TENANT_UUID };
      }
      return undefined;
    },
  })),
  headers: vi.fn(async () => ({
    get: (_name: string) => null,
  })),
}));

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    threatEvent: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    company: {
      findUnique: vi.fn(),
      findFirst: vi.fn(async () => ({ id: 100n })),
    },
    tenant: {
      findUnique: vi.fn(async () => ({ id: MEDSHIELD_TENANT_UUID })),
      findFirst: vi.fn(async () => ({ id: MEDSHIELD_TENANT_UUID })),
    },
    $transaction: vi.fn(),
    threatApproval: {
      findUnique: vi.fn(),
    },
    evidenceAttachment: {
      findFirst: vi.fn(),
    },
    riskEvent: {
      findFirst: vi.fn(async () => null),
    },
    auditLog: {
      create: vi.fn(),
    },
    $executeRaw: vi.fn(async () => 1),
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

vi.mock("@/app/lib/server/ironguardSessionTenant", () => ({
  withIronguardTenant: vi.fn(async (_tenant: string, fn: (tx: typeof prismaMock) => unknown) =>
    fn(prismaMock)),
}));

import { resolveThreatAction } from "@/app/actions/threatActions";

describe("Epic 11 bank vault rejection gate", () => {
  beforeEach(() => {
    prismaMock.threatEvent.findUnique.mockReset();
    prismaMock.company.findUnique.mockReset();
    prismaMock.tenant.findUnique.mockReset();
    prismaMock.threatApproval.findUnique.mockReset();
    prismaMock.evidenceAttachment.findFirst.mockReset();
  });

  it("rejects protocol violation when resolution approval id is random/unapproved", async () => {
    prismaMock.threatEvent.findUnique.mockResolvedValue({
      id: "threat-bank-vault-001",
      tenantCompanyId: 100n,
      resolutionApprovalId: "random-approval-id-not-approved",
      assigneeId: "operator-001",
    });
    prismaMock.company.findUnique.mockResolvedValue({
      tenantId: MEDSHIELD_TENANT_UUID,
    });
    prismaMock.company.findFirst.mockResolvedValue({ id: 100n });
    prismaMock.tenant.findUnique.mockResolvedValue({
      id: MEDSHIELD_TENANT_UUID,
    });
    prismaMock.threatApproval.findUnique.mockResolvedValue(null);

    const result = await resolveThreatAction(
      "threat-bank-vault-001",
      "operator-001",
      "This resolution attempt includes sufficient text but must fail strict vault gating.",
      "Operator",
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "GRC_PROTOCOL_VIOLATION: Missing approved attestation or evidence artifact.",
      );
    }
  });
});
