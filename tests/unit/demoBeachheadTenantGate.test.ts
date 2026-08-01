import { afterEach, describe, expect, it } from "vitest";
import {
  filterDemoBeachheadTenants,
  isDemoBeachheadTenantSlug,
  isProductionDemoBeachheadFilterActive,
} from "@/app/lib/demoBeachheadTenantGate";

describe("demoBeachheadTenantGate", () => {
  const originalVercel = process.env.VERCEL_ENV;
  const originalShow = process.env.IRONFRAME_SHOW_DEMO_BEACHHEAD_TENANTS;
  const originalForce = process.env.IRONFRAME_FORCE_PRODUCTION_TENANT_FILTER;

  afterEach(() => {
    if (originalVercel === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalVercel;
    if (originalShow === undefined) delete process.env.IRONFRAME_SHOW_DEMO_BEACHHEAD_TENANTS;
    else process.env.IRONFRAME_SHOW_DEMO_BEACHHEAD_TENANTS = originalShow;
    if (originalForce === undefined) delete process.env.IRONFRAME_FORCE_PRODUCTION_TENANT_FILTER;
    else process.env.IRONFRAME_FORCE_PRODUCTION_TENANT_FILTER = originalForce;
  });

  it("recognizes demo beachhead slugs", () => {
    expect(isDemoBeachheadTenantSlug("medshield")).toBe(true);
    expect(isDemoBeachheadTenantSlug("VaultBank")).toBe(true);
    expect(isDemoBeachheadTenantSlug("gridcore")).toBe(true);
    expect(isDemoBeachheadTenantSlug("acorp")).toBe(false);
  });

  it("does not filter outside production", () => {
    delete process.env.VERCEL_ENV;
    delete process.env.IRONFRAME_FORCE_PRODUCTION_TENANT_FILTER;
    delete process.env.IRONFRAME_SHOW_DEMO_BEACHHEAD_TENANTS;
    expect(isProductionDemoBeachheadFilterActive()).toBe(false);
    const rows = [
      { slug: "medshield", id: "m1" },
      { slug: "acorp", id: "a1" },
    ];
    expect(filterDemoBeachheadTenants(rows)).toEqual(rows);
  });

  it("hides unassigned demo beachheads on production", () => {
    process.env.VERCEL_ENV = "production";
    delete process.env.IRONFRAME_SHOW_DEMO_BEACHHEAD_TENANTS;
    const rows = [
      { slug: "medshield", id: "m1" },
      { slug: "vaultbank", id: "v1" },
      { slug: "acorp", id: "a1" },
    ];
    expect(filterDemoBeachheadTenants(rows)).toEqual([{ slug: "acorp", id: "a1" }]);
  });

  it("keeps demo beachheads when explicitly assigned", () => {
    process.env.VERCEL_ENV = "production";
    const rows = [
      { slug: "medshield", id: "m1" },
      { slug: "acorp", id: "a1" },
    ];
    expect(filterDemoBeachheadTenants(rows, ["m1"])).toEqual(rows);
  });

  it("keeps host-bound demo beachhead on subdomain", () => {
    process.env.VERCEL_ENV = "production";
    const rows = [
      { slug: "medshield", id: "m1" },
      { slug: "vaultbank", id: "v1" },
    ];
    expect(filterDemoBeachheadTenants(rows, [], { hostTenantId: "m1" })).toEqual([
      { slug: "medshield", id: "m1" },
    ]);
  });

  it("allows opt-out via IRONFRAME_SHOW_DEMO_BEACHHEAD_TENANTS", () => {
    process.env.VERCEL_ENV = "production";
    process.env.IRONFRAME_SHOW_DEMO_BEACHHEAD_TENANTS = "1";
    expect(isProductionDemoBeachheadFilterActive()).toBe(false);
  });
});
