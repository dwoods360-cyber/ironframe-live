import { beforeEach, describe, expect, it, vi } from "vitest";

import { WORKSPACE_INVITATION_STATUS } from "@/app/utils/invitation-core";

const prismaMock = vi.hoisted(() => ({
  tenantWorkspaceInvitation: {
    findUnique: vi.fn(),
  },
  userRoleAssignment: {
    findFirst: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

vi.mock("@/app/lib/tenantSlugRegistry", () => ({
  lookupTenantBySlug: vi.fn().mockResolvedValue({ id: "tenant-bwc", slug: "bwc", name: "BWC" }),
}));

vi.mock("@/app/utils/serverAuth", () => ({
  getSupabaseSessionUser: vi.fn(),
}));

vi.mock("@/app/lib/server/workspaceInviteIngressRouting", () => ({
  operatorSupabaseAccountExists: vi.fn(),
}));

vi.mock("@/app/lib/auth/workspaceActivationLanding", () => ({
  buildTenantActivationLandingUrl: (slug: string) => `http://${slug}.lvh.me:3000/get-started?activation=1`,
}));

vi.mock("@/app/lib/tenantSubdomain", () => ({
  buildTenantLoginRedirectUrl: (slug: string) => `http://${slug}.lvh.me:3000/login`,
}));

import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import { operatorSupabaseAccountExists } from "@/app/lib/server/workspaceInviteIngressRouting";
import { resolveConsumedWorkspaceInviteRedirect } from "@/app/lib/server/workspaceInvitationRecovery";

describe("resolveConsumedWorkspaceInviteRedirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for active invitations", async () => {
    prismaMock.tenantWorkspaceInvitation.findUnique.mockResolvedValue({
      status: WORKSPACE_INVITATION_STATUS.ACTIVE,
      email: "wil@blackwoodscoffee.com",
      tenantSlug: "bwc",
    });

    await expect(resolveConsumedWorkspaceInviteRedirect("token-1")).resolves.toBeNull();
  });

  it("redirects activated operators with a live session to get-started", async () => {
    prismaMock.tenantWorkspaceInvitation.findUnique.mockResolvedValue({
      status: WORKSPACE_INVITATION_STATUS.CONSUMED,
      email: "wil@blackwoodscoffee.com",
      tenantSlug: "bwc",
    });
    vi.mocked(getSupabaseSessionUser).mockResolvedValue({
      id: "user-1",
      email: "wil@blackwoodscoffee.com",
    } as never);
    prismaMock.userRoleAssignment.findFirst.mockResolvedValue({ id: "role-1" });

    await expect(resolveConsumedWorkspaceInviteRedirect("token-1")).resolves.toEqual({
      redirectTo: "http://bwc.lvh.me:3000/get-started?activation=1",
      reason: "active-session",
    });
  });

  it("redirects activated operators without a session to tenant login", async () => {
    prismaMock.tenantWorkspaceInvitation.findUnique.mockResolvedValue({
      status: WORKSPACE_INVITATION_STATUS.CONSUMED,
      email: "wil@blackwoodscoffee.com",
      tenantSlug: "bwc",
    });
    vi.mocked(getSupabaseSessionUser).mockResolvedValue(null);
    vi.mocked(operatorSupabaseAccountExists).mockResolvedValue(true);

    await expect(resolveConsumedWorkspaceInviteRedirect("token-1")).resolves.toEqual({
      redirectTo: "http://bwc.lvh.me:3000/login",
      reason: "sign-in-required",
    });
  });
});
