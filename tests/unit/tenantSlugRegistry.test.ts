import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeProvisionedTenantSlug } from "@/app/lib/tenantSlugRegistry";

vi.mock("@/lib/prisma", () => ({
  default: {
    tenant: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import prisma from "@/lib/prisma";
import { lookupTenantBySlug, invalidateTenantSlugCache } from "@/app/lib/tenantSlugRegistry";

describe("tenantSlugRegistry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateTenantSlugCache();
  });

  it("normalizes valid client slugs and rejects reserved labels", () => {
    expect(normalizeProvisionedTenantSlug("AcmeCorp")).toBe("acmecorp");
    expect(normalizeProvisionedTenantSlug("www")).toBeNull();
    expect(normalizeProvisionedTenantSlug("vendors")).toBeNull();
  });

  it("loads tenant rows by slug from the database", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: "11111111-1111-1111-1111-111111111111",
      slug: "acmecorp",
      name: "Acme Corp",
    } as never);

    const row = await lookupTenantBySlug("acmecorp");
    expect(row?.id).toBe("11111111-1111-1111-1111-111111111111");
    expect(prisma.tenant.findUnique).toHaveBeenCalledTimes(1);

    await lookupTenantBySlug("acmecorp");
    expect(prisma.tenant.findUnique).toHaveBeenCalledTimes(1);
  });
});
