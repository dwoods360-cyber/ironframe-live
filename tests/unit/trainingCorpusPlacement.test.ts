import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { loadTrainingCorpusPlacementTargets } from "@/app/lib/board/trainingCorpusPlacement";

const MANIFEST_PATH = path.join(process.cwd(), "config", "training-corpus-manifest.json");

describe("trainingCorpusPlacement", () => {
  it("includes all manifest chapter slugs in trainer or writer placement targets", () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as {
      chapters: Array<{ slug: string; authorAgent: string }>;
    };
    const placement = loadTrainingCorpusPlacementTargets();
    expect(placement.chapterSlugs.length).toBe(manifest.chapters.length);
    expect(placement.trainerPlacementTargets.some((t) => t.includes("training/level-1/"))).toBe(
      true,
    );
    expect(placement.writerPlacementTargets.some((t) => t.includes("training/level-2/"))).toBe(
      true,
    );
    for (const chapter of manifest.chapters) {
      const slugFile = `${chapter.slug}.md`;
      const targets =
        chapter.authorAgent === "board-trainer"
          ? placement.trainerPlacementTargets
          : placement.writerPlacementTargets;
      expect(targets, slugFile).toContain(slugFile);
    }
  });
});
