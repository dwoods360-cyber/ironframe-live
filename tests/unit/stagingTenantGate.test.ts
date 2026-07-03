import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  filterHiddenStagingTenants,
  isHiddenStagingTenantSlug,
} from "@/app/lib/stagingTenantGate";

describe("stagingTenantGate", () => {
  const original = process.env.IRONFRAME_ENABLE_BWC_STAGING;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.IRONFRAME_ENABLE_BWC_STAGING;
    } else {
      process.env.IRONFRAME_ENABLE_BWC_STAGING = original;
    }
  });

  it("hides bwc slug by default", () => {
    delete process.env.IRONFRAME_ENABLE_BWC_STAGING;
    expect(isHiddenStagingTenantSlug("bwc")).toBe(true);
    expect(isHiddenStagingTenantSlug("BWC")).toBe(true);
    expect(isHiddenStagingTenantSlug("medshield")).toBe(false);
  });

  it("shows bwc when staging flag enabled", () => {
    process.env.IRONFRAME_ENABLE_BWC_STAGING = "1";
    expect(isHiddenStagingTenantSlug("bwc")).toBe(false);
  });

  it("filters hidden tenants from scope rows", () => {
    delete process.env.IRONFRAME_ENABLE_BWC_STAGING;
    const rows = [
      { slug: "medshield", id: "1" },
      { slug: "bwc", id: "2" },
    ];
    expect(filterHiddenStagingTenants(rows)).toEqual([{ slug: "medshield", id: "1" }]);
  });

  it("keeps staging-hidden tenants when the operator is explicitly assigned", () => {
    delete process.env.IRONFRAME_ENABLE_BWC_STAGING;
    const rows = [
      { slug: "run3", id: "run3-id" },
      { slug: "bwc", id: "bwc-id" },
    ];
    expect(filterHiddenStagingTenants(rows, ["bwc-id"])).toEqual(rows);
  });
});
