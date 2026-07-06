import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    userRoleAssignment: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/app/lib/grc/devConstitutionalElevation", () => ({
  isDevConstitutionalAuthorityUser: vi.fn().mockReturnValue(false),
}));

vi.mock("@/app/utils/serverAuth", () => ({
  getSupabaseSessionUser: vi.fn(),
  userEligibleForRemoteAccessToggle: vi.fn().mockReturnValue(false),
}));

import prisma from "@/lib/prisma";
import { isPlatformAdministratorIdentity } from "@/app/lib/auth/platformAdminAccess";

describe("isPlatformAdministratorIdentity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.userRoleAssignment.findFirst).mockResolvedValue(null);
  });

  it("allows the canonical platform GLOBAL_ADMIN email without a DB assignment", async () => {
    await expect(
      isPlatformAdministratorIdentity("user-uuid-1", "dwoods360@gmail.com"),
    ).resolves.toBe(true);
    expect(prisma.userRoleAssignment.findFirst).not.toHaveBeenCalled();
  });

  it("falls back to GLOBAL_ADMIN role assignment for other operators", async () => {
    vi.mocked(prisma.userRoleAssignment.findFirst).mockResolvedValue({ id: "row-1" });

    await expect(
      isPlatformAdministratorIdentity("user-uuid-2", "other@example.com"),
    ).resolves.toBe(true);
    expect(prisma.userRoleAssignment.findFirst).toHaveBeenCalled();
  });

  it("denies unrelated operators without GLOBAL_ADMIN assignment", async () => {
    await expect(
      isPlatformAdministratorIdentity("user-uuid-3", "guest@example.com"),
    ).resolves.toBe(false);
  });
});
