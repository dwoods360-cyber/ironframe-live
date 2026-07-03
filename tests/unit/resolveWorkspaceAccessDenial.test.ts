import { beforeEach, describe, expect, it, vi } from "vitest";

const findUniqueTenant = vi.fn();
const findManyAssignments = vi.fn();
const findFirstAssignment = vi.fn();
const findManyTenants = vi.fn();
const findInvitations = vi.fn();
const findManyConsumedInvites = vi.fn();
const findFirstRevokedInvite = vi.fn();
const findManyAudit = vi.fn();
const createAssignment = vi.fn();

vi.mock("@/lib/prisma", () => ({
  default: {
    tenant: {
      findUnique: findUniqueTenant,
      findMany: findManyTenants,
    },
    userRoleAssignment: {
      findMany: findManyAssignments,
      findFirst: findFirstAssignment,
      create: createAssignment,
    },
    tenantWorkspaceInvitation: {
      findMany: vi.fn((args: { where?: { status?: string } }) => {
        if (args?.where?.status === "CONSUMED") {
          return findManyConsumedInvites();
        }
        return findInvitations();
      }),
      findFirst: findFirstRevokedInvite,
    },
    auditLog: {
      findMany: findManyAudit,
    },
  },
}));

describe("resolveWorkspaceAccessDenial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUniqueTenant.mockImplementation(async ({ where }: { where: { id?: string; slug?: string } }) => {
      if (where.id === "ef58739c-ada9-4d2e-89f1-ec8ca625506a" || where.slug === "run3") {
        return {
          id: "ef58739c-ada9-4d2e-89f1-ec8ca625506a",
          slug: "run3",
          name: "Run #3 — execution sequence",
        };
      }
      if (where.slug === "bwc") {
        return { id: "ba130f7c-453e-4c79-a611-0d69c1904a10", slug: "bwc", name: "The Blackwoods Coffee Co." };
      }
      return null;
    });
    findManyAssignments.mockResolvedValue([]);
    findFirstAssignment.mockResolvedValue(null);
    findManyTenants.mockResolvedValue([]);
    findManyAudit.mockResolvedValue([]);
    findFirstRevokedInvite.mockResolvedValue(null);
    findManyConsumedInvites.mockResolvedValue([]);
    createAssignment.mockResolvedValue({ id: "new-role" });
    vi.stubEnv("NEXT_PUBLIC_DEVELOPMENT_DOMAIN", "lvh.me:3000");
    vi.stubEnv("NODE_ENV", "development");
  });

  it("reports revoked on the denied tenant and restores other consumed workspaces", async () => {
    findInvitations.mockResolvedValue([{ status: "CONSUMED" }]);
    findManyConsumedInvites.mockResolvedValue([
      { tenantSlug: "run3" },
      { tenantSlug: "bwc" },
    ]);
    findManyAudit.mockImplementation(async ({ where }: { where: { tenantId?: string } }) => {
      if (where.tenantId === "ef58739c-ada9-4d2e-89f1-ec8ca625506a") {
        return [
          {
            justification:
              "Revoked wil@blackwoodscoffee.com from run3. assignmentsRemoved=1 invitationsRevoked=0 sessionsRevoked=true authUserDeleted=false metadataCleared=false remainingAssignments=0.",
          },
        ];
      }
      return [];
    });
    findManyAssignments.mockImplementation(
      async (args: { where?: { tenantId?: string | { not?: string } } }) => {
        const tenantFilter = args?.where?.tenantId;
        if (tenantFilter && typeof tenantFilter === "object" && tenantFilter.not) {
          return [{ tenantId: "ba130f7c-453e-4c79-a611-0d69c1904a10" }];
        }
        return [];
      },
    );
    findManyTenants.mockResolvedValue([
      { slug: "bwc", name: "The Blackwoods Coffee Co." },
    ]);

    const { resolveWorkspaceAccessDenial } = await import(
      "@/app/lib/server/resolveWorkspaceAccessDenial"
    );

    const result = await resolveWorkspaceAccessDenial({
      userId: "user-1",
      email: "wil@blackwoodscoffee.com",
      tenantUuid: "ef58739c-ada9-4d2e-89f1-ec8ca625506a",
    });

    expect(createAssignment).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        tenantId: "ba130f7c-453e-4c79-a611-0d69c1904a10",
        role: "GRC_MANAGER",
      },
    });
    expect(result.reason).toBe("revoked");
    expect(result.tenantSlug).toBe("run3");
    expect(result.assignedWorkspaces).toEqual([
      {
        slug: "bwc",
        name: "The Blackwoods Coffee Co.",
        loginUrl: "http://bwc.lvh.me:3000/login",
      },
    ]);
  });

  it("does not restore RBAC for consumed workspaces with a revoke audit", async () => {
    findInvitations.mockResolvedValue([{ status: "CONSUMED" }]);
    findManyConsumedInvites.mockResolvedValue([{ tenantSlug: "bwc" }]);
    findManyAudit.mockImplementation(async ({ where }: { where: { tenantId?: string } }) => {
      if (where.tenantId === "ba130f7c-453e-4c79-a611-0d69c1904a10") {
        return [{ justification: "Revoked wil@blackwoodscoffee.com from bwc." }];
      }
      return [];
    });

    const { resolveWorkspaceAccessDenial } = await import(
      "@/app/lib/server/resolveWorkspaceAccessDenial"
    );

    await resolveWorkspaceAccessDenial({
      userId: "user-1",
      email: "wil@blackwoodscoffee.com",
      tenantUuid: "ba130f7c-453e-4c79-a611-0d69c1904a10",
    });

    expect(createAssignment).not.toHaveBeenCalled();
  });
});
