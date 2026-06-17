import { describe, expect, it } from "vitest";

import {
  buildVendorSupplyChainNodes,
  resolveCascadedVendorRisk,
} from "@/app/lib/ironmap/vendorSupplyChainGraph";
import type { VendorRecord } from "@/app/vendors/schema";

describe("vendorSupplyChainGraph", () => {
  it("elevates cascaded risk when a subprocessor is in BREACH", () => {
    const vendor: VendorRecord = {
      vendorName: "Test Vendor",
      associatedEntity: "MEDSHIELD",
      industry: "Healthcare",
      riskTier: "HIGH",
      securityRating: "80/100",
      contractStatus: "ACTIVE",
      documentExpirationDate: new Date().toISOString(),
      lastRequestSent: null,
      currentCadence: "90",
      criticalSubProcessors: [{ name: "Compromised CDN", status: "BREACH" }],
    };
    expect(resolveCascadedVendorRisk(vendor)).toBe("CRITICAL");
  });

  it("builds graph nodes for master vendor registry", () => {
    const nodes = buildVendorSupplyChainNodes();
    expect(nodes.length).toBeGreaterThan(0);
    for (const node of nodes) {
      expect(node.vendorId).toMatch(/^[a-z0-9-]+$/);
      expect(node.healthScore.grade).toMatch(/^[A-F]$/);
    }
  });
});
