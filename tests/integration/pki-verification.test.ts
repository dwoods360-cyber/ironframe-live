import { generateKeyPairSync } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_ID = "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/app/utils/serverAuth", () => ({
  getSupabaseSessionUser: vi.fn(async () => ({
    id: "auditor-user-001",
    email: "auditor@ironframe.local",
  })),
}));

vi.mock("@/app/utils/serverTenantContext", () => ({
  getActiveTenantUuidFromCookies: vi.fn(async () => "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01"),
}));

const { prismaMock } = vi.hoisted(() => {
  const mock = {
    $queryRaw: vi.fn(async () => [{ present: false }]),
    $executeRaw: vi.fn(async () => 1),
    userRoleAssignment: {
      findFirst: vi.fn(async () => ({ id: "role-auditor" })),
    },
    integrityEvent: {
      findMany: vi.fn(async () => [
        {
          id: "ie-1",
          tenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
          eventType: "EVIDENCE_ATTACHED",
          payloadHash: "hash-a",
          createdAt: new Date("2026-04-27T00:00:00.000Z"),
        },
      ]),
    },
    threatApproval: {
      findMany: vi.fn(async () => [
        {
          id: "approval-1",
          tenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
          status: "APPROVED",
          threatId: "threat-1",
          createdAt: new Date("2026-04-27T00:10:00.000Z"),
        },
      ]),
    },
    evidenceArtifact: {
      findMany: vi.fn(async () => [
        {
          id: "artifact-1",
          tenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
          sha256: "abc",
          storagePath: "uploads/evidence/a.bin",
          mimeType: "application/octet-stream",
          createdAt: new Date("2026-04-27T00:20:00.000Z"),
        },
      ]),
    },
    integrityExport: {
      create: vi.fn(async () => ({ id: "export-1" })),
    },
  };
  return {
    prismaMock: {
      ...mock,
      $transaction: vi.fn(async (run: (tx: typeof mock) => Promise<unknown>) => run(mock)),
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

import { generateSignedExport, verifyExportManifest } from "@/app/actions/auditActions";

describe("Epic 11 PKI signature audit", () => {
  beforeEach(() => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
    process.env.PRIVATE_KEY = privatePem;
    process.env.PUBLIC_KEY_ID = "vault-key-2026";
    process.env.PUBLIC_KEY_VAULT_KEY_2026 = publicPem;
    process.env.PUBLIC_KEY = publicPem;
  });

  it("verifies valid export and fails after manifest mutation", async () => {
    const generated = await generateSignedExport(
      TENANT_ID,
      "2026-04-01T00:00:00.000Z",
      "2026-04-30T23:59:59.000Z",
    );
    expect(generated.ok).toBe(true);
    if (!generated.ok) throw new Error("failed to generate export bundle");

    const valid = await verifyExportManifest(generated.bundle);
    expect(valid.isValid).toBe(true);

    const tamperedBundle = {
      ...generated.bundle,
      data: {
        ...generated.bundle.data,
        tenantId: `${generated.bundle.data.tenantId}-tampered`,
      },
    };
    const tampered = await verifyExportManifest(tamperedBundle);
    expect(tampered.isValid).toBe(false);
  });
});
