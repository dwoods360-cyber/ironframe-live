import { describe, expect, it } from "vitest";

import { sampleIronframeDocumentationBrief } from "../../tests/fixtures/documentationBrief.js";
import { loadTrainingCorpusManifest } from "../config/trainingCorpusLoader.js";
import {
  buildCanonicalAppDocContext,
  buildTrainerChapterBlueprint,
  resolvePeerTrainerChapterSlug,
  screenTrainingAppDocumentationParity,
} from "../services/trainingCorpusCollaboration.js";
import { buildDeterministicTrainingChapter } from "../services/trainingChapterGenerator.js";

describe("trainingCorpusCollaboration", () => {
  it("builds trainer blueprint and canonical app doc context from brief", () => {
    const brief = sampleIronframeDocumentationBrief();
    const chapter = loadTrainingCorpusManifest().chapters[1]!;

    const blueprint = buildTrainerChapterBlueprint(chapter, brief);
    const canonical = buildCanonicalAppDocContext(chapter, brief);

    expect(blueprint).toContain("Trainer blueprint");
    expect(blueprint).toContain(chapter.primaryRoute);
    expect(canonical).toContain("CANONICAL APP DOCS");
    expect(canonical).toContain("user-manuals/quickstart");
  });

  it("pairs Level 2 writer chapters with Level 1 trainer peers by chapter number", () => {
    const manifest = loadTrainingCorpusManifest();
    const writerChapter = manifest.chapters.find((c) => c.authorAgent === "board-writer")!;
    const peer = resolvePeerTrainerChapterSlug(writerChapter.slug);

    expect(peer).toMatch(/training\/level-1\/\d{2}-/);
  });

  it("flags invented routes not present in route manifest", () => {
    const brief = sampleIronframeDocumentationBrief();
    const chapter = loadTrainingCorpusManifest().chapters[0]!;
    const grounded = buildDeterministicTrainingChapter(chapter, brief);
    const invented = `${grounded}\n\nNavigate to \`/nonexistent-feature-route\` for advanced labs.`;

    const violations = screenTrainingAppDocumentationParity(invented, chapter, brief);
    expect(violations.some((v) => v.includes("nonexistent-feature-route"))).toBe(true);
  });

  it("accepts deterministic chapters grounded in manifest routes", () => {
    const brief = sampleIronframeDocumentationBrief();
    const chapter = loadTrainingCorpusManifest().chapters[0]!;
    const content = buildDeterministicTrainingChapter(chapter, brief);

    const violations = screenTrainingAppDocumentationParity(content, chapter, brief);
    expect(violations).toEqual([]);
  });
});
