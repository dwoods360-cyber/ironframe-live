import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import {
  buildPublishedMirrorMarkdown,
  cleanBodyForPublication,
  extractQueueMetadata,
  mirrorPublishedBriefingToFilesystem,
  removePublishedFilesystemMirror,
  syndicatePublishedBriefing,
} from "@/app/lib/governanceFrame/publishBriefingSyndication";

const SANITIZED_QUEUE = `---
title: "Medshield Governance Review"
date: "2026-06-17T03:00:00.000Z"
status: "QUARANTINED_DRAFT"
classification: "Institutional Governance"
summary: "Perimeter review for Medshield Health sovereign pool."
tenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01"
tenantSlug: "medshield"
requiresImmediatePromotion: true
activeExposureCents: "9650000"
doraScore: "100"
---

### I. Exposure Vector
Perimeter review for Medshield Health sovereign pool.

### II. Calculated Quantitative Impact
- **Reported ALE delta (¢):** "0"

### III. Machine-Rule Technical Translation
Continuous attestation programs should validate DORA Pillar 5 telemetry before syndication.

### V. Sources & Citations
- **[1] CISA advisory** — https://www.cisa.gov/news-events · retrieved 2026-06-17
`;

function makeTempDocsRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ironframe-briefing-syndication-"));
  fs.writeFileSync(path.join(root, "TAS.md"), "# TAS\n", "utf8");
  fs.mkdirSync(path.join(root, "briefing-queue"), { recursive: true });
  fs.mkdirSync(path.join(root, "published-briefings"), { recursive: true });
  return root;
}

describe("publishBriefingSyndication", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("buildPublishedMirrorMarkdown stamps public-safe frontmatter", () => {
    const mirror = buildPublishedMirrorMarkdown({
      slug: "2026-06-17-medshield-review",
      title: "Medshield Governance Review",
      bodyMarkdown: cleanBodyForPublication(SANITIZED_QUEUE),
      publishedAtIso: "2026-06-17T12:00:00.000Z",
      operator: "j.doe@corp.example",
      queueMarkdown: SANITIZED_QUEUE,
    });

    expect(mirror).toContain('title: "Medshield Governance Review"');
    expect(mirror).toContain('publishedBy: "j.doe@corp.example"');
    expect(mirror).toContain("### I. Exposure Vector");
    expect(mirror).not.toContain("QUARANTINED_DRAFT");
  });

  it("extractQueueMetadata reads classification and summary from queue frontmatter", () => {
    const meta = extractQueueMetadata(SANITIZED_QUEUE);
    expect(meta.classification).toBe("Institutional Governance");
    expect(meta.summary).toContain("Perimeter review");
  });

  it("mirrorPublishedBriefingToFilesystem writes slug markdown under published-briefings", () => {
    const docsRoot = makeTempDocsRoot();
    tempRoots.push(docsRoot);

    const mirrorPath = mirrorPublishedBriefingToFilesystem(
      {
        slug: "2026-06-17-medshield-review",
        title: "Medshield Governance Review",
        bodyMarkdown: cleanBodyForPublication(SANITIZED_QUEUE),
        publishedAtIso: "2026-06-17T12:00:00.000Z",
        operator: "j.doe@corp.example",
        queueMarkdown: SANITIZED_QUEUE,
      },
      docsRoot,
    );

    expect(fs.existsSync(mirrorPath)).toBe(true);
    expect(mirrorPath).toContain("2026-06-17-medshield-review.md");
    expect(fs.readFileSync(mirrorPath, "utf8")).toContain("Medshield Governance Review");
  });

  it("syndicatePublishedBriefing compiles RSS and Ironcast newsletter artifacts", () => {
    const docsRoot = makeTempDocsRoot();
    tempRoots.push(docsRoot);
    const slug = "2026-06-17-medshield-review";
    const rssPath = path.join(docsRoot, "rss.xml");
    const newsletterDir = path.join(docsRoot, "newsletters");

    mirrorPublishedBriefingToFilesystem(
      {
        slug,
        title: "Medshield Governance Review",
        bodyMarkdown: cleanBodyForPublication(SANITIZED_QUEUE),
        publishedAtIso: "2026-06-17T12:00:00.000Z",
        operator: "j.doe@corp.example",
        queueMarkdown: SANITIZED_QUEUE,
      },
      docsRoot,
    );

    const result = syndicatePublishedBriefing(slug, docsRoot, {
      rssOutputPath: rssPath,
      newsletterOutputDir: newsletterDir,
    });

    expect(result.rssItemCount).toBe(1);
    expect(fs.existsSync(rssPath)).toBe(true);
    expect(fs.readFileSync(rssPath, "utf8")).toContain("Medshield Governance Review");
    expect(result.newsletterHtmlPath).toBeTruthy();
    expect(fs.existsSync(result.newsletterHtmlPath!)).toBe(true);
    expect(fs.readFileSync(result.newsletterHtmlPath!, "utf8")).toContain("Medshield Governance Review");
  });

  it("removePublishedFilesystemMirror deletes mirrored slug file", () => {
    const docsRoot = makeTempDocsRoot();
    tempRoots.push(docsRoot);
    const slug = "rollback-slug";

    mirrorPublishedBriefingToFilesystem(
      {
        slug,
        title: "Rollback Test",
        bodyMarkdown: "### I. Exposure Vector\nTest.",
        publishedAtIso: "2026-06-17T12:00:00.000Z",
        operator: "ops",
      },
      docsRoot,
    );

    const mirrorPath = path.join(docsRoot, "published-briefings", `${slug}.md`);
    expect(fs.existsSync(mirrorPath)).toBe(true);

    removePublishedFilesystemMirror(slug, docsRoot);
    expect(fs.existsSync(mirrorPath)).toBe(false);
  });
});
