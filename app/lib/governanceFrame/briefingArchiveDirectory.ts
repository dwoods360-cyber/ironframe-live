import "server-only";

import type { GovernanceBriefing } from "@/app/lib/governanceFrame/briefingFilesystemLedger";
import {
  extractExecutiveSummary,
  parseFrontmatterField,
} from "@/app/lib/governanceFrame/briefingMarkdown";
import { isBriefingIndexItem } from "@/app/lib/governanceFrame/publishedLedgerKind";

/** Research-site vertical archive row (briefings index only). */
export type BriefingArchiveEntry = {
  slug: string;
  title: string;
  publishedAt: string;
  synopsis: string;
};

const FORBIDDEN_SYNOPSIS =
  /\b(path\s*b|\$\s*4,?999|request demo|contact sales|early enclave|command tier|workflow review)\b/i;

function resolveSynopsis(markdown: string): string {
  const fromFront =
    parseFrontmatterField(markdown, "summary") ?? extractExecutiveSummary(markdown);
  const raw = (fromFront ?? "").replace(/\s+/g, " ").trim();
  if (!raw || FORBIDDEN_SYNOPSIS.test(raw)) {
    return "Published institutional governance briefing.";
  }
  return raw.length > 180 ? `${raw.slice(0, 177).trimEnd()}…` : raw;
}

/** Short synopsis for list and archive rows (summary frontmatter or executive summary). */
export function briefingSynopsisFromMarkdown(markdown: string): string {
  return resolveSynopsis(markdown);
}

/**
 * Newest-first archive directory for ordinary briefings (excludes newsletters
 * and industry research briefs, which have their own indexes).
 */
export function listBriefingArchiveEntries(
  ledger: GovernanceBriefing[],
): BriefingArchiveEntry[] {
  return ledger
    .filter((item) => isBriefingIndexItem(item.markdown, item.slug, item.title))
    .map((item) => ({
      slug: item.slug,
      title: item.title,
      publishedAt: item.publishedAt,
      synopsis: resolveSynopsis(item.markdown),
    }))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}
