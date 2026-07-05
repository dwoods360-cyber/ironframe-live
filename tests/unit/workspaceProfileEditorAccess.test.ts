import { UserRole } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    userRoleAssignment: {
      findFirst: vi.fn(),
    },
  },
}));

import prisma from "@/lib/prisma";
import {
  canEditWorkspaceProfile,
  WORKSPACE_PROFILE_EDITOR_ROLES,
} from "@/app/lib/auth/workspaceProfileEditorAccess";

describe("workspaceProfileEditorAccess", () => {
  it("allows GRC_MANAGER and CISO roles", () => {
    expect(WORKSPACE_PROFILE_EDITOR_ROLES).toContain(UserRole.GRC_MANAGER);
    expect(WORKSPACE_PROFILE_EDITOR_ROLES).toContain(UserRole.CISO);
  });

  it("returns true when assignment matches editor role", async () => {
    vi.mocked(prisma.userRoleAssignment.findFirst).mockResolvedValue({ id: "a1" } as never);
    await expect(canEditWorkspaceProfile("user-1", "tenant-1")).resolves.toBe(true);
  });

  it("returns false when no editor assignment exists", async () => {
    vi.mocked(prisma.userRoleAssignment.findFirst).mockResolvedValue(null);
    await expect(canEditWorkspaceProfile("user-1", "tenant-1")).resolves.toBe(false);
  });
});
