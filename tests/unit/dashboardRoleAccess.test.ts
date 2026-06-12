import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveDashboardAccess } from "@/app/lib/auth/dashboardRoleAccess";

vi.mock("@/lib/prisma", () => ({
  default: {
    userRoleAssignment: {
      findFirst: vi.fn(),
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
  getScopedTenantUuidFromCookies: vi.fn(async () => null),
  isValidTenantUuid: (value: string | null | undefined) =>
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim()),
}));

import prisma from "@/lib/prisma";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";

describe("resolveDashboardAccess", () => {
  beforeEach(() => {
    vi.mocked(getSupabaseSessionUser).mockResolvedValue({
      id: "c3c6bbd4-603b-4d14-b4fd-9ed07fd3e70b",
      email: "operator@example.com",
    } as never);
  });

  it("returns pending when authenticated user has no role rows", async () => {
    vi.mocked(prisma.userRoleAssignment.findFirst).mockResolvedValue(null);
    const result = await resolveDashboardAccess();
    expect(result).toEqual({
      status: "pending",
      userId: "c3c6bbd4-603b-4d14-b4fd-9ed07fd3e70b",
      tenantUuid: null,
    });
  });

  it("returns pending instead of throwing when prisma fails", async () => {
    vi.mocked(prisma.userRoleAssignment.findFirst).mockRejectedValue(
      new Error("NotFoundError: user_role_assignments"),
    );
    const result = await resolveDashboardAccess();
    expect(result.status).toBe("pending");
  });
});
