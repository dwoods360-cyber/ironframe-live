import { parseFrontmatterField } from "@/app/lib/governanceFrame/briefingMarkdown";

/** Public research-site buckets for rows in the published ledger. */
export type PublishedLedgerKind =
  | "newsletter"
  | "industry_research"
  | "desk_note"
  | "briefing";

/**
 * Classify a published ledger item for research.ironframegrc.com indexes.
 * Newsletters, industry research briefs, and desk notes share the briefings URL
 * path but must not appear under the Briefings index.
 */
export function classifyPublishedLedgerItem(
  markdown: string,
  slug: string,
  title?: string | null,
): PublishedLedgerKind {
  const category = parseFrontmatterField(markdown, "category")?.toLowerCase() ?? "";
  const resolvedTitle =
    (title ?? parseFrontmatterField(markdown, "title") ?? "").trim();

  if (category.includes("newsletter") || /newsletter|ironcast/i.test(slug)) {
    return "newsletter";
  }

  if (
    category.includes("industry research") ||
    category.includes("independent-industry") ||
    category.includes("research-brief") ||
    /^Industry Research Brief\b/i.test(resolvedTitle)
  ) {
    return "industry_research";
  }

  if (
    category.includes("desk note") ||
    category.includes("desk-note") ||
    category.includes("signal") ||
    /desk-note|desk_note|\bsignal\b/i.test(slug) ||
    /^Desk Note\b/i.test(resolvedTitle) ||
    /^Signal\b/i.test(resolvedTitle)
  ) {
    return "desk_note";
  }

  return "briefing";
}

export function isNewsletterLedgerItem(
  markdown: string,
  slug: string,
  title?: string | null,
): boolean {
  return classifyPublishedLedgerItem(markdown, slug, title) === "newsletter";
}

export function isDeskNoteLedgerItem(
  markdown: string,
  slug: string,
  title?: string | null,
): boolean {
  return classifyPublishedLedgerItem(markdown, slug, title) === "desk_note";
}

export function isBriefingIndexItem(
  markdown: string,
  slug: string,
  title?: string | null,
): boolean {
  return classifyPublishedLedgerItem(markdown, slug, title) === "briefing";
}
