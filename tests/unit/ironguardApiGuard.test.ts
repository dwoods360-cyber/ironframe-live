import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";

const mockCookiesGet = vi.fn();
const mockCookiesSet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mockCookiesGet,
    set: mockCookiesSet,
  })),
  headers: vi.fn(async () => ({
    get: vi.fn(),
  })),
}));

vi.mock("@/app/lib/security/recordIronguardViolation", () => ({
  recordIronguardViolation: vi.fn(async () => undefined),
}));

describe("assertIronguardApiTenantOr403 host envelope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockCookiesGet.mockReturnValue({ value: TENANT_UUIDS.medshield });
  });

  it("allows same-origin reads when x-tenant-id is absent but ironframe-tenant cookie is set", async () => {
    mockCookiesGet.mockReturnValue({ value: TENANT_UUIDS.gridcore });

    const { assertIronguardApiTenantOr403 } = await import("@/app/lib/security/ironguardApiGuard");

    const request = new NextRequest("http://127.0.0.1:3000/api/grc/tas-integrity");
    const result = await assertIronguardApiTenantOr403(request);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tenantUuid).toBe(TENANT_UUIDS.gridcore);
    }
  });

  it("allows x-tenant-id that matches subdomain host when cookie is stale", async () => {
    const { assertIronguardApiTenantOr403 } = await import("@/app/lib/security/ironguardApiGuard");

    const request = new NextRequest("http://vaultbank.lvh.me:3000/api/agents/trainer", {
      method: "POST",
      headers: {
        "x-tenant-id": TENANT_UUIDS.vaultbank,
        "x-ironframe-host-tenant-uuid": TENANT_UUIDS.vaultbank,
        host: "vaultbank.lvh.me:3000",
      },
    });

    const result = await assertIronguardApiTenantOr403(request);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tenantUuid).toBe(TENANT_UUIDS.vaultbank);
    }
  });
});
