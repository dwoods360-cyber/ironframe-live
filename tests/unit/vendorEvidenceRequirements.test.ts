import { describe, expect, it } from "vitest";

import {
  INDUSTRY_EVIDENCE_SUPPLEMENTS,
  resolveRequiredVendorEvidence,
  tenantEntityLabelFromSlug,
} from "@/app/vendors/vendorEvidenceRequirements";

describe("vendorEvidenceRequirements", () => {
  const vendorTypeRequirements = {
    SaaS: ["SOC2", "Privacy Policy"],
    "On-Prem Software": ["ISO 27001", "Vulnerability Scan Report"],
    "Managed Services": ["SOC2", "Business Continuity Plan", "Incident Response Plan"],
    Hardware: ["NIST 800-161", "ISO 9001"],
  };

  it("merges vendor-type baseline with industry supplements", () => {
    expect(
      resolveRequiredVendorEvidence({
        vendorType: "SaaS",
        industry: "Healthcare",
        vendorTypeRequirements,
      }),
    ).toEqual(["SOC2", "Privacy Policy", ...INDUSTRY_EVIDENCE_SUPPLEMENTS.Healthcare]);

    expect(
      resolveRequiredVendorEvidence({
        vendorType: "Hardware",
        industry: "Defense",
        vendorTypeRequirements,
      }),
    ).toEqual(["NIST 800-161", "ISO 9001", ...INDUSTRY_EVIDENCE_SUPPLEMENTS.Defense]);
  });

  it("updates when industry changes", () => {
    const saasFinance = resolveRequiredVendorEvidence({
      vendorType: "SaaS",
      industry: "Finance",
      vendorTypeRequirements,
    });
    const saasHealthcare = resolveRequiredVendorEvidence({
      vendorType: "SaaS",
      industry: "Healthcare",
      vendorTypeRequirements,
    });
    expect(saasFinance).not.toEqual(saasHealthcare);
    expect(saasFinance).toContain("PCI DSS AOC");
    expect(saasHealthcare).toContain("HIPAA BAA");
  });

  it("maps tenant slugs to registry entity labels", () => {
    expect(tenantEntityLabelFromSlug("medshield")).toBe("MEDSHIELD");
    expect(tenantEntityLabelFromSlug("acorp")).toBe("ACORP");
  });
});
