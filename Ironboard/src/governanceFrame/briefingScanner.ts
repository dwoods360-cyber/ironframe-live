import fs from "fs";
import path from "path";

import { quarantineAuditMessage } from "./parseCentBigInt.js";

import { resolveDocsRoot } from "./resolveDocsRoot.js";

export const PUBLISHED_BRIEFINGS_DIR = "published-briefings";
export const BRIEFING_QUEUE_DIR = "briefing-queue";

/** Layout scaffold — never ingested as editorial content. */
const QUARANTINE_ALLOWLIST = new Set(["template.md", ".gitkeep", "readme.md"]);

export type PublishedBriefing = {
  slug: string;
  filename: string;
  title: string;
  publishedAt: string;
  markdown: string;
  sortKey: number;
};

function parseTitleFromMarkdown(markdown: string, fallback: string): string {
  const h1 = markdown.match(/^#\s+(.+)$/m);
  if (h1?.[1]) return h1[1].trim();
  const frontTitle = markdown.match(/^title:\s*(.+)$/im);
  if (frontTitle?.[1]) return frontTitle[1].trim().replace(/^["']|["']$/g, "");
  return fallback;
}

function parsePublishedAt(markdown: string, mtimeMs: number): { iso: string; sortKey: number } {
  const frontDate = markdown.match(/^publishedAt:\s*(.+)$/im);
  if (frontDate?.[1]) {
    const parsed = Date.parse(frontDate[1].trim());
    if (!Number.isNaN(parsed)) {
      return { iso: new Date(parsed).toISOString(), sortKey: parsed };
    }
  }
  return { iso: new Date(mtimeMs).toISOString(), sortKey: mtimeMs };
}

/**
 * Draft quarantine — `briefing-queue/` is never compiled; emit terminal warnings per draft file.
 */
export function enforceBriefingQuarantine(docsRoot: string): void {
  const queueDir = path.join(docsRoot, BRIEFING_QUEUE_DIR);
  if (!fs.existsSync(queueDir)) return;

  for (const entry of fs.readdirSync(queueDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    if (QUARANTINE_ALLOWLIST.has(entry.name.toLowerCase())) continue;
    console.warn(quarantineAuditMessage(entry.name));
  }
}

/**
 * Governance Frame ingestion — only `docs/published-briefings/*.md` (flat directory).
 */
export function scanPublishedBriefings(docsRoot = resolveDocsRoot()): PublishedBriefing[] {
  enforceBriefingQuarantine(docsRoot);

  const publishedDir = path.join(docsRoot, PUBLISHED_BRIEFINGS_DIR);
  if (!fs.existsSync(publishedDir)) {
    fs.mkdirSync(publishedDir, { recursive: true });
    return [];
  }

  const briefings: PublishedBriefing[] = [];

  for (const entry of fs.readdirSync(publishedDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

    const absolute = path.join(publishedDir, entry.name);
    const markdown = fs.readFileSync(absolute, "utf-8");
    const stat = fs.statSync(absolute);
    const slug = entry.name.replace(/\.md$/i, "");
    const { iso, sortKey } = parsePublishedAt(markdown, stat.mtimeMs);

    briefings.push({
      slug,
      filename: entry.name,
      title: parseTitleFromMarkdown(markdown, slug.replace(/-/g, " ")),
      publishedAt: iso,
      markdown,
      sortKey,
    });
  }

  briefings.sort((a, b) => a.sortKey - b.sortKey);
  return briefings;
}
