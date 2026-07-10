import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => {
      if (name === "ironframe-tenant") {
        return { value: "tenant-medshield-uuid" };
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
      findUnique: vi.fn(async () => ({ id: "tenant-medshield-uuid" })),
      findFirst: vi.fn(async () => ({ id: "tenant-medshield-uuid" })),
    },
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

import { resolveThreatAction } from "@/app/actions/threatActions";

describe("Epic 11 bank vault rejection gate", () => {
  beforeEach(() => {
    prismaMock.threatEvent.findUnique.mockReset();
    prismaMock.company.findUnique.mockReset();
    prismaMock.tenant.findUnique.mockReset();
    prismaMock.threatApproval.findUnique.mockReset();
    prismaMock.evidenceAttachment.findFirst.mockReset();
  });

  it("throws protocol violation when resolution approval id is random/unapproved", async () => {
    prismaMock.threatEvent.findUnique.mockResolvedValue({
      id: "threat-bank-vault-001",
      tenantCompanyId: 100n,
      resolutionApprovalId: "random-approval-id-not-approved",
      assigneeId: "operator-001",
    });
    prismaMock.company.findUnique.mockResolvedValue({
      tenantId: "tenant-medshield-uuid",
    });
    prismaMock.tenant.findUnique.mockResolvedValue({
      id: "tenant-medshield-uuid",
    });
    prismaMock.threatApproval.findUnique.mockResolvedValue(null);

    await expect(
      resolveThreatAction(
        "threat-bank-vault-001",
        "operator-001",
        "This resolution attempt includes sufficient text but must fail strict vault gating.",
        "Operator",
      ),
    ).rejects.toThrow(
      "GRC_PROTOCOL_VIOLATION: Missing approved attestation or evidence artifact.",
    );
  });
});
