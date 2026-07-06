import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  requiresCommercialCorpusEntitlement,
  resolveCommercialCorpusGate,
} from "@/app/lib/server/commercialCorpusAccess";

vi.mock("@/app/utils/serverAuth", () => ({
  getSupabaseSessionUser: vi.fn(),
}));

vi.mock("@/app/lib/auth/platformAdminAccess", () => ({
  canUsePlatformAdminTools: vi.fn(),
}));

vi.mock("@/app/utils/serverTenantContext", () => ({
  getHostBoundTenantUuid: vi.fn(),
  getScopedTenantUuidFromCookies: vi.fn(),
}));

vi.mock("@/app/lib/billing/tenantBillingEntitlement", () => ({
  resolveTenantBillingEntitlementByUuid: vi.fn(),
}));

import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import { canUsePlatformAdminTools } from "@/app/lib/auth/platformAdminAccess";
import {
  getHostBoundTenantUuid,
  getScopedTenantUuidFromCookies,
} from "@/app/utils/serverTenantContext";
import { resolveTenantBillingEntitlementByUuid } from "@/app/lib/billing/tenantBillingEntitlement";

describe("requiresCommercialCorpusEntitlement", () => {
  it("requires entitlement for LEVEL_1 and TRAINING corpora", () => {
    expect(requiresCommercialCorpusEntitlement("LEVEL_1")).toBe(true);
    expect(requiresCommercialCorpusEntitlement("TRAINING")).toBe(true);
  });

  it("allows public publisher docs without entitlement", () => {
    expect(requiresCommercialCorpusEntitlement("LEVEL_2")).toBe(false);
  });
});

describe("resolveCommercialCorpusGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(canUsePlatformAdminTools).mockResolvedValue(false);
    vi.mocked(getHostBoundTenantUuid).mockResolvedValue(null);
    vi.mocked(getScopedTenantUuidFromCookies).mockResolvedValue("tenant-uuid-1");
  });

  it("returns unauthenticated for guest readers", async () => {
    vi.mocked(getSupabaseSessionUser).mockResolvedValue(null);

    await expect(
      resolveCommercialCorpusGate("LEVEL_2", "/docs/technical/foo"),
    ).resolves.toEqual({
      status: "unauthenticated",
      loginNextPath: "/docs/technical/foo",
    });
  });

  it("allows authenticated technical docs without entitlement", async () => {
    vi.mocked(getSupabaseSessionUser).mockResolvedValue({ id: "user-1" } as never);

    await expect(
      resolveCommercialCorpusGate("LEVEL_2", "/docs/technical/foo"),
    ).resolves.toEqual({ status: "allowed" });
  });

  it("returns billing_hold for pending tenants", async () => {
    vi.mocked(getSupabaseSessionUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(resolveTenantBillingEntitlementByUuid).mockResolvedValue({
      tenantSlug: "bwc",
      status: "PENDING",
      blocked: true,
    });

    await expect(
      resolveCommercialCorpusGate("TRAINING", "/docs/training/level-1/01"),
    ).resolves.toEqual({ status: "billing_hold", billingStatus: "PENDING" });
  });

  it("allows platform admins through operator corpus gates", async () => {
    vi.mocked(getSupabaseSessionUser).mockResolvedValue({ id: "admin-1" } as never);
    vi.mocked(canUsePlatformAdminTools).mockResolvedValue(true);

    await expect(
      resolveCommercialCorpusGate("LEVEL_1", "/docs/user-manuals/quickstart"),
    ).resolves.toEqual({ status: "allowed" });
  });
});
