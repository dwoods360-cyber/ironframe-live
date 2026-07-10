import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    company: {
      findMany: vi.fn(),
    },
    userRoleAssignment: {
      findMany: vi.fn(),
    },
    threatEvent: {
      findMany: vi.fn(),
    },
    riskEvent: {
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
    vi.mocked(prisma.company.findMany).mockResolvedValue([{ id: 1n }] as never);
    vi.mocked(prisma.threatEvent.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.riskEvent.findMany).mockResolvedValue([] as never);
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

    expect(roster).toEqual(
      expect.arrayContaining([
        { userId: "other-user-id", value: "other-user-id", label: "analyst@run4c.example" },
        { userId: "wil-user-id", value: "wil-user-id", label: "Wil W" },
        { userId: "dereck", value: "dereck", label: "Dereck" },
        { userId: "user_01", value: "user_01", label: "user_01" },
      ]),
    );
    expect(roster).toHaveLength(4);
  });

  it("merges historical threat assignees when membership rows are absent", async () => {
    vi.mocked(prisma.userRoleAssignment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.threatEvent.findMany).mockResolvedValue([
      { assigneeId: "legacy-analyst-42" },
    ] as never);

    const roster = await fetchTenantAssigneeRoster("tenant-uuid-empty");

    expect(roster.map((row) => row.value)).toEqual(
      expect.arrayContaining(["dereck", "user_01", "legacy-analyst-42"]),
    );
    expect(createSupabaseAdminClient).toHaveBeenCalled();
  });

  it("expands roster to all platform operators and auth users for GLOBAL_ADMIN", async () => {
    vi.mocked(prisma.userRoleAssignment.findMany).mockImplementation(async (args) => {
      if (args?.where && "tenantId" in (args.where as object)) {
        return [{ userId: "tenant-only-user" }] as never;
      }
      return [
        { userId: "tenant-only-user" },
        { userId: "bwc-wil-user" },
        { userId: "other-tenant-user" },
      ] as never;
    });

    vi.mocked(createSupabaseAdminClient).mockReturnValue({
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [
                {
                  id: "bwc-wil-user",
                  email: "wil@blackwoodscoffee.com",
                  user_metadata: {},
                },
                {
                  id: "auth-only-user",
                  email: "invite-pending@ironframe.test",
                  user_metadata: {},
                },
              ],
            },
            error: null,
          }),
        },
      },
    } as never);

    const roster = await fetchTenantAssigneeRoster("tenant-uuid-medshield", {
      expandForPlatformAdmin: true,
    });

    expect(roster.map((row) => row.value)).toEqual(
      expect.arrayContaining([
        "tenant-only-user",
        "bwc-wil-user",
        "other-tenant-user",
        "auth-only-user",
        "dereck",
        "user_01",
      ]),
    );
    expect(roster.length).toBeGreaterThanOrEqual(6);
  });
});
