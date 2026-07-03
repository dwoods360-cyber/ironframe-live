import { describe, expect, it } from "vitest";

import {
  buildVendorRegistryCsv,
  buildVendorRegistryExportRows,
  buildVendorRegistrySummary,
} from "@/app/lib/vendorRegistryExport";

describe("vendorRegistryExport", () => {
  it("builds summary metrics from the master vendor registry", () => {
    const summary = buildVendorRegistrySummary();
    expect(summary.totalVendors).toBeGreaterThan(0);
    expect(summary.byRiskTier.CRITICAL).toBeGreaterThanOrEqual(0);
    expect(summary.exportedAtIso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("serializes vendor rows to CSV with headers", () => {
    const rows = buildVendorRegistryExportRows().slice(0, 2);
    const csv = buildVendorRegistryCsv(rows);
    expect(csv.split("\n")[0]).toBe(
      "vendorName,associatedEntity,industry,riskTier,securityRating,contractStatus,daysUntilExpiration,healthGrade,healthScore",
    );
    expect(csv.split("\n")).toHaveLength(3);
  });
});
