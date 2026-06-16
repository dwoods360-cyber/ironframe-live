import "server-only";

import { quarantineAuditMessage } from "@/app/lib/governanceFrame/parseCentBigInt";

import fs from "fs";
import path from "path";

export const PUBLISHED_BRIEFINGS_DIR = "published-briefings";
export const BRIEFING_QUEUE_DIR = "briefing-queue";

const QUARANTINE_ALLOWLIST = new Set(["template.md", ".gitkeep", "readme.md"]);

export type GovernanceBriefing = {
  slug: string;
  filename: string;
  title: string;
  author: string | null;
  classification: string | null;
  publishedAt: string;
  markdown: string;
  sortKey: number;
};

function resolveDocsRoot(): string {
  const candidates = [
    path.join(process.cwd(), "docs"),
    path.join(process.cwd(), "..", "docs"),
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

function parseTitleFromMarkdown(markdown: string, fallback: string): string {
  const fromFront = parseFrontmatterField(markdown, "title");
  if (fromFront) return fromFront;
  const h1 = markdown.match(/^#\s+(.+)$/m);
  if (h1?.[1]) return h1[1].trim();
  return fallback;
}

/** Remove YAML frontmatter block when present. */
export function stripFrontmatter(markdown: string): string {
  if (!markdown.startsWith("---")) return markdown;
  const end = markdown.indexOf("---", 3);
  if (end === -1) return markdown;
  return markdown.slice(end + 3).trimStart();
}

/** Body copy for reader — no frontmatter or duplicate title heading. */
export function briefingBodyMarkdown(markdown: string, title: string): string {
  let body = stripFrontmatter(markdown);
  const h1 = body.match(/^#\s+(.+)$/m);
  if (h1?.[1]?.trim() === title.trim()) {
    body = body.replace(/^#\s+.+$/m, "").trimStart();
  }
  return body;
}

function parsePublishedAt(markdown: string, mtimeMs: number): { iso: string; sortKey: number } {
  const raw =
    parseFrontmatterField(markdown, "publishedAt") ??
    parseFrontmatterField(markdown, "published");
  if (raw) {
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) {
      return { iso: new Date(parsed).toISOString(), sortKey: parsed };
    }
  }
  return { iso: new Date(mtimeMs).toISOString(), sortKey: mtimeMs };
}

/** Draft quarantine — `briefing-queue/` is never compiled. */
export function enforceBriefingQuarantine(docsRoot: string): void {
  const queueDir = path.join(docsRoot, BRIEFING_QUEUE_DIR);
  if (!fs.existsSync(queueDir)) return;

  for (const entry of fs.readdirSync(queueDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    if (QUARANTINE_ALLOWLIST.has(entry.name.toLowerCase())) continue;
    console.warn(quarantineAuditMessage(entry.name));
  }
}

export function loadPublishedBriefings(): GovernanceBriefing[] {
  const docsRoot = resolveDocsRoot();
  enforceBriefingQuarantine(docsRoot);

  const publishedDir = path.join(docsRoot, PUBLISHED_BRIEFINGS_DIR);
  if (!fs.existsSync(publishedDir)) {
    fs.mkdirSync(publishedDir, { recursive: true });
    return [];
  }

  const briefings: GovernanceBriefing[] = [];

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
      author: parseFrontmatterField(markdown, "author"),
      classification: parseFrontmatterField(markdown, "classification"),
      publishedAt: iso,
      markdown,
      sortKey,
    });
  }

  briefings.sort((a, b) => a.sortKey - b.sortKey);
  return briefings;
}

export function loadBriefingBySlug(slug: string): GovernanceBriefing | null {
  const normalized = slug.trim().toLowerCase();
  if (!normalized || normalized.includes("..") || normalized.includes("/")) return null;
  return loadPublishedBriefings().find((b) => b.slug.toLowerCase() === normalized) ?? null;
}
