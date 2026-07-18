/**
 * Published Governance Frame research — read-only knowledge for agents.
 * Source of truth: docs/published-briefings + docs/governance-frame catalogs.
 * Never reads docs/briefing-queue (quarantine).
 */

import fs from "fs";
import path from "path";

import { GOVERNANCE_FRAME_PUBLIC_ORIGIN } from "../../config/governanceFramePublic";

export const PUBLISHED_BRIEFINGS_DIR = "published-briefings";
export const GOVERNANCE_FRAME_DOCS_DIR = "governance-frame";
export const BRIEFING_QUEUE_DIR = "briefing-queue";

const SKIP_FILES = new Set(["template.md", ".gitkeep", "readme.md"]);

export type PublishedResearchIndexEntry = {
  slug: string;
  title: string;
  publishedAt: string | null;
  oneLiner: string;
  publicUrl: string;
  excerpt: string;
};

function resolveDocsRoot(cwd = process.cwd()): string {
  const candidates = [
    path.resolve(cwd, "docs"),
    path.resolve(cwd, "../docs"),
    path.resolve(cwd, "../../docs"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "TAS.md"))) return dir;
  }
  return candidates[0];
}

function parseFrontmatterField(markdown: string, key: string): string | null {
  const match = markdown.match(new RegExp(`^${key}:\\s*(.+)$`, "im"));
  if (!match?.[1]) return null;
  return match[1].trim().replace(/^["']|["']$/g, "");
}

function stripFrontmatter(markdown: string): string {
  if (!markdown.startsWith("---")) return markdown;
  const end = markdown.indexOf("\n---", 3);
  if (end === -1) return markdown;
  return markdown.slice(end + 4).replace(/^\s*\n/, "");
}

function parseTitle(markdown: string, fallback: string): string {
  return (
    parseFrontmatterField(markdown, "title") ??
    markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ??
    fallback
  );
}

function parseOneLiner(markdown: string): string {
  const summary = parseFrontmatterField(markdown, "summary");
  if (summary) return summary.replace(/\s+/g, " ").trim();
  const body = stripFrontmatter(markdown);
  const quote = body.match(/^>\s*\**Executive Summary:\**\s*(.+)$/im)?.[1];
  if (quote) return quote.replace(/\s+/g, " ").trim();
  const first = body
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#") && !line.startsWith(">"));
  return (first ?? "Published Governance Frame briefing.").replace(/\s+/g, " ").trim();
}

function excerptBody(markdown: string, maxChars = 480): string {
  const body = stripFrontmatter(markdown)
    .replace(/^#+\s+.+$/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  if (body.length <= maxChars) return body;
  return `${body.slice(0, maxChars).trimEnd()}…`;
}

/** Flat published ledger only — never briefing-queue. */
export function listPublishedResearchIndex(
  docsRoot = resolveDocsRoot(),
): PublishedResearchIndexEntry[] {
  const publishedDir = path.join(docsRoot, PUBLISHED_BRIEFINGS_DIR);
  if (!fs.existsSync(publishedDir)) return [];

  const entries: PublishedResearchIndexEntry[] = [];
  for (const entry of fs.readdirSync(publishedDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    if (SKIP_FILES.has(entry.name.toLowerCase())) continue;

    const absolute = path.join(publishedDir, entry.name);
    const markdown = fs.readFileSync(absolute, "utf8");
    const slug = entry.name.replace(/\.md$/i, "");
    const publishedAt = parseFrontmatterField(markdown, "publishedAt");

    entries.push({
      slug,
      title: parseTitle(markdown, slug.replace(/-/g, " ")),
      publishedAt,
      oneLiner: parseOneLiner(markdown),
      publicUrl: `${GOVERNANCE_FRAME_PUBLIC_ORIGIN}/briefings/${encodeURIComponent(slug)}`,
      excerpt: excerptBody(markdown),
    });
  }

  return entries.sort((a, b) => a.slug.localeCompare(b.slug));
}

function listResearchPaperCatalogLines(docsRoot: string): string[] {
  const papersRoot = path.join(docsRoot, GOVERNANCE_FRAME_DOCS_DIR, "research-papers");
  if (!fs.existsSync(papersRoot)) return [];

  const lines: string[] = [];
  for (const entry of fs.readdirSync(papersRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manuscriptPath = path.join(papersRoot, entry.name, "manuscript.md");
    if (!fs.existsSync(manuscriptPath)) continue;
    const markdown = fs.readFileSync(manuscriptPath, "utf8");
    const researchId = parseFrontmatterField(markdown, "researchId") ?? entry.name;
    const title = parseTitle(markdown, researchId);
    const status = parseFrontmatterField(markdown, "status") ?? "UNKNOWN";
    const publicReady = status.toUpperCase() === "PUBLISHED" || status.toUpperCase() === "PUBLIC";
    lines.push(
      publicReady
        ? `- ${researchId} — ${title} (PUBLISHED) · ${GOVERNANCE_FRAME_PUBLIC_ORIGIN}/research-papers/${entry.name}`
        : `- ${researchId} — ${title} (forthcoming · ${status}) — do not cite full text until PUBLISHED`,
    );
  }
  return lines;
}

/**
 * Compact binding for all worker prompts (Sales, Success, Support, Ops Hub, IronBoard spine).
 */
export function buildPublishedGovernanceFrameKnowledgeBinding(
  docsRoot = resolveDocsRoot(),
): string {
  const published = listPublishedResearchIndex(docsRoot);
  const paperLines = listResearchPaperCatalogLines(docsRoot);

  const briefingLines =
    published.length === 0
      ? ["- (none promoted yet — do not invent Governance Frame citations)"]
      : published.map(
          (item) =>
            `- ${item.title} · ${item.slug}\n  ${item.oneLiner}\n  Cite: ${item.publicUrl}`,
        );

  return `
GOVERNANCE FRAME RESEARCH ENCYCLOPEDIA (READ-ONLY — published ledger only):
- Public site: ${GOVERNANCE_FRAME_PUBLIC_ORIGIN} (legacy alias brief.ironframegrc.com)
- Charter: docs/governance-frame/charter/what-governance-frame-is.md
- Binding standards: docs/governance-frame/charter/editorial-standards.md (GF-STANDARDS-001)
- Operating outline: docs/governance-frame/charter/operating-outline.md (GF-OPS-001) — roles, tools, cadence
- Core cadence: plan quarterly, publish monthly, review weekly, verify every claim, human Approve/Hold/Deny before release
- Core rule: distinguish what evidence establishes, what GF concludes, what remains uncertain, and what is merely recommended.
- Canonical packages: docs/governance-frame/ · promoted bodies: docs/${PUBLISHED_BRIEFINGS_DIR}/
- NEVER read or cite docs/${BRIEFING_QUEUE_DIR}/ (quarantine). NEVER write APP_DOCS into this plane.
- When discussing GRC history, control-first posture, or institutional briefings, prefer these published titles and public URLs. Label Ironframe product mentions as product architecture, not regulation. Ironframe should almost never be the subject.

Published briefings:
${briefingLines.join("\n")}

Research papers:
${paperLines.length ? paperLines.join("\n") : "- (none registered)"}
`.trim();
}

/**
 * Richer federation block for IronBoard startup context (includes short excerpts).
 */
export function buildPublishedGovernanceFrameFederationBlock(
  docsRoot = resolveDocsRoot(),
  options?: { maxBriefings?: number },
): string {
  const max = options?.maxBriefings ?? 12;
  const published = listPublishedResearchIndex(docsRoot).slice(-max);
  const paperLines = listResearchPaperCatalogLines(docsRoot);

  const briefingBlocks =
    published.length === 0
      ? ["(No published briefings on disk.)"]
      : published.map(
          (item) =>
            `── ${item.title} (${item.slug}) ──\nURL: ${item.publicUrl}\n${item.excerpt}`,
        );

  return [
    "═══ GOVERNANCE FRAME RESEARCH ENCYCLOPEDIA (READ-ONLY · PUBLISHED ONLY) ═══",
    `Public origin: ${GOVERNANCE_FRAME_PUBLIC_ORIGIN}`,
    "Source: docs/published-briefings/*.md — quarantine docs/briefing-queue is forbidden.",
    "Use for institutional citation. Do not treat product claims as regulatory mandates.",
    "",
    "── Research paper catalog ──",
    paperLines.length ? paperLines.join("\n") : "(none)",
    "",
    "── Published briefing excerpts ──",
    ...briefingBlocks,
    "═══ END GOVERNANCE FRAME RESEARCH ═══",
  ].join("\n");
}
