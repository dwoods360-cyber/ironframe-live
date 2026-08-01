import { afterEach, describe, expect, it } from "vitest";
import {
  filterNonLivePlatformTenants,
  isNonLivePlatformTenantRow,
  isNonLivePlatformTenantSlug,
  isProductionTenantSwitcherFilterActive,
} from "@/app/lib/productionTenantSwitcherGate";

describe("productionTenantSwitcherGate", () => {
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

  it("is inactive locally so GLOBAL_ADMIN keeps the full catalog", () => {
    delete process.env.VERCEL_ENV;
    delete process.env.IRONFRAME_FORCE_PRODUCTION_TENANT_FILTER;
    delete process.env.IRONFRAME_SHOW_DEMO_BEACHHEAD_TENANTS;
    expect(isProductionTenantSwitcherFilterActive()).toBe(false);
    const rows = [
      { slug: "medshield", id: "m1", name: "Medshield Health" },
      { slug: "ironframe-sandbox", id: "s1", name: "Ironframe Sandbox" },
      { slug: "acorp", id: "a1", name: "Design Partner Co." },
    ];
    expect(filterNonLivePlatformTenants(rows)).toEqual(rows);
  });

  it("recognizes platform fixtures and ephemeral test slugs", () => {
    expect(isNonLivePlatformTenantSlug("prospect-pool")).toBe(true);
    expect(isNonLivePlatformTenantSlug("stripe-e2e-corp")).toBe(true);
    expect(isNonLivePlatformTenantSlug("stripe-act-b1")).toBe(true);
    expect(isNonLivePlatformTenantSlug("a2-dryrun-mrroi1wm")).toBe(true);
    expect(isNonLivePlatformTenantSlug("ironframe-central-test")).toBe(true);
    expect(isNonLivePlatformTenantSlug("acorp")).toBe(false);
    expect(
      isNonLivePlatformTenantRow({
        slug: "run-4c",
        name: "GOLDEN PATH TEST PROTOCOL — RUN #4c",
      }),
    ).toBe(true);
    expect(
      isNonLivePlatformTenantRow({
        slug: "whatever",
        name: "[QA THROWAWAY] Ironframe Central Test",
      }),
    ).toBe(true);
  });

  it("keeps only live tenants on production", () => {
    process.env.VERCEL_ENV = "production";
    delete process.env.IRONFRAME_SHOW_DEMO_BEACHHEAD_TENANTS;
    const rows = [
      { slug: "medshield", id: "m1", name: "Medshield Health" },
      { slug: "prospect-pool", id: "p1", name: "Ironframe Prospect Pool" },
      { slug: "ironframe-sandbox", id: "s1", name: "Ironframe Sandbox" },
      { slug: "stripe-e2e-corp", id: "e1", name: "Stripe E2E Corp" },
      {
        slug: "gp-4c",
        id: "g1",
        name: "GOLDEN PATH TEST PROTOCOL — RUN #4c",
      },
      { slug: "acorp", id: "a1", name: "Design Partner Co." },
      {
        slug: "acorp-enclave-1",
        id: "c1",
        name: "Acorp Enclave",
        parentTenantId: "a1",
        enclaveRole: "SUBTENANT",
      },
    ];
    expect(filterNonLivePlatformTenants(rows).map((r) => r.slug)).toEqual([
      "acorp",
      "acorp-enclave-1",
    ]);
  });

  it("drops subtenants of non-live parents on production", () => {
    process.env.VERCEL_ENV = "production";
    const rows = [
      { slug: "medshield", id: "m1", name: "Medshield Health" },
      {
        slug: "medshield-clinic",
        id: "c1",
        name: "Medshield Clinic",
        parentTenantId: "m1",
        enclaveRole: "SUBTENANT",
      },
      { slug: "acorp", id: "a1", name: "Design Partner Co." },
    ];
    expect(filterNonLivePlatformTenants(rows).map((r) => r.slug)).toEqual(["acorp"]);
  });

  it("keeps host-bound non-live workspace on subdomain", () => {
    process.env.VERCEL_ENV = "production";
    const rows = [
      { slug: "medshield", id: "m1", name: "Medshield Health" },
      { slug: "vaultbank", id: "v1", name: "Vaultbank NA" },
    ];
    expect(filterNonLivePlatformTenants(rows, [], { hostTenantId: "m1" })).toEqual([
      { slug: "medshield", id: "m1", name: "Medshield Health" },
    ]);
  });
});
