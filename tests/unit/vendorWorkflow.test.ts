import { describe, expect, it } from "vitest";
import { vendorContactEmail } from "@/app/vendors/vendorContactEmail";
import { slugVendorId } from "@/app/lib/ironmap/vendorSupplyChainGraph";

describe("vendor workflow ids", () => {
  it("aligns registry vendor ids with supply-chain slugs", () => {
    expect(slugVendorId("Azure Health")).toBe("azure-health");
    expect(vendorContactEmail("Azure Health")).toBe("azure-health@vendors.ironframe.local");
  });
});
