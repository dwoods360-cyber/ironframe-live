import { afterEach, describe, expect, it } from "vitest";

import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import { resolveDashboardTenantUuid } from "@/app/utils/clientTenantCookie";
import { applyIronguardToFetch, IRONGUARD_NO_TENANT } from "@/app/utils/apiClient";
import {
  setDashboardWorkspaceFallbackTenant,
  setIronguardEffectiveTenant,
} from "@/app/utils/ironguardSession";

describe("resolveDashboardTenantUuid", () => {
  afterEach(() => {
    document.cookie = "ironframe-tenant=; path=/; max-age=0";
    setIronguardEffectiveTenant(null);
    setDashboardWorkspaceFallbackTenant(null);
  });

  it("returns explicit path tenant UUID without reading cookie", () => {
    expect(resolveDashboardTenantUuid(TENANT_UUIDS.vaultbank)).toBe(TENANT_UUIDS.vaultbank);
  });

  it("resolves constitutional seed tenant slug from ironframe-tenant cookie", () => {
    document.cookie = "ironframe-tenant=vaultbank; path=/";
    expect(resolveDashboardTenantUuid(null)).toBe(TENANT_UUIDS.vaultbank);
  });

  it("falls back to ironframe-tenant UUID cookie on apex host", () => {
    document.cookie = `ironframe-tenant=${TENANT_UUIDS.medshield}; path=/`;
    expect(resolveDashboardTenantUuid(null)).toBe(TENANT_UUIDS.medshield);
  });
});

describe("applyIronguardToFetch host binding", () => {
  afterEach(() => {
    setIronguardEffectiveTenant(null);
    setDashboardWorkspaceFallbackTenant(null);
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, host: "localhost:3000", origin: "http://localhost:3000" },
    });
  });

  it("blocks dashboard fetch on subdomain host until workspace fallback is bound", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        host: "vaultbank.lvh.me:3000",
        origin: "http://vaultbank.lvh.me:3000",
      },
    });

    expect(() => applyIronguardToFetch("/api/dashboard")).toThrow(IRONGUARD_NO_TENANT);

    setDashboardWorkspaceFallbackTenant(TENANT_UUIDS.vaultbank);
    const [, init] = applyIronguardToFetch("/api/dashboard");
    const headers = new Headers(init?.headers);
    expect(headers.get("x-tenant-id")).toBe(TENANT_UUIDS.vaultbank);
  });

  it("injects x-tenant-id for constitutional sentinel reads when dashboard fallback is bound", () => {
    setDashboardWorkspaceFallbackTenant(TENANT_UUIDS.gridcore);

    const [, init] = applyIronguardToFetch("/api/grc/tas-integrity");
    const headers = new Headers(init?.headers);
    expect(headers.get("x-tenant-id")).toBe(TENANT_UUIDS.gridcore);
  });
});
