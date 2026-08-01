import { describe, expect, it } from "vitest";

import { normalizeSuspectCompanyKey } from "@/app/lib/ingress/ironleadsSuspectIdentity";
import { collapseSuspectRowsByCompany } from "@/app/lib/server/dedupeIronleadsSuspectsCore";

describe("normalizeSuspectCompanyKey", () => {
  it("collapses CBIZ / short-name Pivot Point variants", () => {
    expect(normalizeSuspectCompanyKey("CBIZ Pivot Point Security")).toBe(
      "pivot point security",
    );
    expect(normalizeSuspectCompanyKey("Pivot Point Security")).toBe(
      "pivot point security",
    );
    expect(normalizeSuspectCompanyKey("  CBIZ   Pivot Point Security  ")).toBe(
      "pivot point security",
    );
  });

  it("still normalizes whitespace and case", () => {
    expect(normalizeSuspectCompanyKey("  U.S. Department of Health ")).toBe(
      "u.s. department of health",
    );
  });
});

describe("collapseSuspectRowsByCompany", () => {
  it("keeps one row for CBIZ vs short Pivot Point names", () => {
    const rows = collapseSuspectRowsByCompany([
      {
        id: "thin",
        company: "Pivot Point Security",
        priorityScore: 55,
        detectedTrigger: "COMPLIANCE_JOB_POST",
        createdAt: "2026-08-01T16:00:00.000Z",
      },
      {
        id: "rich",
        company: "CBIZ Pivot Point Security",
        priorityScore: 55,
        detectedTrigger: "COMPLIANCE_JOB_POST",
        createdAt: "2026-08-01T16:27:00.000Z",
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("rich");
  });
});
