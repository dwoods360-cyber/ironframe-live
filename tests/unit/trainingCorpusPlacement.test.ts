import { describe, expect, it } from "vitest";

import { loadTrainingCorpusPlacementTargets } from "@/app/lib/board/trainingCorpusPlacement";

describe("trainingCorpusPlacement", () => {
  it("includes all manifest chapter slugs in trainer or writer placement targets", () => {
    const placement = loadTrainingCorpusPlacementTargets();
    expect(placement.chapterSlugs.length).toBe(24);
    expect(placement.trainerPlacementTargets.some((t) => t.includes("training/level-1/"))).toBe(
      true,
    );
    expect(placement.writerPlacementTargets.some((t) => t.includes("training/level-2/"))).toBe(
      true,
    );
  });
});
