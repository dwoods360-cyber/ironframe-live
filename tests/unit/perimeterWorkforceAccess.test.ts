import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";

const { findFirst } = vi.hoisted(() => ({
  findFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    userRoleAssignment: { findFirst },
  },
}));

vi.mock("@/app/utils/serverAuth", () => ({
  getSupabaseSessionUser: vi.fn(),
}));

vi.mock("@/app/lib/auth/platformAdminAccess", () => ({
  isPlatformAdministratorIdentity: vi.fn(),
}));

import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import { isPlatformAdministratorIdentity } from "@/app/lib/auth/platformAdminAccess";
import {
  canUsePerimeterWorkforce,
  canUsePerimeterWorkforceFromSession,
} from "@/app/lib/auth/perimeterWorkforceAccess";

describe("perimeterWorkforceAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isPlatformAdministratorIdentity).mockResolvedValue(false);
    findFirst.mockResolvedValue(null);
  });

  it("allows GLOBAL_ADMIN via platform administrator identity", async () => {
    vi.mocked(isPlatformAdministratorIdentity).mockResolvedValue(true);

    await expect(canUsePerimeterWorkforce("user-1", "ops@ironframe.test")).resolves.toBe(true);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("allows designated BUSINESS_ADMIN assignments", async () => {
    findFirst.mockResolvedValue({ id: "assignment-1" });

    await expect(canUsePerimeterWorkforce("user-2")).resolves.toBe(true);
    expect(findFirst).toHaveBeenCalledWith({
      where: { userId: "user-2", role: UserRole.BUSINESS_ADMIN },
      select: { id: true },
    });
  });

  it("denies tenant operators without BUSINESS_ADMIN designation", async () => {
    await expect(canUsePerimeterWorkforce("user-3")).resolves.toBe(false);
  });

  it("resolves session-backed perimeter access", async () => {
    vi.mocked(getSupabaseSessionUser).mockResolvedValue({
      id: "user-4",
      email: "biz@ironframe.test",
    } as never);
    findFirst.mockResolvedValue({ id: "assignment-2" });

    await expect(canUsePerimeterWorkforceFromSession()).resolves.toBe(true);
  });
});
