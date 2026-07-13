import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";

const { findFirst, findMany, findUnique } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    userRoleAssignment: { findFirst, findMany },
    tenant: { findUnique },
  },
}));

vi.mock("@/app/utils/serverAuth", () => ({
  getSupabaseSessionUser: vi.fn(),
}));

vi.mock("@/app/lib/auth/platformAdminAccess", () => ({
  isPlatformAdministratorIdentity: vi.fn(),
}));

vi.mock("@/app/lib/auth/perimeterWorkforceAccess", () => ({
  canUsePerimeterWorkforce: vi.fn(),
  requirePerimeterWorkforceOperator: vi.fn(),
}));

import { isPlatformAdministratorIdentity } from "@/app/lib/auth/platformAdminAccess";
import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import {
  assertTenantSlugInPartnerScope,
  requirePartnerProvisioner,
  resolvePartnerProvisionerScope,
} from "@/app/lib/auth/partnerProvisionerAccess";

describe("partnerProvisionerAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isPlatformAdministratorIdentity).mockResolvedValue(false);
    vi.mocked(requirePerimeterWorkforceOperator).mockResolvedValue({ userId: "partner-1" });
    findMany.mockResolvedValue([{ tenantId: "tenant-a" }, { tenantId: "tenant-b" }]);
    findUnique.mockResolvedValue({ id: "tenant-a" });
  });

  it("returns all scope for platform administrators", async () => {
    vi.mocked(isPlatformAdministratorIdentity).mockResolvedValue(true);
    await expect(resolvePartnerProvisionerScope("admin-1", "ops@ironframe.test")).resolves.toEqual({
      kind: "all",
    });
  });

  it("returns assigned tenant ids for partner operators", async () => {
    await expect(resolvePartnerProvisionerScope("partner-1")).resolves.toEqual({
      kind: "assigned",
      tenantIds: ["tenant-a", "tenant-b"],
    });
  });

  it("requires partner provisioner gate", async () => {
    vi.mocked(requirePerimeterWorkforceOperator).mockResolvedValue({
      error: "denied",
    });
    await expect(requirePartnerProvisioner()).resolves.toEqual({
      error:
        "GLOBAL_ADMIN or designated BUSINESS_ADMIN role required to manage client workspaces.",
    });
  });

  it("allows scoped slug checks for assigned tenants", async () => {
    const allowed = await assertTenantSlugInPartnerScope(
      { userId: "partner-1", scope: { kind: "assigned", tenantIds: ["tenant-a"] } },
      "client-a",
    );
    expect(allowed).toEqual({ ok: true });
    expect(findUnique).toHaveBeenCalledWith({
      where: { slug: "client-a" },
      select: { id: true },
    });
  });

  it("denies scoped slug checks outside assignment", async () => {
    findUnique.mockResolvedValue({ id: "tenant-z" });
    const denied = await assertTenantSlugInPartnerScope(
      { userId: "partner-1", scope: { kind: "assigned", tenantIds: ["tenant-a"] } },
      "client-z",
    );
    expect(denied).toEqual({
      ok: false,
      error: "You do not have access to manage that client workspace.",
    });
  });
});
