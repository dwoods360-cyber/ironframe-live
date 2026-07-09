import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    userRoleAssignment: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

import prisma from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchTenantAssigneeRoster } from "@/app/lib/server/tenantAssigneeRoster.server";

describe("fetchTenantAssigneeRoster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns tenant-scoped operators with display labels from Supabase auth", async () => {
    vi.mocked(prisma.userRoleAssignment.findMany).mockResolvedValue([
      { userId: "wil-user-id" },
      { userId: "wil-user-id" },
      { userId: "other-user-id" },
    ] as never);

    vi.mocked(createSupabaseAdminClient).mockReturnValue({
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [
                {
                  id: "wil-user-id",
                  email: "wil@run4c.example",
                  user_metadata: { full_name: "Wil W" },
                },
                {
                  id: "other-user-id",
                  email: "analyst@run4c.example",
                  user_metadata: {},
                },
                {
                  id: "dereck-user-id",
                  email: "dwoods360@gmail.com",
                  user_metadata: { full_name: "Dereck" },
                },
              ],
            },
            error: null,
          }),
        },
      },
    } as never);

    const roster = await fetchTenantAssigneeRoster("tenant-uuid-run4c");

    expect(roster).toEqual([
      { userId: "other-user-id", value: "other-user-id", label: "analyst@run4c.example" },
      { userId: "wil-user-id", value: "wil-user-id", label: "Wil W" },
    ]);
    expect(roster.some((row) => row.label === "Dereck")).toBe(false);
  });

  it("returns empty roster when tenant has no role assignments", async () => {
    vi.mocked(prisma.userRoleAssignment.findMany).mockResolvedValue([] as never);

    const roster = await fetchTenantAssigneeRoster("tenant-uuid-empty");

    expect(roster).toEqual([]);
    expect(createSupabaseAdminClient).not.toHaveBeenCalled();
  });
});
