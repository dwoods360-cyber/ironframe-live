import { describe, expect, it } from "vitest";

import { sampleIronframeDocumentationBrief } from "./fixtures/documentationBrief.js";
import { loadTrainingCorpusManifest } from "../src/config/trainingCorpusLoader.js";
import { buildDeterministicTrainingChapter } from "../src/services/trainingChapterGenerator.js";

describe("trainingCorpusManifest", () => {
  it("defines 24 chapters exceeding 63-page target at 1600 words each", () => {
    const manifest = loadTrainingCorpusManifest();
    expect(manifest.chapters.length).toBe(24);
    const projectedWords = manifest.chapters.length * manifest.chapterTargetWords;
    const projectedPages = Math.ceil(projectedWords / manifest.wordsPerPage);
    expect(projectedPages).toBeGreaterThan(63);
    expect(manifest.chapters.filter((c) => c.authorAgent === "board-trainer").length).toBe(12);
    expect(manifest.chapters.filter((c) => c.authorAgent === "board-writer").length).toBe(12);
  });

  it("includes navigation paths and screenshot assets per chapter", () => {
    const manifest = loadTrainingCorpusManifest();
    for (const chapter of manifest.chapters) {
      expect(chapter.navigationPath.length).toBeGreaterThan(0);
      expect(chapter.primaryRoute.startsWith("/")).toBe(true);
      expect(chapter.screenshotFile.endsWith(".png")).toBe(true);
      expect(chapter.sourceAnchors.length).toBeGreaterThan(0);
    }
  });
});

describe("trainingChapterGenerator", () => {
  it("builds deterministic chapters with screenshots, navigation, and source anchors", () => {
    const manifest = loadTrainingCorpusManifest();
    const brief = sampleIronframeDocumentationBrief();
    const chapter = manifest.chapters[0]!;
    const content = buildDeterministicTrainingChapter(chapter, brief);

    expect(content).toContain("# ");
    expect(content).toContain("Feature location in the SaaS application");
    expect(content).toContain("Navigation path");
    expect(content).toContain("Reference screenshot");
    expect(content).toContain("/docs/training/assets/");
    expect(content).toContain("source-file:");
    expect(content).toContain("ref: GET /api/board/shared-context");
  });

  it("produces substantive chapter bodies for manual page count", () => {
    const manifest = loadTrainingCorpusManifest();
    const brief = sampleIronframeDocumentationBrief();
    let totalWords = 0;

    for (const chapter of manifest.chapters) {
      const content = buildDeterministicTrainingChapter(chapter, brief);
      totalWords += content.split(/\s+/).filter(Boolean).length;
    }

    const projectedPages = Math.ceil(totalWords / manifest.wordsPerPage);
    expect(projectedPages).toBeGreaterThan(63);
  });
});
