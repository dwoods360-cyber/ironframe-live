import { parseFrontmatterField } from "@/app/lib/governanceFrame/briefingMarkdown";

/** Public research-site buckets for rows in the published ledger. */
export type PublishedLedgerKind = "newsletter" | "industry_research" | "briefing";

/**
 * Classify a published ledger item for research.ironframegrc.com indexes.
 * Newsletters and industry research briefs share the briefings URL path but
 * must not appear under the Briefings index.
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

  return "briefing";
}

export function isNewsletterLedgerItem(
  markdown: string,
  slug: string,
  title?: string | null,
): boolean {
  return classifyPublishedLedgerItem(markdown, slug, title) === "newsletter";
}

export function isBriefingIndexItem(
  markdown: string,
  slug: string,
  title?: string | null,
): boolean {
  return classifyPublishedLedgerItem(markdown, slug, title) === "briefing";
}
