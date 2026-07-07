import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveDashboardAccess } from "@/app/lib/auth/dashboardRoleAccess";

const MED = "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01";
const VAULT = "c6932d16-a716-4a07-9bc4-6ec987f641e2";

vi.mock("@/lib/prisma", () => ({
  default: {
    userRoleAssignment: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/app/utils/serverAuth", () => ({
  getSupabaseSessionUser: vi.fn(),
}));

vi.mock("@/app/lib/grc/devConstitutionalElevation", () => ({
  isDevConstitutionalAuthorityUser: vi.fn(() => false),
}));

vi.mock("@/app/utils/serverTenantContext", () => ({
  getHostBoundTenantUuid: vi.fn(async () => null),
  getScopedTenantUuidFromCookies: vi.fn(async () => null),
  isValidTenantUuid: (value: string | null | undefined) =>
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim()),
}));

import prisma from "@/lib/prisma";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";

describe("resolveDashboardAccess", () => {
  beforeEach(async () => {
    const { getHostBoundTenantUuid, getScopedTenantUuidFromCookies } = await import(
      "@/app/utils/serverTenantContext"
    );
    vi.mocked(getHostBoundTenantUuid).mockResolvedValue(null);
    vi.mocked(getScopedTenantUuidFromCookies).mockResolvedValue(null);
    vi.mocked(getSupabaseSessionUser).mockResolvedValue({
      id: "c3c6bbd4-603b-4d14-b4fd-9ed07fd3e70b",
      email: "operator@example.com",
    } as never);
    vi.mocked(prisma.userRoleAssignment.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.userRoleAssignment.findMany).mockResolvedValue([]);
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(null);
  });

  it("returns pending when authenticated user has no role rows", async () => {
    const result = await resolveDashboardAccess();
    expect(result).toEqual({
      status: "pending",
      userId: "c3c6bbd4-603b-4d14-b4fd-9ed07fd3e70b",
      tenantUuid: null,
    });
  });

  it("returns pending instead of throwing when prisma fails", async () => {
    vi.mocked(prisma.userRoleAssignment.findMany).mockRejectedValue(
      new Error("NotFoundError: user_role_assignments"),
    );
    const result = await resolveDashboardAccess();
    expect(result.status).toBe("pending");
  });

  it("falls back to first assignment when no tenant cookie is present", async () => {
    vi.mocked(prisma.userRoleAssignment.findMany).mockResolvedValue([
      { tenantId: MED },
      { tenantId: VAULT },
    ]);

    const result = await resolveDashboardAccess();
    expect(result).toEqual({
      status: "allowed",
      userId: "c3c6bbd4-603b-4d14-b4fd-9ed07fd3e70b",
      tenantUuid: MED,
      tenantFallbackApplied: true,
    });
  });

  it("uses cookie tenant when assignment exists for that scope", async () => {
    const { getScopedTenantUuidFromCookies } = await import("@/app/utils/serverTenantContext");
    vi.mocked(getScopedTenantUuidFromCookies).mockResolvedValue(VAULT);
    vi.mocked(prisma.userRoleAssignment.findFirst).mockResolvedValue({
      id: "role-1",
      tenantId: VAULT,
    } as never);

    const result = await resolveDashboardAccess();
    expect(result).toEqual({
      status: "allowed",
      userId: "c3c6bbd4-603b-4d14-b4fd-9ed07fd3e70b",
      tenantUuid: VAULT,
      tenantFallbackApplied: false,
    });
  });

  it("returns pending on host-bound tenant without RBAC assignment", async () => {
    const { getHostBoundTenantUuid, getScopedTenantUuidFromCookies } = await import(
      "@/app/utils/serverTenantContext"
    );
    vi.mocked(getHostBoundTenantUuid).mockResolvedValue(VAULT);
    vi.mocked(getScopedTenantUuidFromCookies).mockResolvedValue(VAULT);
    vi.mocked(prisma.userRoleAssignment.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.userRoleAssignment.findMany).mockResolvedValue([{ tenantId: MED }]);

    const result = await resolveDashboardAccess();
    expect(result).toEqual({
      status: "pending",
      userId: "c3c6bbd4-603b-4d14-b4fd-9ed07fd3e70b",
      tenantUuid: VAULT,
    });
  });

  it("allows platform GLOBAL_ADMIN email on apex without RBAC rows", async () => {
    vi.mocked(getSupabaseSessionUser).mockResolvedValue({
      id: "owner-uuid",
      email: "dwoods360@gmail.com",
    } as never);

    const result = await resolveDashboardAccess();
    expect(result).toEqual({
      status: "allowed",
      userId: "owner-uuid",
      tenantUuid: MED,
      tenantFallbackApplied: true,
    });
    expect(prisma.userRoleAssignment.findMany).not.toHaveBeenCalled();
  });

  it("allows platform GLOBAL_ADMIN email on host-bound subdomain without RBAC rows", async () => {
    const { getHostBoundTenantUuid } = await import("@/app/utils/serverTenantContext");
    vi.mocked(getHostBoundTenantUuid).mockResolvedValue(VAULT);
    vi.mocked(getSupabaseSessionUser).mockResolvedValue({
      id: "owner-uuid",
      email: "dwoods360@gmail.com",
    } as never);

    const result = await resolveDashboardAccess();
    expect(result).toEqual({
      status: "allowed",
      userId: "owner-uuid",
      tenantUuid: VAULT,
      tenantFallbackApplied: true,
    });
  });
});
