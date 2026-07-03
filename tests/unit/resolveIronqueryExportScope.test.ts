import { describe, expect, it, vi } from "vitest";

import { resolveIronqueryExportScope } from "@/app/lib/ironquery/resolveIronqueryExportScope";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";

vi.mock("@/lib/prisma", () => ({
  default: {
    tenant: { findUnique: vi.fn() },
  },
}));

import prisma from "@/lib/prisma";

describe("resolveIronqueryExportScope", () => {
  it("uses seed baseline for medshield UUID", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      slug: "medshield",
      ale_baseline: 1n,
    } as never);

    const scope = await resolveIronqueryExportScope(TENANT_UUIDS.medshield);
    expect(scope).toMatchObject({
      tenantId: TENANT_UUIDS.medshield,
      exportKey: "medshield",
      aleBaselineCents: 1110000000n,
    });
  });

  it("uses tenant slug and ale_baseline for provisioned workspaces", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      slug: "run2",
      ale_baseline: 100000000n,
    } as never);

    const scope = await resolveIronqueryExportScope("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(scope).toEqual({
      tenantId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      exportKey: "run2",
      aleBaselineCents: 100000000n,
    });
  });

  it("returns null when ale baseline is unset", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      slug: "run2",
      ale_baseline: 0n,
    } as never);

    const scope = await resolveIronqueryExportScope("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(scope).toBeNull();
  });
});
