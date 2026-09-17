import { beforeEach, describe, expect, it, vi } from "vitest";

const TENANT = "11111111-1111-4111-8111-111111111111";

const mocks = vi.hoisted(() => ({
  withIronguardTenant: vi.fn(),
  create: vi.fn(async () => ({ id: "audit-1" })),
  getCookie: vi.fn(),
  getPrivileged: vi.fn(() => {
    throw new Error("PRIVILEGED_DATABASE_URL_REQUIRED");
  }),
}));

vi.mock("@/app/lib/server/ironguardSessionTenant", () => ({
  withIronguardTenant: mocks.withIronguardTenant,
}));

vi.mock("@/app/utils/serverTenantContext", () => ({
  getActiveTenantUuidFromCookies: mocks.getCookie,
}));

vi.mock("@/lib/prismaPrivileged", () => ({
  getPrismaPrivileged: mocks.getPrivileged,
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    riskEvent: { findFirst: vi.fn() },
    threatEvent: { findFirst: vi.fn() },
  },
}));

import { auditLogCreateLoose } from "@/lib/auditLogLoose";

describe("auditLogCreateLoose tenant binding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCookie.mockResolvedValue(null);
    mocks.withIronguardTenant.mockImplementation(
      async (_tenantId: string, run: (tx: { auditLog: { create: typeof mocks.create } }) => unknown) =>
        run({ auditLog: { create: mocks.create } }),
    );
  });

  it("binds and stamps tenantId from governance_tenant_uuid", async () => {
    await auditLogCreateLoose({
      data: {
        action: "TEST",
        operatorId: "op",
        governance_tenant_uuid: TENANT,
        isSimulation: false,
      },
    });

    expect(mocks.withIronguardTenant).toHaveBeenCalledWith(TENANT, expect.any(Function));
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: TENANT,
          governance_tenant_uuid: TENANT,
        }),
      }),
    );
  });

  it("fails closed when no tenant can be resolved", async () => {
    await expect(
      auditLogCreateLoose({
        data: {
          action: "TEST",
          operatorId: "op",
          isSimulation: false,
        },
      }),
    ).rejects.toThrow("IRONGUARD_SESSION_TENANT_UUID_REQUIRED");
    expect(mocks.withIronguardTenant).not.toHaveBeenCalled();
  });
});
