import { describe, expect, it } from "vitest";

import {
  buyingCommitteeHasNamedMember,
  buyingCommitteeResearchedAtMs,
  selectSuspectsForResearchBatch,
} from "@/app/lib/server/ironleadsBuyingCommitteeResearchCore";

describe("selectSuspectsForResearchBatch", () => {
  const now = Date.parse("2026-08-04T21:00:00.000Z");

  it("parses researchedAt from metadata", () => {
    expect(
      buyingCommitteeResearchedAtMs({
        buyingCommittee: { researchedAt: "2026-08-04T20:50:00.000Z" },
      }),
    ).toBe(Date.parse("2026-08-04T20:50:00.000Z"));
    expect(buyingCommitteeResearchedAtMs({})).toBeNull();
  });

  it("detects named buying-committee members", () => {
    expect(
      buyingCommitteeHasNamedMember({
        buyingCommittee: { members: [{ fullName: "Ada Rich" }] },
      }),
    ).toBe(true);
    expect(
      buyingCommitteeHasNamedMember({
        buyingCommittee: { members: [] },
      }),
    ).toBe(false);
  });

  it("cools only named dossiers; thin rows stay eligible immediately", () => {
    const rows = [
      {
        id: "rich",
        metadata: {
          buyingCommittee: {
            researchedAt: "2026-08-04T20:59:00.000Z", // 1m ago — inside 2m named cooldown
            members: [{ role: "CEO", fullName: "Ada Rich" }],
          },
        },
        primaryDeals: [{ accountDomain: "rich.example" }],
      },
      {
        id: "thin-fresh",
        metadata: {
          buyingCommittee: { researchedAt: "2026-08-04T20:59:00.000Z", members: [] },
        },
        primaryDeals: [{ accountDomain: null }],
      },
      {
        id: "thin-stale",
        metadata: {
          buyingCommittee: { researchedAt: "2026-08-04T18:00:00.000Z", members: [] },
        },
        primaryDeals: [{ accountDomain: null }],
      },
      {
        id: "thin-never",
        metadata: {},
        primaryDeals: [{ accountDomain: null }],
      },
    ];

    const selected = selectSuspectsForResearchBatch(rows, {
      limit: 2,
      nowMs: now,
      cooldownMs: 2 * 60 * 1000,
    });

    // Only rich is named + inside cooldown. Thin-fresh stays eligible.
    expect(selected.cooledDown).toBe(1);
    expect(selected.batch.map((r) => r.id)).toEqual(["thin-fresh", "thin-stale"]);
    expect(selected.eligibleRemainingAfterBatch).toBe(1); // thin-never
    expect(selected.activeQueue).toBe(4);
  });

  it("reports remaining when batch is smaller than eligible set", () => {
    const rows = Array.from({ length: 6 }, (_, i) => ({
      id: `s${i}`,
      metadata: {},
      primaryDeals: [{ accountDomain: null as string | null }],
    }));
    const selected = selectSuspectsForResearchBatch(rows, {
      limit: 5,
      nowMs: now,
      cooldownMs: 2 * 60 * 1000,
    });
    expect(selected.batch).toHaveLength(5);
    expect(selected.eligibleRemainingAfterBatch).toBe(1);
  });
});
