import { describe, expect, it } from "vitest";

import {
  comparePendingPoolRows,
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

  it("puts named buyers at the top of the pending pool and keeps the rest FIFO", () => {
    const rows = [
      { metadata: { websiteUrl: "https://oldest.example" }, createdAt: new Date("2026-01-01") },
      {
        metadata: { namedBuyer: { fullName: "Pat Buyer" }, websiteUrl: "https://b.example" },
        createdAt: new Date("2026-03-01"),
      },
      { metadata: {}, createdAt: new Date("2026-02-01") },
      {
        metadata: {
          namedBuyer: { fullName: "Dana Reyes" },
          websiteUrl: "https://c.example",
          buyingCommittee: {
            members: [
              {
                role: "CISO",
                fullName: "Dana Reyes",
                emails: [{ email: "dana@c.example", status: "published" }],
              },
            ],
          },
        },
        createdAt: new Date("2026-04-01"),
      },
    ];
    const sorted = [...rows].sort(comparePendingPoolRows);
    expect(sorted.map(resolveName)).toEqual(["Dana Reyes", "Pat Buyer", null, null]);
    expect(sorted[2]!.createdAt).toEqual(new Date("2026-01-01"));
    expect(sorted[3]!.createdAt).toEqual(new Date("2026-02-01"));
  });
});

function resolveName(row: { metadata: unknown }): string | null {
  const meta = row.metadata as { namedBuyer?: { fullName?: string } };
  return meta.namedBuyer?.fullName ?? null;
}
