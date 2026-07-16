import "server-only";

import prisma from "@/lib/prisma";
import type { PublishedBriefing as PublishedBriefingRecord } from "@prisma/client";

import {
  BRIEFING_QUEUE_DIR,
  PUBLISHED_BRIEFINGS_DIR,
  QUARANTINE_ALLOWLIST,
  enforceBriefingQuarantine,
  loadBriefingBySlugFromFilesystem,
  loadPublishedBriefingsFromFilesystem,
  resolveDocsRoot,
  type GovernanceBriefing,
} from "@/app/lib/governanceFrame/briefingFilesystemLedger";
import { briefingBodyMarkdown } from "@/app/lib/governanceFrame/briefingMarkdown";
import { stripFrontmatter } from "@/app/lib/governanceFrame/briefingDraftValidation";
import { resolvePublishedBriefingSlug } from "@/app/lib/governanceFrame/publishedBriefingSlugRedirects";

export {
  BRIEFING_QUEUE_DIR,
  PUBLISHED_BRIEFINGS_DIR,
  QUARANTINE_ALLOWLIST,
  stripFrontmatter,
  briefingBodyMarkdown,
  enforceBriefingQuarantine,
  loadBriefingBySlugFromFilesystem,
  loadPublishedBriefingsFromFilesystem,
  resolveDocsRoot,
};

export type { GovernanceBriefing };

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
  const normalized = resolvePublishedBriefingSlug(slug);
  if (!normalized || normalized.includes("..") || normalized.includes("/")) return null;

  const record = await prisma.publishedBriefing.findUnique({
    where: { slug: normalized },
  });

  return record ? mapPublishedBriefingRecord(record) : null;
}

/** @deprecated Filesystem mirror — Ironcast newsletter worker only; prefer `fetchPublishedBriefings`. */
export function loadPublishedBriefings(): GovernanceBriefing[] {
  return loadPublishedBriefingsFromFilesystem();
}

/** @deprecated Filesystem mirror — Ironcast newsletter worker only; prefer `fetchBriefingBySlug`. */
export function loadBriefingBySlug(slug: string): GovernanceBriefing | null {
  return loadBriefingBySlugFromFilesystem(slug);
}
