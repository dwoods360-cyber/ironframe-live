/**
 * Marketing homepage presentation switch (hero composition + marketing fonts).
 *
 * - `v2` — brand-first hierarchy, guided demo as text link, IBM Plex Sans on
 *   marketing/public surfaces (Geist Mono kept for mark + city cycle)
 * - `legacy` — pre-polish hero (dual CTA buttons, Geist/system sans everywhere)
 *
 * Flip to `legacy` to revert until the new presentation is approved.
 */
export type MarketingHeroVariant = "v2" | "legacy";

export const MARKETING_HERO_VARIANT: MarketingHeroVariant = "v2";
