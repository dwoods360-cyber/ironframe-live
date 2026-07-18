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

/** Stable commercial SKUs (code registry intent). */
export const COMMERCIAL_SKUS = {
  PATH_B_COMMAND_TIER: 'COMMAND_TIER_V1',
  FINTECH_SEED: 'FINTECH_SEED',
  SERIES_A_GROWTH: 'SERIES_A_GROWTH',
  VAULT_SHIELD: 'VAULT_SHIELD',
} as const;

export const DESIGN_PARTNER_WINDOW_DAYS = '60-90' as const;
export const DESIGN_PARTNER_SUCCESS_CRITERIA_COUNT = '2-3' as const;
export const DESIGN_PARTNER_COHORT_SEATS = '3-5' as const;
export const WORKFLOW_REVIEW_CTA_MINUTES = '10-15' as const;

export function formatUsdWhole(amountUsd: number): string {
  return `$${amountUsd.toLocaleString('en-US')}`;
}

export function formatPathBUsd(): string {
  return formatUsdWhole(DESIGN_PARTNER_PATH_B_USD);
}

export function formatPlannedGaCommandUsd(): string {
  return formatUsdWhole(PLANNED_GA_COMMAND_USD);
}
