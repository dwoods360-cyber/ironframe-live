import { describe, expect, it } from "vitest";

import {
  compareSuspectReadiness,
  scoreSuspectReadiness,
} from "@/app/lib/ironleadsSuspectReadiness";

describe("ironleadsSuspectReadiness", () => {
  it("ranks named buyer + emails above website-only", () => {
    const thin = scoreSuspectReadiness({
      metadata: { websiteUrl: "https://example.com" },
      priorityScore: 55,
    });
    const rich = scoreSuspectReadiness({
      metadata: {
        websiteUrl: "https://rich.example",
        namedBuyer: { fullName: "Jordan Lee", title: "CISO" },
        buyingCommittee: {
          members: [
            {
              role: "CISO",
              fullName: "Jordan Lee",
              emails: [{ email: "jordan@rich.example", status: "published" }],
            },
            { role: "CEO", fullName: "Alex Kim", emails: [] },
          ],
        },
        candidateEmails: [
          { person: "Jordan Lee", email: "jordan@rich.example", status: "published" },
        ],
      },
      priorityScore: 55,
    });
    expect(rich.score).toBeGreaterThan(thin.score);
    expect(rich.hasNamedBuyer).toBe(true);
    expect(thin.hasNamedBuyer).toBe(false);
  });

  it("sorts richer dossiers before thinner ones", () => {
    const rows = [
      { metadata: { websiteUrl: "https://a.example" }, createdAt: new Date("2026-01-01") },
      {
        metadata: {
          namedBuyer: { fullName: "Pat Buyer" },
          websiteUrl: "https://b.example",
        },
        createdAt: new Date("2026-01-02"),
      },
    ];
    const sorted = [...rows].sort(compareSuspectReadiness);
    expect(resolveName(sorted[0])).toBe("Pat Buyer");
  });
});

function resolveName(row: { metadata: unknown }): string | null {
  const meta = row.metadata as { namedBuyer?: { fullName?: string } };
  return meta.namedBuyer?.fullName ?? null;
}
