import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveApexWorkspaceLandingSlug } from "@/app/lib/auth/resolveApexWorkspaceLandingSlug";

vi.mock("@/lib/prisma", () => ({
  default: {
    userRoleAssignment: {
      findFirst: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/app/lib/tenantSlugRegistry", () => ({
  lookupTenantBySlug: vi.fn(),
}));

import prisma from "@/lib/prisma";
import { lookupTenantBySlug } from "@/app/lib/tenantSlugRegistry";

const USER_ID = "c3c6bbd4-603b-4d14-b4fd-9ed07fd3e70b";

describe("resolveApexWorkspaceLandingSlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(lookupTenantBySlug).mockResolvedValue(null);
    vi.mocked(prisma.userRoleAssignment.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(null);
  });

  it("returns metadata slug when assignment still exists on that workspace", async () => {
    vi.mocked(lookupTenantBySlug).mockResolvedValue({
      id: "tenant-run2",
      slug: "run2",
      name: "Run 2",
    });
    vi.mocked(prisma.userRoleAssignment.findFirst).mockResolvedValueOnce({ id: "assignment-1" });

    const slug = await resolveApexWorkspaceLandingSlug(USER_ID, "run2");
    expect(slug).toBe("run2");
  });

  it("ignores stale metadata slug and falls back to the primary assignment", async () => {
    vi.mocked(lookupTenantBySlug).mockResolvedValue({
      id: "tenant-run2",
      slug: "run2",
      name: "Run 2",
    });
    vi.mocked(prisma.userRoleAssignment.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ tenantId: "tenant-bwc" });
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ slug: "bwc" });

    const slug = await resolveApexWorkspaceLandingSlug(USER_ID, "run2");
    expect(slug).toBe("bwc");
  });

  it("returns null when metadata is stale and no assignments remain", async () => {
    vi.mocked(lookupTenantBySlug).mockResolvedValue({
      id: "tenant-run2",
      slug: "run2",
      name: "Run 2",
    });
    vi.mocked(prisma.userRoleAssignment.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const slug = await resolveApexWorkspaceLandingSlug(USER_ID, "run2");
    expect(slug).toBeNull();
  });

  it("uses primary assignment when metadata slug is absent", async () => {
    vi.mocked(prisma.userRoleAssignment.findFirst).mockResolvedValueOnce({ tenantId: "tenant-bwc" });
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ slug: "bwc" });

    const slug = await resolveApexWorkspaceLandingSlug(USER_ID, null);
    expect(slug).toBe("bwc");
  });
});
