/**
 * Compact Ironframe GRC product facts for board personas and perimeter drafts.
 * Keep short — manuals live under docs/user-manuals and docs/technical.
 */

export const PRODUCT_NAME = 'Ironframe GRC' as const;

export const PRODUCT_POSITIONING = `
Ironframe is the control-first GRC platform that gives boards and auditors numbers they can defend —
BigInt ALE in whole cents, zero-trust ingest (Irongate), native multi-tenant isolation, and observable AI agents —
not heatmap theater or spreadsheet governance.
`.trim();

export const PRODUCT_DIFFERENTIATORS = [
  'BigInt ALE / loss exposure in integer cents — board-defendable math',
  'Irongate DMZ — sanitize external intel before persist',
  'Native Command Center multi-tenant isolation (RLS + Ironguard)',
  'HITL perimeter workers — drafts never auto-send',
  'Ironbloom physical-unit sustainability (kWh, L, km) — not monetary ESG proxies',
] as const;

export const FORBIDDEN_PRODUCT_CLAIMS = [
  'medshield / vaultbank / gridcore as real customers (SYNTHETIC_DEMO_SEED)',
  'per-seat / per-month licensing',
  'SOC 2 / ISO certified (use SOC2-aligned until certified)',
  'free forever design partners beside Path B',
  'SalesTeam :8084 administration portal / Message Constitution UI (does not exist)',
  'SuccessTeam Portal / Ops Hub Knowledge Base as the store for user training docs (does not exist)',
  'Docs Hub uses Command Center 22/48/30 tripane layout (false — DocsChrome reader shell)',
  'tell design partners to run seed-app-documents.ts (instructor/internal only)',
] as const;

/** In-app documentation reader route (APP_DOCS plane). */
export const DOCS_HUB_HREF = '/docs' as const;

export const MESSAGE_CONSTITUTION_RULES = [
  'CTA = 10–15 minute workflow review on evidence / board-report pain — not Request Demo / free pilot',
  'Workflow review doctrine: peer-to-peer technical diligence (docs/sales/design-partner-workflow-review-protocol.md) — clinical architect tone, not multi-stage sales script',
  'Workflow review next step: order form → provision → Path B link — not NDA/schema review as the gate; human hosts the call',
  'PENDING partners: tenant-scoped Path B activation link only — never generic /pricing',
  'Customer is hero; Ironframe is guide (StoryBrand for drafts; stripped diligence on the call)',
  'Beachhead scaffolding: SalesTeam/src/config/beachheadPrompts.ts — edit code, redeploy worker',
  'SalesTeam HTTP: GET /health + POST /poll only',
] as const;

/** Canonical partner learning surfaces (Core /docs + Get Started) — not Ops Hub Approvals. */
export const PARTNER_OPERATOR_PACKET_HREF =
  '/docs/user-manuals/design-partner-operator-packet' as const;
export const PARTNER_TRAINING_INDEX_HREF = '/docs/training/LEVEL1-PARTNER-INDEX' as const;
export const PARTNER_GET_STARTED_HREF = '/get-started' as const;
export const PARTNER_CS_PLAYBOOK_DOC =
  'docs/customer-success/onboarding-success-playbook.md' as const;

/** One paragraph for SalesTeam / Support appendices when product context is needed. */
export function buildProductFactsBlurb(): string {
  return [
    PRODUCT_POSITIONING,
    `Differentiators: ${PRODUCT_DIFFERENTIATORS.slice(0, 3).join('; ')}.`,
    'Anti-hallucination: never invent portals, Knowledge Bases, certifications, customers, or pricing — if unsure, omit.',
  ].join(' ');
}

/** Short handoff lines for SuccessTeam advisories and operator chat. */
export function buildPartnerLearningLinksBlurb(): string {
  return [
    `Partner learning (hand these — do not invent other stores):`,
    `1) Operator Packet ${PARTNER_OPERATOR_PACKET_HREF}`,
    `2) LEVEL1 partner training ${PARTNER_TRAINING_INDEX_HREF}`,
    `3) In-app checklist ${PARTNER_GET_STARTED_HREF}`,
    `Approvals CUSTOMER_SUCCESS = HITL send queue only — not where training documents live.`,
  ].join(' ');
}

/**
 * Canonical human-readable answer for "where is the docs hub?"
 * Plain prose only — no markdown chapter scaffolding.
 */
export function buildDocsHubLocationAnswer(): string {
  return [
    `The Docs Hub is the in-app documentation reader at ${DOCS_HUB_HREF}`,
    `(for example https://{your-slug}.ironframegrc.com${DOCS_HUB_HREF}, or open Docs in navigation).`,
    `It serves Level 1 manuals, training indexes, and operator guides from the app documents store.`,
    `The page uses the Docs reader shell (top bar, sidebar, article) — not the Command Center three-panel cockpit.`,
    `Design partners should start from ${PARTNER_OPERATOR_PACKET_HREF} and ${PARTNER_TRAINING_INDEX_HREF};`,
    `use ${PARTNER_GET_STARTED_HREF} for the checklist. Partners do not run seed-app-documents terminal commands.`,
  ].join(' ');
}

/**
 * Canonical human-readable answer for "where are the user training documents?"
 * Plain prose only — no markdown chapter scaffolding.
 */
export function buildTrainingDocsLocationAnswer(): string {
  return [
    `User training lives on Core at ${DOCS_HUB_HREF}, not in a SuccessTeam Portal or Ops Hub Knowledge Base.`,
    `Design partners use the Operator Packet at ${PARTNER_OPERATOR_PACKET_HREF},`,
    `the curated partner training index at ${PARTNER_TRAINING_INDEX_HREF},`,
    `and the in-app checklist at ${PARTNER_GET_STARTED_HREF}.`,
    `Approvals CUSTOMER_SUCCESS only queues outbound messages for human approve/deny — it does not store manuals.`,
    `For deeper curriculum, browse the training chapters under ${DOCS_HUB_HREF}/training/ after opening the partner index.`,
  ].join(' ');
}

/** Operator-facing answer style for location / “where is” SaaS questions. */
export const OPERATOR_LOCATION_ANSWER_RULES = [
  'Answer location questions in 2–5 sentences of plain human-readable prose',
  'Do not format answers as markdown training chapters (# headings, ### Step N, checklist tables, glossary blocks)',
  'Do not invent Ops Hub / SuccessTeam Knowledge Base stores for manuals',
  'Docs Hub = /docs with DocsChrome — never claim 22%/48%/30% Command Center layout for /docs',
  'Partners: operator packet + LEVEL1-PARTNER-INDEX + /get-started — not LEVEL1-STUDENT-INDEX as primary',
] as const;

/**
 * Global anti-hallucination rules for IronBoard boardroom + all perimeter workforce
 * (Ironleads, SalesTeam, SuccessTeam, SupportTeam) and Ops Hub worker chat.
 */
export const ANTI_HALLUCINATION_RULES = [
  'NEVER invent product surfaces, portals, Knowledge Bases, admin UIs, routes, buttons, or stores that are not in lib/ironframeProductKnowledge, tool receipts, or live Ironframe telemetry',
  'NEVER invent customers, logos, certifications, pricing, feature GA status, or audit outcomes',
  'If unsure: say you do not know / cannot verify — do not fill gaps with plausible fiction',
  'Prefer short human-readable prose for operator Q&A; do not paste fake markdown training chapters',
  'CRM / pipeline / playbook claims require tool receipts (manageCrmPipeline / queryLocalWorkspace) — never prose memory alone',
  'Commercial and Path B amounts only from commercial.ts constants — never invent seat/month pricing',
  'Training / Docs Hub locations only from productFacts canonical answers — never SuccessTeam Portal KB or Approvals as a doc store',
] as const;

/** Compact block injected into board + workforce system prompts. */
export function buildAntiHallucinationMandate(): string {
  return [
    'ANTI-HALLUCINATION MANDATE (NON-NEGOTIABLE — IronBoard + workforce):',
    ...ANTI_HALLUCINATION_RULES.map((r) => `- ${r}`),
    `Forbidden claim examples: ${FORBIDDEN_PRODUCT_CLAIMS.slice(0, 5).join('; ')}; …`,
  ].join('\n');
}
