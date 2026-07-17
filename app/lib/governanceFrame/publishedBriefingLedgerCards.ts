import "server-only";

import { governanceFrameBriefingUrl } from "@/config/governanceFramePublic";
import {
  loadPublishedBriefingsFromFilesystem,
  type GovernanceBriefing,
} from "@/app/lib/governanceFrame/briefingFilesystemLedger";
import {
  extractExecutiveSummary,
  parseFrontmatterField,
} from "@/app/lib/governanceFrame/briefingMarkdown";
import { isPublicPublishedClassification } from "@/app/lib/governanceFrame/publicPublishedBriefingEligibility";

/**
 * Marketing archive cards — metadata projection of the published ledger only.
 * Never reads docs/briefing-queue. Full body stays on Governance Frame.
 */
export type PublishedBriefingCard = {
  slug: string;
  title: string;
  publishedAt: string;
  oneLiner: string;
  kind: "briefing" | "newsletter";
  /** Canonical article URL on the Governance Frame public origin. */
  canonicalUrl: string;
};

const FORBIDDEN_CARD_CTA =
  /\b(path\s*b|\$\s*4,?999|request demo|contact sales|early enclave|command tier|workflow review)\b/i;

function governanceFrameArticleUrl(slug: string): string {
  return governanceFrameBriefingUrl(slug);
}

function resolveKind(markdown: string, slug: string): "briefing" | "newsletter" {
  const category = parseFrontmatterField(markdown, "category")?.toLowerCase() ?? "";
  if (category.includes("newsletter") || /newsletter|ironcast/i.test(slug)) {
    return "newsletter";
  }
  return "briefing";
}

function resolveOneLiner(markdown: string): string {
  const fromFront =
    parseFrontmatterField(markdown, "summary") ?? extractExecutiveSummary(markdown);
  const raw = (fromFront ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return "Published institutional governance briefing.";
  // Keep cards industry-neutral — drop any accidental GTM CTA phrases.
  if (FORBIDDEN_CARD_CTA.test(raw)) {
    return "Published institutional governance briefing.";
  }
  return raw.length > 220 ? `${raw.slice(0, 217).trimEnd()}…` : raw;
}

/** Internal / staging ledger rows stay off the public marketing archive. */
export function isMarketingArchiveEligible(briefing: GovernanceBriefing): boolean {
  return isPublicPublishedClassification(briefing.classification);
}

export function toPublishedBriefingCard(briefing: GovernanceBriefing): PublishedBriefingCard {
  return {
    slug: briefing.slug,
    title: briefing.title,
    publishedAt: briefing.publishedAt,
    oneLiner: resolveOneLiner(briefing.markdown),
    kind: resolveKind(briefing.markdown, briefing.slug),
    canonicalUrl: governanceFrameArticleUrl(briefing.slug),
  };
}

/**
 * Read-only marketing projector: published filesystem ledger only.
 * Sort newest first for archive display.
 */
export function listPublishedBriefingCards(limit?: number): PublishedBriefingCard[] {
  const published = loadPublishedBriefingsFromFilesystem()
    .filter(isMarketingArchiveEligible)
    .map(toPublishedBriefingCard)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  if (limit != null && limit > 0) return published.slice(0, limit);
  return published;
}
