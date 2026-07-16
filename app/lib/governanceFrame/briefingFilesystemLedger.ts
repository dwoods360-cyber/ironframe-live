import fs from "fs";
import path from "path";

import { quarantineAuditMessage } from "@/app/lib/governanceFrame/parseCentBigInt";
import {
  QUARANTINE_ALLOWLIST,
  parseBriefingDraftAlertFlags,
  validateBriefingQueueDraft,
} from "@/app/lib/governanceFrame/briefingDraftValidation";
import {
  parseFrontmatterField,
  parseTitleFromMarkdown,
} from "@/app/lib/governanceFrame/briefingMarkdown";
import { resolvePublishedBriefingSlug } from "@/app/lib/governanceFrame/publishedBriefingSlugRedirects";

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

export function resolveDocsRoot(): string {
  const candidates = [
    path.join(process.cwd(), "docs"),
    path.join(process.cwd(), "..", "docs"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "TAS.md"))) return dir;
  }
  return candidates[0];
}

function parsePublishedAt(markdown: string, mtimeMs: number): { iso: string; sortKey: number } {
  const raw =
    parseFrontmatterField(markdown, "publishedAt") ??
    parseFrontmatterField(markdown, "published") ??
    parseFrontmatterField(markdown, "date");
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

export function loadPublishedBriefingsFromFilesystem(docsRoot = resolveDocsRoot()): GovernanceBriefing[] {
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

export function loadBriefingBySlugFromFilesystem(
  slug: string,
  docsRoot = resolveDocsRoot(),
): GovernanceBriefing | null {
  const normalized = resolvePublishedBriefingSlug(slug);
  if (!normalized || normalized.includes("..") || normalized.includes("/")) return null;
  return (
    loadPublishedBriefingsFromFilesystem(docsRoot).find((b) => b.slug.toLowerCase() === normalized) ??
    null
  );
}

/** @deprecated Prefer `loadPublishedBriefingsFromFilesystem`. */
export function loadPublishedBriefings(docsRoot?: string): GovernanceBriefing[] {
  return loadPublishedBriefingsFromFilesystem(docsRoot);
}

/** @deprecated Prefer `loadBriefingBySlugFromFilesystem`. */
export function loadBriefingBySlug(slug: string, docsRoot?: string): GovernanceBriefing | null {
  return loadBriefingBySlugFromFilesystem(slug, docsRoot);
}
