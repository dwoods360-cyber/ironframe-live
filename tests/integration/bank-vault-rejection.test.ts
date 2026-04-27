import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    threatEvent: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    company: {
      findUnique: vi.fn(),
    },
    threatApproval: {
      findUnique: vi.fn(),
    },
    evidenceAttachment: {
      findFirst: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
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
    prismaMock.threatApproval.findUnique.mockReset();
    prismaMock.evidenceAttachment.findFirst.mockReset();
  });

  it("throws protocol violation when resolution approval id is random/unapproved", async () => {
    prismaMock.threatEvent.findUnique.mockResolvedValue({
      id: "threat-bank-vault-001",
      tenantCompanyId: 100n,
      resolutionApprovalId: "random-approval-id-not-approved",
    });
    prismaMock.company.findUnique.mockResolvedValue({
      tenantId: "tenant-medshield-uuid",
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
