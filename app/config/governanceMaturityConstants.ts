/**
 * Client-safe governance maturity constants (no `server-only`).
 * Server modules re-export from here to avoid pulling `fs` into client bundles.
 */

export const GOVERNANCE_MATURITY_MIN = 1;
export const GOVERNANCE_MATURITY_MAX = 10;
export const GOVERNANCE_DEGRADATION_THRESHOLD = 5;
export const GOVERNANCE_NEUTRALIZE_MIN_NORMAL = 50;
export const GOVERNANCE_NEUTRALIZE_MIN_DEGRADED = 75;
/** Ironlock (Agent 6): during Ironwatch Stale Data (live grid API down), raise attestation floor for human scrutiny. */
export const IRONLOCK_STALE_DATA_FORENSIC_MIN_CHARS = 100;
export const GOVERNANCE_MATURITY_TREND_DAYS = 30;
export const GOVERNANCE_DEGRADATION_ACTION = "GOVERNANCE_DEGRADATION";
