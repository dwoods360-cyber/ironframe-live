import "server-only";

import { quarantineAuditMessage } from "@/app/lib/governanceFrame/parseCentBigInt";
import {
  QUARANTINE_ALLOWLIST,
  parseBriefingDraftAlertFlags,
  stripFrontmatter,
  validateBriefingQueueDraft,
} from "@/app/lib/governanceFrame/briefingDraftValidation";
import prisma from "@/lib/prisma";
import type { PublishedBriefing as PublishedBriefingRecord } from "@prisma/client";

export { stripFrontmatter };

import fs from "fs";
import path from "path";

export const PUBLISHED_BRIEFINGS_DIR = "published-briefings";
export const BRIEFING_QUEUE_DIR = "briefing-queue";

export { QUARANTINE_ALLOWLIST };

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

    const markdown = fs.readFileSync(path.join(queueDir, entry.name), "utf-8");
    const alertFlags = parseBriefingDraftAlertFlags(markdown);
    if (alertFlags.requiresImmediatePromotion) {
      console.warn(
        `[BRIEFING DRAFT WARN] ${entry.name}: URGENT security review — requiresImmediatePromotion=true (exposure ${alertFlags.activeExposureCents?.toString() ?? "unknown"} ¢ vs threshold ${alertFlags.thresholdCents.toString()} ¢). Run promote-briefing-draft.ts after human fact-check.`,
      );
    }

    const validation = validateBriefingQueueDraft(entry.name, markdown);
    for (const issue of validation.issues) {
      const prefix = issue.severity === "error" ? "[BRIEFING DRAFT ERROR]" : "[BRIEFING DRAFT WARN]";
      console.warn(`${prefix} ${entry.name}: ${issue.message}`);
    }
  }
}

/** Map Postgres `published_briefings` row → reader view model (single ledger source). */
export function mapPublishedBriefingRecord(record: PublishedBriefingRecord): GovernanceBriefing {
  return {
    slug: record.slug,
    filename: `${record.slug}.md`,
    title: record.title,
    author: record.publishedBy?.trim() || null,
    classification: null,
    publishedAt: record.createdAt.toISOString(),
    markdown: record.content,
    sortKey: record.createdAt.getTime(),
  };
}

/**
 * Governance Frame reader — authoritative published ledger in PostgreSQL.
 * Queue drafts remain file-quarantined via `enforceBriefingQuarantine`.
 */
export async function fetchPublishedBriefings(): Promise<GovernanceBriefing[]> {
  enforceBriefingQuarantine(resolveDocsRoot());

  const records = await prisma.publishedBriefing.findMany({
    orderBy: { createdAt: "asc" },
  });

  return records.map(mapPublishedBriefingRecord);
}

export async function fetchBriefingBySlug(slug: string): Promise<GovernanceBriefing | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized || normalized.includes("..") || normalized.includes("/")) return null;

  const record = await prisma.publishedBriefing.findUnique({
    where: { slug: normalized },
  });

  return record ? mapPublishedBriefingRecord(record) : null;
}

/** @deprecated Filesystem mirror — Ironcast newsletter worker only; prefer `fetchPublishedBriefings`. */
export function loadPublishedBriefingsFromFilesystem(): GovernanceBriefing[] {
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

/** @deprecated Filesystem mirror — Ironcast newsletter worker only; prefer `fetchBriefingBySlug`. */
export function loadBriefingBySlugFromFilesystem(slug: string): GovernanceBriefing | null {
  const normalized = slug.trim().toLowerCase();
  if (!normalized || normalized.includes("..") || normalized.includes("/")) return null;
  return loadPublishedBriefingsFromFilesystem().find((b) => b.slug.toLowerCase() === normalized) ?? null;
}

/** @deprecated Use `loadPublishedBriefingsFromFilesystem` or `fetchPublishedBriefings`. */
export function loadPublishedBriefings(): GovernanceBriefing[] {
  return loadPublishedBriefingsFromFilesystem();
}

/** @deprecated Use `loadBriefingBySlugFromFilesystem` or `fetchBriefingBySlug`. */
export function loadBriefingBySlug(slug: string): GovernanceBriefing | null {
  return loadBriefingBySlugFromFilesystem(slug);
}
