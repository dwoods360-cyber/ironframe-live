/**
 * Static RSS compiler — scans docs/published-briefings/*.md → public/rss.xml
 * Zero-trust: filesystem only, no database or tenant client access.
 *
 * Run: npm run build:rss
 */
import fs from "fs";
import path from "path";

import matter from "gray-matter";

import { parseCentBigInt, parseCentBigIntSafe, quarantineAuditMessage } from "../app/lib/governanceFrame/parseCentBigInt";

export const PUBLISHED_BRIEFINGS_DIR = "published-briefings";
export const BRIEFING_QUEUE_DIR = "briefing-queue";
export const RSS_OUTPUT_PATH = path.join(process.cwd(), "public", "rss.xml");

export const RSS_CHANNEL_TITLE = "The Governance Frame";
export const RSS_CHANNEL_LINK = "https://brief.ironframegrc.com";
export const RSS_CHANNEL_DESCRIPTION =
  "Immutable Executive GRC Intelligence from the Ironframe System.";
export const RSS_ITEM_LINK_ORIGIN = RSS_CHANNEL_LINK;

const QUARANTINE_ALLOWLIST = new Set(["template.md", ".gitkeep", "readme.md"]);
const METRIC_LINE = /^-\s+\*\*(.+?)\*\*:?\s*(.+)$/;

export type RssBriefingFrontmatter = {
  title?: string;
  issueNumber?: string | number;
  date?: string;
  publishedAt?: string;
  published?: string;
  summary?: string;
  author?: string;
  classification?: string;
  [key: string]: unknown;
};

export type RssFeedItem = {
  slug: string;
  title: string;
  link: string;
  pubDateRfc822: string;
  description: string;
  sortKey: number;
};

function resolveDocsRoot(): string {
  const candidates = [path.join(process.cwd(), "docs"), path.join(process.cwd(), "..", "docs")];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "TAS.md"))) return dir;
  }
  return candidates[0];
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function toRfc822Date(isoOrDate: string): string {
  const parsed = Date.parse(isoOrDate);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid ISO date for RSS pubDate: ${isoOrDate}`);
  }
  return new Date(parsed).toUTCString();
}

export function formatRssItemTitle(title: string, issueNumber?: string | number): string {
  const trimmed = title.trim();
  if (issueNumber === undefined || issueNumber === null || String(issueNumber).trim() === "") {
    return trimmed;
  }
  const issue = String(issueNumber).trim().replace(/^#/, "");
  return `[Issue #${issue}] ${trimmed}`;
}

function stripMarkdownInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.+?)\]\([^)]+\)/g, "$1")
    .trim();
}

export function resolveSummary(markdownBody: string, frontmatter: RssBriefingFrontmatter): string {
  if (frontmatter.summary?.trim()) {
    return stripMarkdownInline(frontmatter.summary.trim());
  }

  const blockquote = markdownBody.match(/^>\s*\**Executive Summary:\**\s*(.+)$/im);
  if (blockquote?.[1]) return stripMarkdownInline(blockquote[1]);

  const genericQuote = markdownBody.match(/^>\s+(.+)$/m);
  if (genericQuote?.[1]) return stripMarkdownInline(genericQuote[1]);

  const exposure = markdownBody.match(
    /###\s+I\.\s*Exposure Vector\s*\n+([\s\S]*?)(?=###\s+II\.|$)/i,
  );
  const paragraph = (exposure?.[1] ?? markdownBody)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#") && !line.startsWith("-"));

  return paragraph ? stripMarkdownInline(paragraph).slice(0, 500) : "Ironframe governance briefing.";
}

export function resolvePublicationDate(
  frontmatter: RssBriefingFrontmatter,
  mtimeMs: number,
): { iso: string; sortKey: number } {
  const raw =
    frontmatter.date ?? frontmatter.publishedAt ?? frontmatter.published ?? null;
  if (raw) {
    const parsed = Date.parse(String(raw).trim());
    if (!Number.isNaN(parsed)) {
      return { iso: new Date(parsed).toISOString(), sortKey: parsed };
    }
  }
  return { iso: new Date(mtimeMs).toISOString(), sortKey: mtimeMs };
}

export function resolveTitle(
  frontmatter: RssBriefingFrontmatter,
  markdownBody: string,
  slug: string,
): string {
  if (frontmatter.title?.trim()) return frontmatter.title.trim();
  const h1 = markdownBody.match(/^#\s+(.+)$/m);
  if (h1?.[1]) return h1[1].trim();
  return slug.replace(/-/g, " ");
}

/** Enforce BigInt whole-cent registers — rejects floats in frontmatter and Section II bullets. */
export function validateCentIntegrity(
  frontmatter: RssBriefingFrontmatter,
  markdownBody: string,
): void {
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value == null) continue;
    if (!/_cents$/i.test(key) && !/Cent$/i.test(key)) continue;
    parseCentBigInt(String(value));
  }

  const impact = markdownBody.match(
    /###\s+II\.\s*Calculated Quantitative Impact\s*\n+([\s\S]*?)(?=###\s+III\.|$)/i,
  );
  if (!impact?.[1]) return;

  for (const line of impact[1].split(/\r?\n/)) {
    const match = line.trim().match(METRIC_LINE);
    if (!match?.[1] || !match[2]) continue;
    const label = match[1].trim();
    const raw = match[2].trim();
    if (!/\(¢\)/i.test(label) && !/^["']?\d+["']?$/.test(raw)) continue;
    parseCentBigIntSafe(raw);
  }
}

export function enforceBriefingQueueQuarantine(docsRoot: string): void {
  const queueDir = path.join(docsRoot, BRIEFING_QUEUE_DIR);
  if (!fs.existsSync(queueDir)) return;

  for (const entry of fs.readdirSync(queueDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    if (QUARANTINE_ALLOWLIST.has(entry.name.toLowerCase())) continue;
    console.warn(quarantineAuditMessage(entry.name));
  }
}

export function scanPublishedBriefingsForRss(docsRoot = resolveDocsRoot()): RssFeedItem[] {
  enforceBriefingQueueQuarantine(docsRoot);

  const publishedDir = path.join(docsRoot, PUBLISHED_BRIEFINGS_DIR);
  if (!fs.existsSync(publishedDir)) {
    fs.mkdirSync(publishedDir, { recursive: true });
    return [];
  }

  const items: RssFeedItem[] = [];

  for (const entry of fs.readdirSync(publishedDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

    const absolute = path.join(publishedDir, entry.name);
    const raw = fs.readFileSync(absolute, "utf-8");
    const stat = fs.statSync(absolute);
    const slug = entry.name.replace(/\.md$/i, "");
    const parsed = matter(raw);
    const frontmatter = parsed.data as RssBriefingFrontmatter;
    const body = parsed.content;

    validateCentIntegrity(frontmatter, body);

    const title = resolveTitle(frontmatter, body, slug);
    const { iso, sortKey } = resolvePublicationDate(frontmatter, stat.mtimeMs);
    const rssTitle = formatRssItemTitle(title, frontmatter.issueNumber);
    const description = resolveSummary(body, frontmatter);
    const link = `${RSS_ITEM_LINK_ORIGIN}/governance-frame/${encodeURIComponent(slug)}`;

    items.push({
      slug,
      title: rssTitle,
      link,
      pubDateRfc822: toRfc822Date(iso),
      description,
      sortKey,
    });
  }

  items.sort((a, b) => b.sortKey - a.sortKey);
  return items;
}

export function serializeRssXml(items: RssFeedItem[], lastBuildDate = new Date()): string {
  const channelItems = items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.link)}</guid>
      <pubDate>${escapeXml(item.pubDateRfc822)}</pubDate>
      <description>${escapeXml(item.description)}</description>
    </item>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(RSS_CHANNEL_TITLE)}</title>
    <link>${escapeXml(RSS_CHANNEL_LINK)}</link>
    <description>${escapeXml(RSS_CHANNEL_DESCRIPTION)}</description>
    <language>en-us</language>
    <lastBuildDate>${escapeXml(lastBuildDate.toUTCString())}</lastBuildDate>
    <generator>Ironframe Governance Frame RSS Compiler</generator>
${channelItems}
  </channel>
</rss>
`;
}

export function compileRssFeed(options?: {
  docsRoot?: string;
  outputPath?: string;
}): { outputPath: string; itemCount: number } {
  const docsRoot = options?.docsRoot ?? resolveDocsRoot();
  const outputPath = options?.outputPath ?? RSS_OUTPUT_PATH;
  const items = scanPublishedBriefingsForRss(docsRoot);
  const xml = serializeRssXml(items);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, xml, "utf-8");

  return { outputPath, itemCount: items.length };
}

function main(): void {
  const { outputPath, itemCount } = compileRssFeed();
  console.log(`[build:rss] Wrote ${itemCount} item(s) → ${outputPath}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error("[build:rss] Failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
