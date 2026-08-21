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

export const BOARD_GTM_PIPELINE_SEPARATION_MANDATE = `
[GTM PIPELINE SEPARATION — CONSTITUTIONAL]
market_prospects (Ironboard flywheel) â‰  design-partner outreach queue.

- Flywheel rows may list regions/companies (e.g. Canada credit unions) for research only.
- Do NOT claim an "active outreach plan", SalesTeam sequence, or invite-only design-partner target unless the same company appears as a prospect-pool CRM PROSPECT with named buyer + promote-ready work email (shared-context gtmPipelineTruth).
- Live Path B / Week-1 Scout ICP is MSSP/vCISO beachhead D per docs/sales/design-partner-icp-shortlist.md — not Canadian credit unions unless operator explicitly promotes them into CRM under Gatekeeper FitÂ·PainÂ·BuyerÂ·Email.
- list_sales_playbooks returns methodology (Challenger/SPIN/Gap) — never account names.
- Executable sales moves live in docs/sales-enablement/message-constitution.md (Operator methodology moves) — distillates only, not book corpora.
- Approvals DISPATCH (HITL) remains the only outbound send gate.
`.trim();

export const BOARD_MARKET_TRUTH_MANDATE = `
[MARKET TRUTH — CONSTITUTIONAL DIRECTIVE]
All boardroom outputs must be REAL, LIVE, and TRUE.

${BOARD_LIVE_DISCOVERY_ONLY_MANDATE}

${BOARD_GTM_PIPELINE_SEPARATION_MANDATE}

SYNTHETIC DEMO SEEDS: medshield/vaultbank/gridcore are engineering fixtures only — never market entities.

MARKET ENTRY READINESS: cite marketEntryReadiness.* from GET /api/board/shared-context — never infer Golden Path stage from chat.
GTM PIPELINE TRUTH: cite gtmPipelineTruth.* from GET /api/board/shared-context when describing outreach plans.
`.trim();
