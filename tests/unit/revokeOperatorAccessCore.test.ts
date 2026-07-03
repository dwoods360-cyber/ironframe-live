import { beforeEach, describe, expect, it, vi } from "vitest";

import { revokeOperatorAccessCore } from "@/app/lib/server/revokeOperatorAccessCore";
import { WORKSPACE_INVITATION_STATUS } from "@/app/utils/invitation-core";

const TENANT_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";

const deleteUser = vi.fn();
const updateUserById = vi.fn();
const signOut = vi.fn();

vi.mock("@/lib/prisma", () => ({
  default: {
    tenant: { findUnique: vi.fn() },
    userRoleAssignment: {
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    tenantWorkspaceInvitation: {
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auditLogLoose", () => ({
  auditLogCreateLoose: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    auth: { admin: { deleteUser, updateUserById, signOut } },
  })),
}));

vi.mock("@/app/lib/server/supabaseAuthAdminHelpers", () => ({
  findSupabaseAuthUserByEmail: vi.fn(),
  revokeAllSupabaseSessionsForUser: vi.fn(),
}));

import prisma from "@/lib/prisma";
import { findSupabaseAuthUserByEmail, revokeAllSupabaseSessionsForUser } from "@/app/lib/server/supabaseAuthAdminHelpers";

describe("revokeOperatorAccessCore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: TENANT_ID,
      slug: "run4",
      name: "Run Four",
    } as never);
    vi.mocked(findSupabaseAuthUserByEmail).mockResolvedValue({
      id: USER_ID,
      email: "operator@example.com",
      user_metadata: { tenant_slug: "run4" },
    } as never);
    vi.mocked(prisma.userRoleAssignment.deleteMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.tenantWorkspaceInvitation.updateMany).mockResolvedValue({ count: 1 });
    deleteUser.mockResolvedValue({ error: null });
    updateUserById.mockResolvedValue({ error: null });
    vi.mocked(revokeAllSupabaseSessionsForUser).mockResolvedValue({ ok: true });
  });

  it("rejects invalid email", async () => {
    const result = await revokeOperatorAccessCore({
      operatorId: "admin-1",
      email: "not-an-email",
      tenantSlugRaw: "run4",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("VALIDATION");
  });

  it("revokes assignment and clears metadata when other tenants remain", async () => {
    vi.mocked(prisma.userRoleAssignment.count).mockResolvedValue(2);

    const result = await revokeOperatorAccessCore({
      operatorId: "admin-1",
      email: "operator@example.com",
      tenantSlugRaw: "run4",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.assignmentsRemoved).toBe(1);
    expect(result.sessionsRevoked).toBe(true);
    expect(result.authUserDeleted).toBe(false);
    expect(result.metadataCleared).toBe(true);
    expect(updateUserById).toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
    expect(prisma.tenantWorkspaceInvitation.updateMany).toHaveBeenCalledWith({
      where: {
        email: "operator@example.com",
        tenantSlug: "run4",
        status: WORKSPACE_INVITATION_STATUS.ACTIVE,
      },
      data: { status: WORKSPACE_INVITATION_STATUS.REVOKED },
    });
  });

  it("deletes Supabase auth user when no assignments remain", async () => {
    vi.mocked(prisma.userRoleAssignment.count).mockResolvedValue(0);

    const result = await revokeOperatorAccessCore({
      operatorId: "admin-1",
      email: "operator@example.com",
      tenantSlugRaw: "run4",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.authUserDeleted).toBe(true);
    expect(revokeAllSupabaseSessionsForUser).toHaveBeenCalled();
    expect(deleteUser).toHaveBeenCalledWith(USER_ID);
  });

  it("returns NOT_FOUND when assignment is missing", async () => {
    vi.mocked(prisma.userRoleAssignment.deleteMany).mockResolvedValue({ count: 0 });

    const result = await revokeOperatorAccessCore({
      operatorId: "admin-1",
      email: "operator@example.com",
      tenantSlugRaw: "run4",
    });

    expect(result).toEqual({
      ok: false,
      error: 'Operator operator@example.com has no role assignment on workspace "run4".',
      code: "NOT_FOUND",
    });
  });
});
