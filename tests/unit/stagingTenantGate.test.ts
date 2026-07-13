import { describe, expect, it, afterEach } from "vitest";
import {
  filterHiddenStagingTenants,
  isHiddenStagingTenantSlug,
} from "@/app/lib/stagingTenantGate";

describe("stagingTenantGate", () => {
  const originalHidden = process.env.IRONFRAME_HIDDEN_STAGING_TENANT_SLUGS;
  const originalEnable = process.env.IRONFRAME_ENABLE_HIDDEN_STAGING_TENANTS;

  afterEach(() => {
    if (originalHidden === undefined) {
      delete process.env.IRONFRAME_HIDDEN_STAGING_TENANT_SLUGS;
    } else {
      process.env.IRONFRAME_HIDDEN_STAGING_TENANT_SLUGS = originalHidden;
    }
    if (originalEnable === undefined) {
      delete process.env.IRONFRAME_ENABLE_HIDDEN_STAGING_TENANTS;
    } else {
      process.env.IRONFRAME_ENABLE_HIDDEN_STAGING_TENANTS = originalEnable;
    }
  });

  it("hides configured staging slugs by default", () => {
    process.env.IRONFRAME_HIDDEN_STAGING_TENANT_SLUGS = "staging-alpha,staging-beta";
    delete process.env.IRONFRAME_ENABLE_HIDDEN_STAGING_TENANTS;
    expect(isHiddenStagingTenantSlug("staging-alpha")).toBe(true);
    expect(isHiddenStagingTenantSlug("medshield")).toBe(false);
  });

  it("shows hidden slugs when staging flag enabled", () => {
    process.env.IRONFRAME_HIDDEN_STAGING_TENANT_SLUGS = "staging-alpha";
    process.env.IRONFRAME_ENABLE_HIDDEN_STAGING_TENANTS = "1";
    expect(isHiddenStagingTenantSlug("staging-alpha")).toBe(false);
  });

  it("filters hidden tenants from scope rows", () => {
    process.env.IRONFRAME_HIDDEN_STAGING_TENANT_SLUGS = "staging-alpha";
    delete process.env.IRONFRAME_ENABLE_HIDDEN_STAGING_TENANTS;
    const rows = [
      { slug: "medshield", id: "1" },
      { slug: "staging-alpha", id: "2" },
    ];
    expect(filterHiddenStagingTenants(rows)).toEqual([{ slug: "medshield", id: "1" }]);
  });

  it("keeps staging-hidden tenants when the operator is explicitly assigned", () => {
    process.env.IRONFRAME_HIDDEN_STAGING_TENANT_SLUGS = "staging-alpha";
    delete process.env.IRONFRAME_ENABLE_HIDDEN_STAGING_TENANTS;
    const rows = [
      { slug: "run3", id: "run3-id" },
      { slug: "staging-alpha", id: "staging-alpha-id" },
    ];
    expect(filterHiddenStagingTenants(rows, ["staging-alpha-id"])).toEqual(rows);
  });
});
