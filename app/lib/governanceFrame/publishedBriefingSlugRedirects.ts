/**
 * Legacy public Governance Frame slugs → canonical published-ledger slugs.
 * Keep entries when a promoted edition is renamed so prior URLs still resolve.
 */
export const PUBLISHED_BRIEFING_SLUG_REDIRECTS: Readonly<Record<string, string>> = {
  "2026-07-15-auto-briefing-tenant-sovereignty":
    "2026-05-14-connector-count-sovereign-enclaves",
};

export function resolvePublishedBriefingSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  return PUBLISHED_BRIEFING_SLUG_REDIRECTS[normalized] ?? normalized;
}
