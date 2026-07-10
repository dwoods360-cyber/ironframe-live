import { afterEach, describe, expect, it } from "vitest";

import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import { resolveEffectiveTenantUuidForActions } from "@/app/utils/resolveEffectiveTenantUuidForActions";
import {
  setDashboardWorkspaceFallbackTenant,
  setIronguardEffectiveTenant,
} from "@/app/utils/ironguardSession";

describe("resolveEffectiveTenantUuidForActions", () => {
  const run4cUuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  afterEach(() => {
    document.cookie = "ironframe-tenant=; path=/; max-age=0";
    setIronguardEffectiveTenant(null);
    setDashboardWorkspaceFallbackTenant(null);
  });

  it("prefers TenantProvider host UUID over stale medshield cookie and Ironguard", () => {
    document.cookie = `ironframe-tenant=${TENANT_UUIDS.medshield}; path=/`;
    setIronguardEffectiveTenant(TENANT_UUIDS.medshield);
    expect(resolveEffectiveTenantUuidForActions(run4cUuid, null)).toBe(run4cUuid);
  });

  it("uses dashboard workspace fallback before cookie when context is still null", () => {
    document.cookie = `ironframe-tenant=${TENANT_UUIDS.medshield}; path=/`;
    setDashboardWorkspaceFallbackTenant(run4cUuid);
    expect(resolveEffectiveTenantUuidForActions(null, null)).toBe(run4cUuid);
  });

  it("falls back to cookie on apex when no host binding exists", () => {
    document.cookie = `ironframe-tenant=${TENANT_UUIDS.vaultbank}; path=/`;
    expect(resolveEffectiveTenantUuidForActions(null, null)).toBe(TENANT_UUIDS.vaultbank);
  });

  it("returns null on apex host without tenant scope (no implicit Medshield)", () => {
    expect(resolveEffectiveTenantUuidForActions(null, null)).toBeNull();
  });
});
