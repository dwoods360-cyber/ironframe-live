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

/**
 * Dual-motion Command packaging (entity / enclave entitlements).
 * Primary Entity = billing control plane. Subtenant Enclave = isolated operating entity.
 * Paid Enclave volume tiers apply only beyond Core's included Subtenant Enclaves.
 */
export const COMMAND_CORE_INCLUDED_SUBTENANT_ENCLAVES = 3 as const;
export const COMMAND_CORE_TOTAL_ENTITIES = 4 as const; // 1 Primary + 3 Subtenants
export const PAID_ENCLAVE_LIST_USD = 3_500 as const;
export const PAID_ENCLAVE_VOLUME_11_50_USD = 2_625 as const; // −25%
export const PAID_ENCLAVE_FLOOR_USD = 1_750 as const; // −50% / volume floor (51+)
export const COMMAND_MULTI_USD = 55_000 as const;
export const COMMAND_MULTI_MAX_ENTITIES = 10 as const;
/** Subtenants in a full Multi book (1 Primary + N Subtenants). */
export const COMMAND_MULTI_SUBTENANTS = (COMMAND_MULTI_MAX_ENTITIES -
  1) as 9;
/** Paid Enclaves to fill Multi from Core (9 Subtenants − 3 included). */
export const PAID_ENCLAVES_TO_FILL_MULTI = (COMMAND_MULTI_SUBTENANTS -
  COMMAND_CORE_INCLUDED_SUBTENANT_ENCLAVES) as 6;
export const COMMAND_ENTERPRISE_USD = 95_000 as const;
export const COMMAND_ENTERPRISE_MAX_ENTITIES = 25 as const;

/** Path B cohort seat — hard commercial cap (not unlimited portfolio load). */
export const PATH_B_PRIMARY_ENTITIES = 1 as const;
export const PATH_B_INCLUDED_SUBTENANT_ENCLAVES = 2 as const;

/** Partner book annual commits (MSSP MSA required — not for holding-co diversion). */
export const PARTNER_SILVER_USD = 50_000 as const;
export const PARTNER_SILVER_ENCLAVES = 15 as const;
export const PARTNER_SILVER_OVERAGE_USD = 2_800 as const;
export const PARTNER_SILVER_WORM_GB = 375 as const; // 15 × 25
export const PARTNER_GOLD_USD = 100_000 as const;
export const PARTNER_GOLD_ENCLAVES = 40 as const;
export const PARTNER_GOLD_OVERAGE_USD = 2_100 as const;
export const PARTNER_GOLD_WORM_GB = 1_024 as const; // 1 TB pool
export const PARTNER_PLATINUM_USD = 200_000 as const;
export const PARTNER_PLATINUM_ENCLAVES = 100 as const;
export const PARTNER_PLATINUM_OVERAGE_USD = 1_500 as const;
export const PARTNER_PLATINUM_WORM_GB = 2_560 as const; // 2.5 TB = 100 × 25

/**
 * Commercial tier codes persisted on Tenant.commercialTier.
 * Drive Subtenant Enclave hard-caps in provisionCorporateTenantCore.
 */
export const COMMERCIAL_TIER = {
  PATH_B: 'PATH_B',
  COMMAND_CORE: 'COMMAND_CORE',
  COMMAND_MULTI: 'COMMAND_MULTI',
  COMMAND_ENTERPRISE: 'COMMAND_ENTERPRISE',
  PARTNER_SILVER: 'PARTNER_SILVER',
  PARTNER_GOLD: 'PARTNER_GOLD',
  PARTNER_PLATINUM: 'PARTNER_PLATINUM',
  /** Multi-Entity Change Order / internal — uncapped. */
  UNLIMITED: 'UNLIMITED',
} as const;

export type CommercialTierCode = (typeof COMMERCIAL_TIER)[keyof typeof COMMERCIAL_TIER];

export const ENCLAVE_ROLE = {
  PRIMARY: 'PRIMARY',
  SUBTENANT: 'SUBTENANT',
} as const;

export type EnclaveRoleCode = (typeof ENCLAVE_ROLE)[keyof typeof ENCLAVE_ROLE];

/** Default max Subtenant Enclaves per commercial tier (Primary not counted). */
export const SUBTENANT_ENCLAVE_CAP_BY_TIER: Record<CommercialTierCode, number> = {
  PATH_B: PATH_B_INCLUDED_SUBTENANT_ENCLAVES,
  COMMAND_CORE: COMMAND_CORE_INCLUDED_SUBTENANT_ENCLAVES,
  COMMAND_MULTI: COMMAND_MULTI_MAX_ENTITIES - 1,
  COMMAND_ENTERPRISE: COMMAND_ENTERPRISE_MAX_ENTITIES - 1,
  PARTNER_SILVER: PARTNER_SILVER_ENCLAVES,
  PARTNER_GOLD: PARTNER_GOLD_ENCLAVES,
  PARTNER_PLATINUM: PARTNER_PLATINUM_ENCLAVES,
  UNLIMITED: Number.MAX_SAFE_INTEGER,
};

/** Fair-use infrastructure per active enclave (COGS guardrails). */
export const WORM_INCLUDED_GB_PER_ENCLAVE_YEAR = 25 as const;
export const WORM_EXPANSION_GB_BLOCK = 50 as const;
export const WORM_EXPANSION_USD_PER_BLOCK_MONTH = 25 as const;
export const WORM_EXPANSION_USD_PER_BLOCK_YEAR = 250 as const;
export const INGEST_INCLUDED_EVENTS_PER_ENCLAVE_MONTH = 5_000_000 as const;
export const INGEST_EXPANSION_EVENTS_BLOCK = 5_000_000 as const;
export const INGEST_EXPANSION_USD_PER_BLOCK_MONTH = 20 as const;

/**
 * Multi-year discounts are NOT on the published price book yet.
 * Founder/CFO discretionary only; never on Path B.
 */
export const MULTI_YEAR_PUBLISHED_DISCOUNT = false as const;
export const MULTI_YEAR_PATH_B_ELIGIBLE = false as const;
export const MULTI_YEAR_DISCRETIONARY_2YR_MAX_PCT = 10 as const;
export const MULTI_YEAR_DISCRETIONARY_3YR_MAX_PCT = 15 as const;

/** Paste-ready Path B entity scope lock for order forms / counsel packet. */
export function pathBEntityScopeLockText(): string {
  return (
    `The Command Design Partner seat (${formatPathBUsd()} flat / ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS} days) ` +
    `includes active deployment for ${PATH_B_PRIMARY_ENTITIES} Primary Entity + up to ` +
    `${PATH_B_INCLUDED_SUBTENANT_ENCLAVES} Subtenant Enclaves. Subtenant expansion beyond this ` +
    `threshold is strictly excluded during the review period and cannot be provisioned via ad-hoc ` +
    `requests. Additional enclaves require an executed Multi-Entity Change Order under the standard ` +
    `Multi-Entity Expansion schedule (Paid Enclave list ${formatUsdWhole(PAID_ENCLAVE_LIST_USD)}/yr, ` +
    `subject to published volume tiers). Path B fees are non-creditable against annual Command ACV ` +
    `except as separately stated in a conversion exhibit.`
  );
}

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
  /** Year-1 Command net after Path B convert credit ($35,000 − $4,999). */
  COMMAND_YEAR1_BALANCE: 'COMMAND_YEAR1_BALANCE_V1',
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

/**
 * Year-1 Command balance after Path B convert credit:
 * planned GA Command ($35,000) − Path B credit ($4,999) = $30,001.
 */
export const DESIGN_PARTNER_YEAR1_COMMAND_BALANCE_USD = (PLANNED_GA_COMMAND_USD -
  DESIGN_PARTNER_CONVERT_CREDIT_USD) as 30_001;
export const DESIGN_PARTNER_YEAR1_COMMAND_BALANCE_CENTS = '3000100' as const;

export function formatUsdWhole(amountUsd: number): string {
  return `$${amountUsd.toLocaleString('en-US')}`;
}

export function formatPathBUsd(): string {
  return formatUsdWhole(DESIGN_PARTNER_PATH_B_USD);
}

export function formatPlannedGaCommandUsd(): string {
  return formatUsdWhole(PLANNED_GA_COMMAND_USD);
}

export function formatYear1CommandBalanceUsd(): string {
  return formatUsdWhole(DESIGN_PARTNER_YEAR1_COMMAND_BALANCE_USD);
}
