import { beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const TENANT_B = "22222222-2222-4222-8222-222222222222";

const mocks = vi.hoisted(() => ({
  listCatalogTenantIds: vi.fn(),
  withIronguardTenant: vi.fn(),
  ironguardFindMany: vi.fn(),
  quarantineFindMany: vi.fn(),
  systemConfigFindUnique: vi.fn(),
  auditFindMany: vi.fn(),
  auditCount: vi.fn(),
  auditFindFirst: vi.fn(),
}));

vi.mock("@/app/lib/server/cronTenantScope", () => ({
  listCatalogTenantIds: mocks.listCatalogTenantIds,
}));

vi.mock("@/app/lib/server/ironguardSessionTenant", () => ({
  withIronguardTenant: mocks.withIronguardTenant,
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    quarantineLedger: { findMany: mocks.quarantineFindMany },
    auditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prismaPrivileged", () => ({
  getPrismaPrivileged: () => ({
    ironguardViolation: { findMany: mocks.ironguardFindMany },
    systemConfig: { findUnique: mocks.systemConfigFindUnique },
  }),
}));

vi.mock("@/lib/structuredServerLog", () => ({
  logStructuredEvent: vi.fn(),
}));

vi.mock("@/src/services/irontally/frameworkMapper", () => ({
  buildFrameworkComplianceMappingMarkdown: () => "",
  isIronguardBreachBlockedCode: () => false,
  sendComplianceBlindSpotIroncast: vi.fn(),
}));

import prisma from "@/lib/prisma";
import { runIronscribeDailyAuditSynthesis } from "@/src/services/ironscribe/auditSynthesizer";

describe("Ironscribe daily audit tenant binding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listCatalogTenantIds.mockResolvedValue([TENANT_A, TENANT_B]);
    mocks.ironguardFindMany.mockResolvedValue([]);
    mocks.quarantineFindMany.mockResolvedValue([]);
    mocks.systemConfigFindUnique.mockResolvedValue({ updatedAt: new Date("2026-09-17T00:00:00.000Z") });
    mocks.auditFindMany.mockResolvedValue([]);
    mocks.auditCount.mockResolvedValue(0);
    mocks.auditFindFirst.mockResolvedValue(null);
    mocks.withIronguardTenant.mockImplementation(
      async (_tenantId: string, run: (tx: unknown) => unknown) =>
        run({
          auditLog: {
            findMany: mocks.auditFindMany,
            count: mocks.auditCount,
            findFirst: mocks.auditFindFirst,
          },
        }),
    );
  });

  it("binds AuditLog scans per catalog tenant and reads platform GRC ledgers on the privileged client", async () => {
    const result = await runIronscribeDailyAuditSynthesis(new Date("2026-09-17T18:00:00.000Z"));

    expect(result.ok).toBe(true);
    expect(mocks.withIronguardTenant).toHaveBeenCalledTimes(2);
    expect(mocks.withIronguardTenant).toHaveBeenNthCalledWith(1, TENANT_A, expect.any(Function));
    expect(mocks.withIronguardTenant).toHaveBeenNthCalledWith(2, TENANT_B, expect.any(Function));
    expect(mocks.auditFindMany).toHaveBeenCalled();
    expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
    expect(prisma.auditLog.count).not.toHaveBeenCalled();
    expect(mocks.ironguardFindMany).toHaveBeenCalled();
    expect(prisma.quarantineLedger.findMany).toHaveBeenCalled();
  });
});
