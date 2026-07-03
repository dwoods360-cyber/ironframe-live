import fs from "fs";
import path from "path";

import {
  BRIEFING_QUEUE_DIR,
  PUBLISHED_BRIEFINGS_DIR,
  loadBriefingBySlugFromFilesystem,
  resolveDocsRoot,
} from "@/app/lib/governanceFrame/briefingFilesystemLedger";
import {
  extractExecutiveSummary,
  parseFrontmatterField,
} from "@/app/lib/governanceFrame/briefingMarkdown";
import { stripFrontmatter } from "@/app/lib/governanceFrame/briefingDraftValidation";
import { compileRssFeed } from "../../../scripts/compile-rss";
import {
  assertNewsletterPresentationSafety,
  runGovernanceFramePublicationCompile,
  writeCompiledNewsletterArtifacts,
} from "@/lib/agents/ironcast/workers/compileNewsletter";

export type PublishedMirrorInput = {
  slug: string;
  title: string;
  bodyMarkdown: string;
  publishedAtIso: string;
  operator: string;
  queueMarkdown?: string;
  classification?: string | null;
  summary?: string | null;
};

export type SyndicationResult = {
  mirrorPath: string;
  rssPath: string;
  rssItemCount: number;
  newsletterHtmlPath: string | null;
};

export function buildPublishedMirrorMarkdown(input: PublishedMirrorInput): string {
  const queue = input.queueMarkdown ?? "";
  const classification =
    input.classification?.trim() ||
    parseFrontmatterField(queue, "classification") ||
    "Institutional Governance";
  const summary =
    input.summary?.trim() ||
    parseFrontmatterField(queue, "summary") ||
    extractExecutiveSummary(queue) ||
    `Ironframe Governance Frame briefing — ${input.title}`;

  const publishedDay = input.publishedAtIso.slice(0, 10);
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(input.title)}`,
    `publishedAt: ${JSON.stringify(input.publishedAtIso)}`,
    `published: ${JSON.stringify(publishedDay)}`,
    `summary: ${JSON.stringify(summary)}`,
    `classification: ${JSON.stringify(classification)}`,
    `author: ${JSON.stringify("Ironframe Governance Frame")}`,
    `publishedBy: ${JSON.stringify(input.operator)}`,
    "---",
  ].join("\n");

  const body = input.bodyMarkdown.trim();
  return `${frontmatter}\n\n${body}\n`;
}

export function mirrorPublishedBriefingToFilesystem(
  input: PublishedMirrorInput,
  docsRoot = resolveDocsRoot(),
): string {
  const publishedDir = path.join(docsRoot, PUBLISHED_BRIEFINGS_DIR);
  fs.mkdirSync(publishedDir, { recursive: true });

  const mirrorPath = path.join(publishedDir, `${input.slug}.md`);
  if (fs.existsSync(mirrorPath)) {
    throw new Error(`Filesystem published ledger already contains slug: ${input.slug}`);
  }

  fs.writeFileSync(mirrorPath, buildPublishedMirrorMarkdown(input), "utf8");
  return mirrorPath;
}

export type SyndicationOptions = {
  rssOutputPath?: string;
  newsletterOutputDir?: string;
};

export function syndicatePublishedBriefing(
  slug: string,
  docsRoot = resolveDocsRoot(),
  options?: SyndicationOptions,
): SyndicationResult {
  const briefing = loadBriefingBySlugFromFilesystem(slug, docsRoot);
  if (!briefing) {
    throw new Error(`Published filesystem mirror missing for slug: ${slug}`);
  }

  const { outputPath, itemCount } = compileRssFeed({
    docsRoot,
    outputPath: options?.rssOutputPath,
  });
  const compileResult = runGovernanceFramePublicationCompile({
    slugs: [slug],
    docsRoot,
  });
  if (compileResult.skippedSlugs.length > 0) {
    throw new Error(`Newsletter compile skipped slug: ${slug}`);
  }

  const compiled = compileResult.compiled[0];
  if (!compiled) {
    throw new Error(`Newsletter compile produced no HTML for slug: ${slug}`);
  }

  assertNewsletterPresentationSafety(compiled.html);
  const written = writeCompiledNewsletterArtifacts(
    [compiled],
    options?.newsletterOutputDir,
  );
  const mirrorPath = path.join(docsRoot, PUBLISHED_BRIEFINGS_DIR, `${slug}.md`);

  return {
    mirrorPath,
    rssPath: outputPath,
    rssItemCount: itemCount,
    newsletterHtmlPath: written[0] ?? null,
  };
}

export function resolveQueueMarkdownPath(
  queueFilename: string,
  docsRoot = resolveDocsRoot(),
): string {
  return path.join(docsRoot, BRIEFING_QUEUE_DIR, queueFilename);
}

/** Roll back filesystem mirror when DB promotion succeeded but syndication failed. */
export function removePublishedFilesystemMirror(slug: string, docsRoot = resolveDocsRoot()): void {
  const mirrorPath = path.join(docsRoot, PUBLISHED_BRIEFINGS_DIR, `${slug}.md`);
  if (fs.existsSync(mirrorPath)) {
    fs.unlinkSync(mirrorPath);
  }
}

export function extractQueueMetadata(queueMarkdown: string): {
  classification: string | null;
  summary: string | null;
} {
  return {
    classification: parseFrontmatterField(queueMarkdown, "classification"),
    summary:
      parseFrontmatterField(queueMarkdown, "summary") ?? extractExecutiveSummary(queueMarkdown),
  };
}

export function cleanBodyForPublication(queueMarkdown: string): string {
  return stripFrontmatter(queueMarkdown).trim();
}
