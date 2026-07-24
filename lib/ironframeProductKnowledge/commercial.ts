/**
 * Canonical commercial constants for IronBoard + perimeter workers.
 * Edit here once — CI asserts SalesTeam / board / enablement docs stay aligned.
 */

/** Path B / Command Tier design-partner on-ramp (whole USD). */
export const DESIGN_PARTNER_PATH_B_USD = 4999 as const;

/** Path B amount in integer cents (BigInt-safe digit string). */
export const DESIGN_PARTNER_PATH_B_CENTS = '499900' as const;

/** Planned GA Ironframe Command / Fintech Seed (label "planned GA" until IRONFRAME_COMMERCIAL_GA). */
export const PLANNED_GA_COMMAND_USD = 35_000 as const;
export const PLANNED_GA_COMMAND_CENTS = '3500000' as const;

/** Planned GA Series A Growth / Sustainability track. */
export const PLANNED_GA_GROWTH_USD = 75_000 as const;
export const PLANNED_GA_GROWTH_CENTS = '7500000' as const;

/** Customer-facing package labels (Phase 2+ catalog). */
export const CUSTOMER_PACKAGE_LABELS = [
  'Command',
  'Sustainability',
  'Vault',
] as const;

/**
 * Partner-facing Path B SKU name — say this on calls, LIVE ask, cold email/SMS, offer sheet.
 * Internal code remains "Path B" for Stripe, R2 locks, and provision-admin chrome.
 */
export const CUSTOMER_FACING_PATH_B_SKU = 'Command Design Partner' as const;

/** Internal commercial code (ops / Stripe / locks) for {@link CUSTOMER_FACING_PATH_B_SKU}. */
export const INTERNAL_PATH_B_CODE = 'Path B' as const;

/** Operator chrome: spoken SKU + internal alias so hosts are not dual-trained. */
export function formatDesignPartnerSkuWithInternalHint(): string {
  return `${CUSTOMER_FACING_PATH_B_SKU} (internal: ${INTERNAL_PATH_B_CODE})`;
}

/** Umbrella ICP label for the paid co-builder cohort (all Core 4 beachheads). */
export const CUSTOMER_FACING_AUDIENCE_UMBRELLA = 'multi-entity GRC operators' as const;

/** Stable commercial SKUs (code registry intent). */
export const COMMERCIAL_SKUS = {
  PATH_B_COMMAND_TIER: 'COMMAND_TIER_V1',
  FINTECH_SEED: 'FINTECH_SEED',
  SERIES_A_GROWTH: 'SERIES_A_GROWTH',
  VAULT_SHIELD: 'VAULT_SHIELD',
} as const;

/**
 * Internal commercial band (order forms / CS timelines).
 * Buyer-facing surfaces (site, LinkedIn, cold email/SMS) must say DEFAULT, not this band —
 * mismatched windows are a known reason buyers stall or leave.
 */
export const DESIGN_PARTNER_WINDOW_DAYS = '60-90' as const;
/** Default Path B length for public hero, pricing, outreach, and order-form default. */
export const DESIGN_PARTNER_DEFAULT_WINDOW_DAYS = 90 as const;
/** Floor when a faster scoped engagement is agreed in writing (not public default). */
export const DESIGN_PARTNER_MIN_WINDOW_DAYS = 60 as const;
export const DESIGN_PARTNER_SUCCESS_CRITERIA_COUNT = '2-3' as const;
export const DESIGN_PARTNER_COHORT_SEATS = '3-5' as const;
export const WORKFLOW_REVIEW_CTA_MINUTES = '10-15' as const;

/**
 * Convert credit (not a negotiated % discount): if the partner converts to planned GA
 * Command within the Path B window, the Path B fee is credited to first-year Command.
 * Path B remains non-refundable on exit.
 */
export const DESIGN_PARTNER_CONVERT_CREDIT_USD = DESIGN_PARTNER_PATH_B_USD;

export function formatUsdWhole(amountUsd: number): string {
  return `$${amountUsd.toLocaleString('en-US')}`;
}

export function formatPathBUsd(): string {
  return formatUsdWhole(DESIGN_PARTNER_PATH_B_USD);
}

export function formatPlannedGaCommandUsd(): string {
  return formatUsdWhole(PLANNED_GA_COMMAND_USD);
}
