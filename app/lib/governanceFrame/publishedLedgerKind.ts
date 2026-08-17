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

/**
 * Classify from slug/title alone (Ops desk published rows may lack markdown).
 * Same precedence as {@link classifyPublishedLedgerItem} without category frontmatter.
 */
export function classifyPublishedLedgerRow(
  slug: string,
  title?: string | null,
): PublishedLedgerKind {
  return classifyPublishedLedgerItem("", slug, title);
}

/** Reader-facing enclave chrome for a published ledger kind. */
export type PublicationEnclaveMeta = {
  kind: PublishedLedgerKind;
  /** Research-site index path (under research base). */
  indexHref: string;
  /** Back-link label on the article page. */
  backLabel: string;
  /** Sidebar archive heading. */
  archiveHeading: string;
  /** Sidebar archive blurb. */
  archiveBlurb: string;
  /** Empty-state copy. */
  archiveEmpty: string;
  /** Nav aria-label. */
  archiveNavLabel: string;
};

const ENCLAVE_META: Record<PublishedLedgerKind, PublicationEnclaveMeta> = {
  briefing: {
    kind: "briefing",
    indexHref: "/briefings",
    backLabel: "← All briefings",
    archiveHeading: "Archive",
    archiveBlurb: "Other briefings in this enclave — title, date, and synopsis.",
    archiveEmpty: "No other briefings in this enclave yet.",
    archiveNavLabel: "Briefing archive",
  },
  desk_note: {
    kind: "desk_note",
    indexHref: "/desk-notes",
    backLabel: "← All desk notes",
    archiveHeading: "Desk notes",
    archiveBlurb: "Other desk notes in this enclave — title, date, and synopsis.",
    archiveEmpty: "No other desk notes in this enclave yet.",
    archiveNavLabel: "Desk note archive",
  },
  newsletter: {
    kind: "newsletter",
    indexHref: "/newsletters",
    backLabel: "← All newsletters",
    archiveHeading: "Editions",
    archiveBlurb: "Other newsletter editions in this enclave — title, date, and synopsis.",
    archiveEmpty: "No other newsletter editions in this enclave yet.",
    archiveNavLabel: "Newsletter archive",
  },
  industry_research: {
    kind: "industry_research",
    indexHref: "/research-papers",
    backLabel: "← All research papers",
    archiveHeading: "Research briefs",
    archiveBlurb: "Other industry research briefs in this enclave — title, date, and synopsis.",
    archiveEmpty: "No other industry research briefs in this enclave yet.",
    archiveNavLabel: "Industry research archive",
  },
};

export function publicationEnclaveMeta(kind: PublishedLedgerKind): PublicationEnclaveMeta {
  return ENCLAVE_META[kind];
}
