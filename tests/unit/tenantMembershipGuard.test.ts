import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const assertIronguardApiTenantOr403 = vi.fn();
const getSupabaseSessionUser = vi.fn();
const isPlatformAdministratorIdentity = vi.fn();
const isDevConstitutionalAuthorityUser = vi.fn();
const findFirst = vi.fn();

vi.mock("@/app/lib/security/ironguardApiGuard", () => ({
  assertIronguardApiTenantOr403,
}));

vi.mock("@/app/utils/serverAuth", () => ({
  getSupabaseSessionUser,
}));

vi.mock("@/app/lib/auth/platformAdminAccess", () => ({
  isPlatformAdministratorIdentity,
}));

vi.mock("@/app/lib/grc/devConstitutionalElevation", () => ({
  isDevConstitutionalAuthorityUser: (...args: unknown[]) =>
    isDevConstitutionalAuthorityUser(...args),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    userRoleAssignment: {
      findFirst,
    },
  },
}));

describe("assertAuthenticatedIronguardTenantOr403", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertIronguardApiTenantOr403.mockResolvedValue({
      ok: true,
      tenantUuid: "11111111-1111-1111-1111-111111111111",
    });
  });

  it("allows unauthenticated simulation clients after Ironguard passes", async () => {
    getSupabaseSessionUser.mockResolvedValue(null);
    const { assertAuthenticatedIronguardTenantOr403 } = await import(
      "@/app/lib/security/tenantMembershipGuard"
    );

    const result = await assertAuthenticatedIronguardTenantOr403(
      new NextRequest("http://localhost/api/dashboard"),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.userId).toBeNull();
    expect(result.membershipEnforced).toBe(false);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("returns 403 when authenticated user lacks tenant assignment", async () => {
    getSupabaseSessionUser.mockResolvedValue({
      id: "user-1",
      email: "operator@example.com",
    });
    isDevConstitutionalAuthorityUser.mockReturnValue(false);
    isPlatformAdministratorIdentity.mockResolvedValue(false);
    findFirst.mockResolvedValue(null);

    const { assertAuthenticatedIronguardTenantOr403 } = await import(
      "@/app/lib/security/tenantMembershipGuard"
    );

    const result = await assertAuthenticatedIronguardTenantOr403(
      new NextRequest("http://localhost/api/dashboard"),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(403);
  });

  it("allows authenticated user with assignment", async () => {
    getSupabaseSessionUser.mockResolvedValue({
      id: "user-1",
      email: "operator@example.com",
    });
    isDevConstitutionalAuthorityUser.mockReturnValue(false);
    isPlatformAdministratorIdentity.mockResolvedValue(false);
    findFirst.mockResolvedValue({ id: "assignment-1" });

    const { assertAuthenticatedIronguardTenantOr403 } = await import(
      "@/app/lib/security/tenantMembershipGuard"
    );

    const result = await assertAuthenticatedIronguardTenantOr403(
      new NextRequest("http://localhost/api/dashboard"),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.userId).toBe("user-1");
    expect(result.membershipEnforced).toBe(true);
  });
});
