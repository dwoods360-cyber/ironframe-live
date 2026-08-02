import { describe, expect, it } from "vitest";

import {
  listMsspFreeDirectorySeeds,
  parseDirectoryImportPaste,
} from "@/app/lib/ironleadsMsspFreeDirectorySeeds";
import { isSalesDispatchHoldCompany } from "@/app/lib/approvalDispatchValidation";
import { looksLikeOsintTitleNoise } from "@/app/lib/server/ironleadsBuyingCommitteeExtract";

describe("MSSP free-directory import helpers", () => {
  it("parses CSV / TSV / pipe paste lines", () => {
    const rows = parseDirectoryImportPaste(
      [
        "# comment",
        "CyberDuo, https://www.cyberduo.com, COMPLIANCE_JOB_POST",
        "NopalCyber\thttps://nopalcyber.com",
        "Packetlabs | https://www.packetlabs.com | NEW_CISO",
        "",
      ].join("\n"),
    );
    expect(rows).toHaveLength(3);
    expect(rows[0]?.companyName).toBe("CyberDuo");
    expect(rows[0]?.websiteUrl).toBe("https://www.cyberduo.com");
    expect(rows[1]?.companyName).toBe("NopalCyber");
    expect(rows[2]?.detectedTrigger).toBe("NEW_CISO");
  });

  it("parses company-only lines and inline URLs without commas", () => {
    const rows = parseDirectoryImportPaste(
      ["TechHeights", "OSIbeyond https://osibeyond.com", "1. Teal Tech", "Teal Tech"].join("\n"),
    );
    expect(rows.map((r) => r.companyName)).toEqual(["TechHeights", "OSIbeyond", "Teal Tech"]);
    expect(rows[1]?.websiteUrl).toMatch(/osibeyond\.com/i);
  });

  it("drops MSSPProviders page chrome (logo, Best for, locations, SLA)", () => {
    const rows = parseDirectoryImportPaste(
      [
        "Ankura",
        "Ankura logo",
        "Best for: SMB to Mid-Market orgs, Manufacturing",
        "Lockport, IL",
        "1 hour SLA",
        "Serves: SMB (51-200), Mid-Market (201-1000)",
        "Teal",
      ].join("\n"),
    );
    expect(rows.map((r) => r.companyName)).toEqual(["Ankura", "Teal"]);
  });

  it("ships a non-empty curated starter pack without HOLD/noise names", () => {
    const seeds = listMsspFreeDirectorySeeds();
    expect(seeds.length).toBeGreaterThanOrEqual(3);
    for (const seed of seeds) {
      expect(looksLikeOsintTitleNoise(seed.companyName)).toBe(false);
      expect(isSalesDispatchHoldCompany(seed.companyName)).toBe(false);
      expect(seed.websiteUrl).toMatch(/^https?:\/\//i);
    }
  });
});
