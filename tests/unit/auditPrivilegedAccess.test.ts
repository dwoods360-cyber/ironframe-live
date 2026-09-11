import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  privilegedFindMany: vi.fn(),
  privilegedFindUnique: vi.fn(),
  getPrivileged: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/lib/auth/platformAdminAccess", () => ({
  requirePlatformAdministrator: mocks.requireAdmin,
}));
vi.mock("@/lib/prismaPrivileged", () => ({
  getPrismaPrivileged: mocks.getPrivileged,
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    userRoleAssignment: { findFirst: vi.fn() },
  },
}));
vi.mock("@/app/utils/serverTenantContext", () => ({
  getActiveTenantUuidFromCookies: vi.fn(),
}));
vi.mock("@/app/utils/serverAuth", () => ({
  getSupabaseSessionUser: vi.fn(),
}));
vi.mock("@/app/lib/grc/devConstitutionalElevation", () => ({
  resolveDevConstitutionalAuthorityUserId: vi.fn(),
}));
vi.mock("@/app/lib/server/ironguardSessionTenant", () => ({
  withIronguardTenant: vi.fn(),
}));
vi.mock("@/src/services/threatStateService", () => ({
  transitionThreatStatus: vi.fn(),
  updateThreatWithIntegrity: vi.fn(),
}));
vi.mock("@/lib/auditLogLoose", () => ({
  auditLogCreateLoose: vi.fn(),
  auditLogCreateLooseTx: vi.fn(),
}));

describe("Audit Intelligence privileged access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPrivileged.mockReturnValue({
      botAuditLog: {
        findMany: mocks.privilegedFindMany,
        findUnique: mocks.privilegedFindUnique,
      },
    });
  });

  it("rejects cross-tenant audit history before opening the privileged client", async () => {
    mocks.requireAdmin.mockResolvedValue({ error: "GLOBAL_ADMIN role required." });
    const { getRecentBotAuditLogs } = await import("@/app/actions/auditActions");

    await expect(getRecentBotAuditLogs()).rejects.toThrow("GLOBAL_ADMIN role required.");
    expect(mocks.getPrivileged).not.toHaveBeenCalled();
  });

  it("reads cross-tenant audit history only after platform-admin authorization", async () => {
    mocks.requireAdmin.mockResolvedValue({ userId: "admin-user" });
    mocks.privilegedFindMany.mockResolvedValue([]);
    const { getRecentBotAuditLogs } = await import("@/app/actions/auditActions");

    await expect(getRecentBotAuditLogs()).resolves.toEqual([]);
    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(mocks.privilegedFindMany).toHaveBeenCalledOnce();
  });

  it("surfaces missing privileged configuration instead of showing an empty ledger", async () => {
    mocks.requireAdmin.mockResolvedValue({ userId: "admin-user" });
    mocks.getPrivileged.mockImplementation(() => {
      throw new Error("PRIVILEGED_DATABASE_URL_REQUIRED");
    });
    const { getRecentBotAuditLogs } = await import("@/app/actions/auditActions");

    await expect(getRecentBotAuditLogs()).rejects.toThrow("PRIVILEGED_DATABASE_URL_REQUIRED");
  });

  it("rejects administrative voids before privileged receipt discovery", async () => {
    mocks.requireAdmin.mockResolvedValue({ error: "GLOBAL_ADMIN role required." });
    const { voidReceiptAndReopen } = await import("@/app/actions/auditActions");

    await expect(
      voidReceiptAndReopen("receipt-1", "threat-1", "documented void reason"),
    ).resolves.toEqual({ ok: false, error: "GLOBAL_ADMIN role required." });
    expect(mocks.getPrivileged).not.toHaveBeenCalled();
  });
});
