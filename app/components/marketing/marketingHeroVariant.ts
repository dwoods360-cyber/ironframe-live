/**
 * Marketing homepage hero variant switch.
 *
 * - `v2` — cleaned hierarchy (brand-first, one H1, one support, primary CTA)
 * - `legacy` — pre-2026-08-11 hero (pill + duplicate audience H1 + dual paragraphs + SLA in hero)
 *
 * Flip to `legacy` to revert until the new composition is approved.
 */
export type MarketingHeroVariant = "v2" | "legacy";

export const MARKETING_HERO_VARIANT: MarketingHeroVariant = "v2";
