import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  AGENTIC_BOARD_ROSTER,
  MARKETING_STRATEGY_KNOWLEDGE_BINDING,
  STRATEGIC_KNOWLEDGE_VAULT,
} from "../../Ironboard/src/staticContext.ts";
import {
  requiresCorporateDocsPrefetch,
  resolveDocsQueryIntent,
} from "../../Ironboard/src/services/ingress/docsQueryIntent.js";
import { loadTrainingCorpusPlacementTargets } from "../../app/lib/board/trainingCorpusPlacement";

const REPO_ROOT = process.cwd();

function assertDocExists(relativePath: string): void {
  const absolute = path.join(REPO_ROOT, relativePath);
  expect(fs.existsSync(absolute), `missing ${relativePath}`).toBe(true);
  const content = fs.readFileSync(absolute, "utf8");
  expect(content.length).toBeGreaterThan(200);
  expect(content).not.toContain("STAGED DRAFT");
}

describe("marketing strategy knowledge base", () => {
  it("ships authoritative marketing-strategy corpus files", () => {
    assertDocExists("docs/marketing-strategy/marketing-strategy-library.md");
    assertDocExists("docs/marketing-strategy/storybrand-framework.md");
    assertDocExists("docs/marketing-strategy/marketing-plan.md");
    assertDocExists("docs/marketing-strategy/brand-style-guide.md");
    assertDocExists("docs/marketing-strategy/content-calendar.md");
    assertDocExists("docs/marketing-strategy/social-media-guidelines.md");
  });

  it("includes StoryBrand and classic marketing books in strategy vault", () => {
    const titles = STRATEGIC_KNOWLEDGE_VAULT.map((book) => book.title);
    expect(titles).toContain("Building a StoryBrand");
    expect(titles).toContain("Marketing Made Simple");
    expect(titles).toContain("Influence");
    expect(titles).toContain("Made to Stick");
    expect(titles).toContain("Obviously Awesome");
    expect(STRATEGIC_KNOWLEDGE_VAULT.length).toBeGreaterThanOrEqual(20);
  });

  it("binds marketing, writer, and trainer agents to messaging frameworks", () => {
    const marketing = AGENTIC_BOARD_ROSTER.find((a) => a.id === "board-marketing-mgr");
    const writer = AGENTIC_BOARD_ROSTER.find((a) => a.id === "board-writer");
    const trainer = AGENTIC_BOARD_ROSTER.find((a) => a.id === "board-trainer");

    expect(marketing?.primaryBookAlignment).toBe("Building a StoryBrand");
    expect(writer?.primaryBookAlignment).toBe("Building a StoryBrand");
    expect(trainer?.primaryBookAlignment).toBe("Made to Stick");
    expect(MARKETING_STRATEGY_KNOWLEDGE_BINDING).toContain("storybrand-framework.md");
    expect(MARKETING_STRATEGY_KNOWLEDGE_BINDING).toContain("13-narrative-frameworks-storybrand");
    expect(MARKETING_STRATEGY_KNOWLEDGE_BINDING).toContain("13-clear-messaging-for-operators");
  });

  it("registers training chapter 13 in corpus placement manifest", () => {
    const placement = loadTrainingCorpusPlacementTargets();
    expect(placement.trainerPlacementTargets).toContain(
      "training/level-1/13-clear-messaging-for-operators.md",
    );
    expect(placement.writerPlacementTargets).toContain(
      "training/level-2/13-narrative-frameworks-storybrand.md",
    );
  });

  it("routes StoryBrand queries to marketing-strategy matrix category", () => {
    const intent = resolveDocsQueryIntent("Draft a StoryBrand one-liner for our website");
    expect(intent.docCategory).toBe("marketing-strategy");
    expect(requiresCorporateDocsPrefetch("Update our BrandScript for Q3")).toBe(true);
  });
});
