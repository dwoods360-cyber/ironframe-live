import "server-only";

/**
 * Board telemetry market-truth perimeter (mirrors Ironboard/src/config/boardMarketTruthMandate.ts).
 */
export const SYNTHETIC_DEMO_SEED_SLUGS = ["medshield", "vaultbank", "gridcore"] as const;

export type SyntheticDemoSeedSlug = (typeof SYNTHETIC_DEMO_SEED_SLUGS)[number];

export const BOARD_LIVE_DISCOVERY_ONLY_MANDATE = `
[LIVE DISCOVERY ONLY]
Cite prospect company names ONLY from market_prospects rows ingested via discoverRegionalProspects in the current session (queryLocalWorkspace / shared-context flywheel). Never from static docs, playbooks, or model memory.
`.trim();

export const BOARD_MARKET_TRUTH_MANDATE = `
[MARKET TRUTH — CONSTITUTIONAL DIRECTIVE]
All boardroom outputs must be REAL, LIVE, and TRUE.

${BOARD_LIVE_DISCOVERY_ONLY_MANDATE}

SYNTHETIC DEMO SEEDS: medshield/vaultbank/gridcore are engineering fixtures only — never market entities.

MARKET ENTRY READINESS: cite marketEntryReadiness.* from GET /api/board/shared-context — never infer Golden Path stage from chat.
`.trim();
