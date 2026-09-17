import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    tenant: { findMany: mocks.findMany },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/app/lib/server/ironguardSessionTenant", () => ({
  withIronguardTenant: async (tenantId: string, run: (tx: unknown) => unknown) =>
    run({
      cronJobArtifact: {
        create: async ({ data }: { data: { tenantId: string; agentName: string } }) => ({
          id: `artifact-${tenantId}-${data.agentName}`,
        }),
      },
    }),
}));

import {
  listCatalogTenantIds,
  readExplicitCronTenantId,
  recordCronJobArtifact,
  resolveCronTenantIds,
} from "@/app/lib/server/cronTenantScope";

describe("cron tenant scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists catalog tenant ids in stable order", async () => {
    mocks.findMany.mockResolvedValue([{ id: "t-2" }, { id: "t-1" }]);
    await expect(listCatalogTenantIds()).resolves.toEqual(["t-2", "t-1"]);
    expect(mocks.findMany).toHaveBeenCalledWith({
      select: { id: true },
      orderBy: { id: "asc" },
    });
  });

  it("uses an explicit tenant and otherwise iterates the catalog", async () => {
    await expect(resolveCronTenantIds("  tenant-a  ")).resolves.toEqual(["tenant-a"]);
    expect(mocks.findMany).not.toHaveBeenCalled();

    mocks.findMany.mockResolvedValue([{ id: "t-1" }, { id: "t-2" }]);
    await expect(resolveCronTenantIds(null)).resolves.toEqual(["t-1", "t-2"]);
  });

  it("fails closed when the tenant catalog is empty", async () => {
    mocks.findMany.mockResolvedValue([]);
    await expect(resolveCronTenantIds()).rejects.toThrow("CRON_TENANT_CATALOG_EMPTY");
  });

  it("records cron artifacts inside a bound tenant transaction", async () => {
    await expect(
      recordCronJobArtifact({
        tenantId: "11111111-1111-4111-8111-111111111111",
        agentName: "industry-scout",
        payloadJson: { ok: true },
      }),
    ).resolves.toEqual({
      id: "artifact-11111111-1111-4111-8111-111111111111-industry-scout",
    });
  });

  it("reads explicit cron tenant from header then query then extra", () => {
    const previous = process.env.SHADOW_PLANE_INGEST_TENANT_UUID;
    delete process.env.SHADOW_PLANE_INGEST_TENANT_UUID;
    try {
      const request = new Request("https://example.com/api/internal/cron/industry-scout?tenantId=from-query", {
        headers: { "x-tenant-id": "from-header" },
      });
      expect(readExplicitCronTenantId(request, "from-extra")).toBe("from-header");
      expect(
        readExplicitCronTenantId(
          new Request("https://example.com/api/internal/cron/industry-scout?tenantId=from-query"),
          "from-extra",
        ),
      ).toBe("from-query");
      expect(
        readExplicitCronTenantId(new Request("https://example.com/api/internal/cron/industry-scout"), "from-extra"),
      ).toBe("from-extra");
      expect(
        readExplicitCronTenantId(new Request("https://example.com/api/internal/cron/industry-scout")),
      ).toBeNull();
    } finally {
      if (previous === undefined) delete process.env.SHADOW_PLANE_INGEST_TENANT_UUID;
      else process.env.SHADOW_PLANE_INGEST_TENANT_UUID = previous;
    }
  });
});
