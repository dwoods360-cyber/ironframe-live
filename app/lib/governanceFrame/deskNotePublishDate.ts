/**
 * GF ledger dating: use the slate / signal week on the note (filename or frontmatter),
 * never Approve-day "today".
 */

import { parseFrontmatterField } from "@/app/lib/governanceFrame/briefingMarkdown";
import { isDeskNotesDeskDraft } from "@/app/lib/governanceFrame/publishingDeskDraftKind";

const DAY_PREFIX = /^(\d{4}-\d{2}-\d{2})(?:[-_]|$)/;
const DAY_ONLY = /^(\d{4}-\d{2}-\d{2})$/;

/** Noon UTC on the calendar day — stable sort key; avoids Approve-time drift. */
export function calendarDayToPublishedAtIso(day: string): string | null {
  const m = DAY_ONLY.exec(day.trim());
  if (!m) return null;
  const iso = `${m[1]}T12:00:00.000Z`;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return iso;
}

export function extractCalendarDayFromFilename(filename: string): string | null {
  const base = filename.trim().replace(/\\/g, "/").split("/").pop() ?? "";
  const m = DAY_PREFIX.exec(base);
  return m?.[1] ?? null;
}

function resolveInstantFromFrontmatter(markdown: string): string | null {
  const fromFront =
    parseFrontmatterField(markdown, "publishedAt") ??
    parseFrontmatterField(markdown, "published") ??
    parseFrontmatterField(markdown, "date");
  if (!fromFront?.trim()) return null;
  const raw = fromFront.trim();
  const asDay = calendarDayToPublishedAtIso(raw);
  if (asDay) return asDay;
  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  return null;
}

/**
 * Resolve slate/signal publication instant when promoting a queue draft.
 * Prefer draft frontmatter, then YYYY-MM-DD filename prefix.
 */
export function resolveGfSlatePublishedAtIso(
  filenameOrSlug: string,
  markdown: string,
): string | null {
  const fromFront = resolveInstantFromFrontmatter(markdown);
  if (fromFront) return fromFront;

  const fromName = extractCalendarDayFromFilename(filenameOrSlug);
  if (fromName) return calendarDayToPublishedAtIso(fromName);

  return null;
}

/**
 * Desk-note helper — same slate dating, only when the draft is a desk note.
 */
export function resolveDeskNotePublishedAtIso(
  filename: string,
  markdown: string,
): string | null {
  if (!isDeskNotesDeskDraft(filename)) return null;
  return resolveGfSlatePublishedAtIso(filename, markdown);
}

/**
 * Public index display: slug/filename week wins over Approve-day frontmatter stamps.
 * Order: slug day → content frontmatter → DB createdAt.
 */
export function resolvePublishedBriefingDisplayAt(args: {
  content: string;
  createdAt: Date;
  slug?: string | null;
}): { iso: string; sortKey: number } {
  const fromSlug = extractCalendarDayFromFilename(args.slug ?? "");
  if (fromSlug) {
    const iso = calendarDayToPublishedAtIso(fromSlug);
    if (iso) return { iso, sortKey: Date.parse(iso) };
  }

  const fromFront = resolveInstantFromFrontmatter(args.content);
  if (fromFront) {
    return { iso: fromFront, sortKey: Date.parse(fromFront) };
  }

  return {
    iso: args.createdAt.toISOString(),
    sortKey: args.createdAt.getTime(),
  };
}
