/**
 * Curated SaaS facts for LIVE Pocket Q&A (workflow-review sidecar).
 * Spoken, short answers only — grounded in commercial.ts / productFacts.
 * No invented certs, customers, soft “max clients,” or free pilots.
 * Edit here when product Qs keep arising on calls; unit tests assert lookup behavior.
 */

import {
  COMMAND_CORE_INCLUDED_SUBTENANT_ENCLAVES,
  COMMAND_CORE_TOTAL_ENTITIES,
  COMMAND_ENTERPRISE_MAX_ENTITIES,
  COMMAND_ENTERPRISE_USD,
  COMMAND_MULTI_MAX_ENTITIES,
  COMMAND_MULTI_USD,
  CUSTOMER_FACING_PATH_B_SKU,
  DESIGN_PARTNER_COHORT_SEATS,
  DESIGN_PARTNER_DEFAULT_WINDOW_DAYS,
  DESIGN_PARTNER_MIN_WINDOW_DAYS,
  DESIGN_PARTNER_SUCCESS_CRITERIA_COUNT,
  INGEST_EXPANSION_EVENTS_BLOCK,
  INGEST_EXPANSION_USD_PER_BLOCK_MONTH,
  INGEST_INCLUDED_EVENTS_PER_ENCLAVE_MONTH,
  PAID_ENCLAVE_FLOOR_USD,
  PAID_ENCLAVE_LIST_USD,
  PAID_ENCLAVE_VOLUME_11_50_USD,
  PARTNER_GOLD_ENCLAVES,
  PARTNER_GOLD_OVERAGE_USD,
  PARTNER_GOLD_USD,
  PARTNER_PLATINUM_ENCLAVES,
  PARTNER_PLATINUM_OVERAGE_USD,
  PARTNER_PLATINUM_USD,
  PARTNER_SILVER_ENCLAVES,
  PARTNER_SILVER_OVERAGE_USD,
  PARTNER_SILVER_USD,
  PATH_B_INCLUDED_SUBTENANT_ENCLAVES,
  PATH_B_PRIMARY_ENTITIES,
  PLANNED_GA_COMMAND_USD,
  PLANNED_GA_GROWTH_USD,
  WORM_EXPANSION_GB_BLOCK,
  WORM_EXPANSION_USD_PER_BLOCK_MONTH,
  WORM_EXPANSION_USD_PER_BLOCK_YEAR,
  WORM_INCLUDED_GB_PER_ENCLAVE_YEAR,
  WORKFLOW_REVIEW_CTA_MINUTES,
  formatPathBUsd,
  formatPlannedGaCommandUsd,
  formatUsdWhole,
  formatYear1CommandBalanceUsd,
} from "./commercial";
import {
  DOCS_HUB_HREF,
  PARTNER_GET_STARTED_HREF,
  PARTNER_OPERATOR_PACKET_HREF,
  PARTNER_TRAINING_INDEX_HREF,
  PRODUCT_DIFFERENTIATORS,
  PRODUCT_NAME,
} from "./productFacts";

export type SaasCallKbEntry = {
  id: string;
  /** Operator-facing topic label (optional UI later). */
  topic: string;
  match: RegExp;
  answer: string;
};

const PATH_B_TOTAL_ENTITIES = PATH_B_PRIMARY_ENTITIES + PATH_B_INCLUDED_SUBTENANT_ENCLAVES;

/**
 * Correct “$4,999 + $3,500 = four tenants?” stacking math.
 * Paid Enclave is a planned-GA add-on beyond Core’s included Subtenants — not a Path B bolt-on.
 */
export function saasEntityStackingCostAnswer(): string {
  return (
    `No — do not stack ${formatPathBUsd()} + ${formatUsdWhole(PAID_ENCLAVE_LIST_USD)} for a fourth tenant. ` +
    `${CUSTOMER_FACING_PATH_B_SKU} is a flat ${formatPathBUsd()} for ${PATH_B_PRIMARY_ENTITIES} Primary + up to ` +
    `${PATH_B_INCLUDED_SUBTENANT_ENCLAVES} Subtenant Enclaves (${PATH_B_TOTAL_ENTITIES} total). A fourth enclave is ` +
    `blocked on Path B without a written Multi-Entity Change Order — Paid Enclave is not an automatic Path B add-on. ` +
    `For four entities at planned GA, Command Core is ${formatUsdWhole(PLANNED_GA_COMMAND_USD)}/yr and already includes ` +
    `${PATH_B_PRIMARY_ENTITIES} Primary + ${COMMAND_CORE_INCLUDED_SUBTENANT_ENCLAVES} Subtenants ` +
    `(${COMMAND_CORE_TOTAL_ENTITIES} total) — you do not pay Core plus ${formatUsdWhole(PAID_ENCLAVE_LIST_USD)} for the fourth. ` +
    `Paid Enclave (${formatUsdWhole(PAID_ENCLAVE_LIST_USD)}/yr list, volume tiers) starts at entity #5 and beyond ` +
    `(beyond Core’s three included Subtenants).`
  );
}

/** Spoken capacity lock — keep in sync with commercial.ts dual-motion packaging. */
export function saasCapacityClientsTenantsAnswer(): string {
  return (
    `Direct answer: beyond ${PATH_B_TOTAL_ENTITIES} entities is a commercial expansion, not a platform “upload” ceiling — ` +
    `and it is not ${formatPathBUsd()} + ${formatUsdWhole(PAID_ENCLAVE_LIST_USD)}. ` +
    `${CUSTOMER_FACING_PATH_B_SKU} (${formatPathBUsd()} / ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day) hard-caps at ` +
    `${PATH_B_PRIMARY_ENTITIES} Primary Entity + up to ${PATH_B_INCLUDED_SUBTENANT_ENCLAVES} Subtenant Enclaves ` +
    `(${PATH_B_TOTAL_ENTITIES} total). You cannot load a fourth enclave on Path B without a written Multi-Entity Change Order. ` +
    `Planned GA Command Core is ${formatUsdWhole(PLANNED_GA_COMMAND_USD)}/yr for ${PATH_B_PRIMARY_ENTITIES} Primary + ` +
    `${COMMAND_CORE_INCLUDED_SUBTENANT_ENCLAVES} Subtenants (${COMMAND_CORE_TOTAL_ENTITIES} total) — four entities are inside Core, ` +
    `not Core + Paid Enclave. Paid Enclaves start at ${formatUsdWhole(PAID_ENCLAVE_LIST_USD)}/yr for entity #5+ ` +
    `(published volume tiers), or Command Multi / Enterprise book (${COMMAND_MULTI_MAX_ENTITIES} / ${COMMAND_ENTERPRISE_MAX_ENTITIES} entities) ` +
    `or Partner book for true MSSPs. Do not promise unlimited enclaves at flat Core. Do not quote the company-wide ` +
    `Design Partner co-builder seat count (${DESIGN_PARTNER_COHORT_SEATS}) as a client/tenant ceiling.`
  );
}

export function saasCommandCorePackagingAnswer(): string {
  return (
    `Planned GA Command Core is ${formatUsdWhole(PLANNED_GA_COMMAND_USD)}/yr — always say “planned GA” until commercial GA is on. ` +
    `Includes ${PATH_B_PRIMARY_ENTITIES} Primary Entity + ${COMMAND_CORE_INCLUDED_SUBTENANT_ENCLAVES} Subtenant Enclaves ` +
    `(${COMMAND_CORE_TOTAL_ENTITIES} total). Entry today is still ${CUSTOMER_FACING_PATH_B_SKU} at ${formatPathBUsd()} ` +
    `for ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS} days with a ${PATH_B_PRIMARY_ENTITIES}+${PATH_B_INCLUDED_SUBTENANT_ENCLAVES} hard cap.`
  );
}

export function saasPaidEnclaveAnswer(): string {
  return (
    `Paid Enclave list is ${formatUsdWhole(PAID_ENCLAVE_LIST_USD)}/yr per additional Subtenant beyond Command Core’s included three. ` +
    `Volume: ${formatUsdWhole(PAID_ENCLAVE_VOLUME_11_50_USD)} (11–50 Paid) and ${formatUsdWhole(PAID_ENCLAVE_FLOOR_USD)} floor (51+). ` +
    `During ${CUSTOMER_FACING_PATH_B_SKU}, expansion beyond ${PATH_B_PRIMARY_ENTITIES}+${PATH_B_INCLUDED_SUBTENANT_ENCLAVES} needs a written Multi-Entity Change Order — not ad-hoc upload.`
  );
}

export function saasCommandMultiEnterpriseAnswer(): string {
  return (
    `Planned GA quote masks: Command Multi ${formatUsdWhole(COMMAND_MULTI_USD)}/yr up to ${COMMAND_MULTI_MAX_ENTITIES} entities; ` +
    `Command Enterprise ${formatUsdWhole(COMMAND_ENTERPRISE_USD)}/yr up to ${COMMAND_ENTERPRISE_MAX_ENTITIES} entities. ` +
    `These are holding-co / mid-market books over Core + Paid Enclave math — label planned GA. ` +
    `Today’s paid entry remains ${CUSTOMER_FACING_PATH_B_SKU} ${formatPathBUsd()}.`
  );
}

export function saasPartnerBookAnswer(): string {
  return (
    `MSSP / managed Partner book (requires Partner MSA; enclaves = unaffiliated end-clients, not buyer subsidiaries): ` +
    `Silver ${formatUsdWhole(PARTNER_SILVER_USD)}/yr · ${PARTNER_SILVER_ENCLAVES} enclaves · overage ${formatUsdWhole(PARTNER_SILVER_OVERAGE_USD)}/enclave/yr; ` +
    `Gold ${formatUsdWhole(PARTNER_GOLD_USD)}/yr · ${PARTNER_GOLD_ENCLAVES} · ${formatUsdWhole(PARTNER_GOLD_OVERAGE_USD)}; ` +
    `Platinum ${formatUsdWhole(PARTNER_PLATINUM_USD)}/yr · ${PARTNER_PLATINUM_ENCLAVES} · ${formatUsdWhole(PARTNER_PLATINUM_OVERAGE_USD)}. ` +
    `Do not sell Partner book as a holding-company shortcut around Core.`
  );
}

export function saasFairUseWormIngestAnswer(): string {
  return (
    `Fair-use per active enclave: WORM evidence ${WORM_INCLUDED_GB_PER_ENCLAVE_YEAR} GB/year included; expansion ` +
    `${formatUsdWhole(WORM_EXPANSION_USD_PER_BLOCK_MONTH)}/${WORM_EXPANSION_GB_BLOCK} GB/month ` +
    `(or ${formatUsdWhole(WORM_EXPANSION_USD_PER_BLOCK_YEAR)}/yr prepaid). ` +
    `Telemetry ingest ${INGEST_INCLUDED_EVENTS_PER_ENCLAVE_MONTH.toLocaleString("en-US")} events/month included; expansion ` +
    `${formatUsdWhole(INGEST_EXPANSION_USD_PER_BLOCK_MONTH)} per ${INGEST_EXPANSION_EVENTS_BLOCK.toLocaleString("en-US")} events/month. ` +
    `Hard stop near 3× fair-use without an Expansion SKU — don’t invent unlimited storage.`
  );
}

export function saasPocketTopicCatalog(): string {
  return (
    "capacity/enclaves · Command Core · Paid Enclave · Multi/Enterprise · Partner book · convert credit · " +
    "window/eng syncs · fair-use WORM/ingest · modules · seats · isolation · SOC2 · HITL · hosting · " +
    "integrations · docs · next-step gate · Growth/Sustainability"
  );
}

/**
 * Order matters: first regex win. Keep hard commercial locks in workflowReviewCallAssistCore
 * POCKET_QA (free pilot / SOC2 / demo gate); this KB covers product + packaging shape.
 */
export const SAAS_CALL_KNOWLEDGE_BASE: readonly SaasCallKbEntry[] = [
  {
    id: "entity-stacking-cost",
    topic: "Entity stacking math ($4,999 + Paid Enclave)",
    match:
      /4,?999\s*\+|\$?4,?999.{0,40}3,?500|3,?500.{0,40}4,?999|upload\s*4|four\s*(tenants?|entities|enclaves).{0,40}(cost|price|\$)|(?:cost|price|total).{0,40}(4|four)\s*(tenants?|entities|enclaves)|stack(ing)?\s*(enclave|tenant|path\s*b)|plus\s*(a\s*)?(paid\s*)?enclave/i,
    answer: saasEntityStackingCostAnswer(),
  },
  {
    id: "capacity-clients-tenants",
    topic: "Client / tenant capacity",
    match:
      /(?:more\s+than|over|above|\d+\+?)\s*(clients?|tenants?|entities|enclaves)|(?:upload|add|load|onboard|run|support|host).{0,40}(?:clients?|tenants?|entities|enclaves)|(?:clients?|tenants?|entities|enclaves).{0,40}(?:upload|add|load|onboard|more)|max(imum)?\s*(number\s*of\s*)?(clients?|tenants?|entities|enclaves)|(how\s*many|number\s*of)\s*(clients?|tenants?|entities|enclaves)|(clients?|tenants?|entities|enclaves)\s*(we\s*can\s*)?(load|run|onboard|add|support|host|upload)|client\s*limit|tenant\s*limit|entity\s*limit|enclave\s*(cap|limit)|unlimited\s*(clients?|tenants?|enclaves)|capacity|scale\s*(to|with)\s*(clients?|tenants?|entities|enclaves)/i,
    answer: saasCapacityClientsTenantsAnswer(),
  },
  {
    id: "packaging-command-core",
    topic: "Command Core packaging",
    match:
      /command\s*core|core\s*(sku|tier|package|pricing)|35,?000|\$35k|planned\s*ga\s*command(?!\s*multi|\s*enterprise)/i,
    answer: saasCommandCorePackagingAnswer(),
  },
  {
    id: "packaging-paid-enclave",
    topic: "Paid Enclave add-on",
    match:
      /paid\s*enclave|additional\s*(sub)?tenant|extra\s*(enclave|entity|tenant)|3,?500|enclave\s*add[-\s]?on|volume\s*tier/i,
    answer: saasPaidEnclaveAnswer(),
  },
  {
    id: "packaging-multi-enterprise",
    topic: "Command Multi / Enterprise",
    match:
      /command\s*multi|command\s*enterprise|55,?000|95,?000|up\s*to\s*(10|25)\s*(entities|tenants|enclaves)|enterprise\s*(sku|tier|package)/i,
    answer: saasCommandMultiEnterpriseAnswer(),
  },
  {
    id: "packaging-partner-book",
    topic: "Partner / MSSP book",
    match:
      /partner\s*(silver|gold|platinum|book|msa)|mssp\s*(pricing|tier|book)|managed\s*partner|50,?000.*(enclave|partner)|100,?000.*(enclave|partner)|200,?000.*(enclave|partner)/i,
    answer: saasPartnerBookAnswer(),
  },
  {
    id: "convert-credit-year1",
    topic: "Convert credit / year-1 Command",
    match:
      /convert\s*credit|year[-\s]?1|year\s*one|credit(ed)?\s*(toward|to|against)|paying\s*twice|30,?001|after\s*convert/i,
    answer: (
      `If they convert within the ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day window, the ${formatPathBUsd()} ` +
      `${CUSTOMER_FACING_PATH_B_SKU} fee is a fixed convert credit to year-1 Command at planned GA list ` +
      `(${formatPlannedGaCommandUsd()}/yr) — year-1 net ≈ ${formatYear1CommandBalanceUsd()}. ` +
      `Not a negotiated %. Exit = fee non-refundable, no credit.`
    ),
  },
  {
    id: "window-eng-syncs",
    topic: "Window / eng syncs",
    match:
      /how\s*long\s*(is\s*)?(the\s*)?(window|pilot|engagement)|90[-\s]?day|60[-\s]?day|eng(ineering)?\s*sync|weekly\s*sync|capped\s*sync/i,
    answer: (
      `${CUSTOMER_FACING_PATH_B_SKU} default window is ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS} days ` +
      `(floor ${DESIGN_PARTNER_MIN_WINDOW_DAYS} if scoped in writing). Buyer-facing: say ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day — don’t lead with a 60–90 band. ` +
      `Weekly eng syncs are capped (first 4–6 weeks), then async unless amended. Convert-or-exit on ${DESIGN_PARTNER_SUCCESS_CRITERIA_COUNT} written criteria.`
    ),
  },
  {
    id: "fair-use-worm-ingest",
    topic: "Fair-use WORM / ingest",
    match:
      /worm|evidence\s*storage|storage\s*(limit|quota|included)|ingest(ion)?|telemetry\s*(limit|volume|events)|fair[-\s]?use|gb\s*per\s*enclave/i,
    answer: saasFairUseWormIngestAnswer(),
  },
  {
    id: "modules-capabilities",
    topic: "Modules / capabilities",
    match:
      /governance\+|sustainability|ironbloom|vault\s*(module|sku|shield)|what\s*modules|packaging\s*modules|capability\s*track/i,
    answer: (
      `Capability modules (separate from entity count): Command (dashboard, active risks, pipeline, basic exports, isolation); ` +
      `Governance+ (mapping, maturity, Ironquery export); Sustainability / Ironbloom (physical units — kWh, L, km); ` +
      `Vault (dual-gate / PKI clearance UI); MSSP Platform sold via Partner book. ` +
      `Planned GA Growth / Sustainability track ~${formatUsdWhole(PLANNED_GA_GROWTH_USD)}/yr is a capability track, not an entity-count SKU.`
    ),
  },
  {
    id: "no-seat-pricing",
    topic: "Seats / users pricing",
    match:
      /per[-\s]?seat|seat\s*license|how\s*many\s*users|user\s*license|per[-\s]?month|monthly\s*(price|fee)|named\s*user/i,
    answer: (
      `No per-seat / per-month licensing. ${CUSTOMER_FACING_PATH_B_SKU} is a flat ${formatPathBUsd()} platform on-ramp; ` +
      `planned GA Command is annual list by entity/enclave packaging, not named-user seats.`
    ),
  },
  {
    id: "what-is-command",
    topic: "What is Command / Command Center",
    match:
      /what\s+is\s+(ironframe\s+)?command|command\s+center|command\s+tier|what\s+does\s+(the\s+)?(product|platform|saas)\s+do|what\s+is\s+ironframe/i,
    answer: (
      `${PRODUCT_NAME} is the control-first GRC operating plane: multi-tenant isolation, integer-cent loss exposure, ` +
      `sanitize-before-persist ingest, and HITL perimeter workers — not heatmap theater. ` +
      `Entry today is ${CUSTOMER_FACING_PATH_B_SKU} at ${formatPathBUsd()} for ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS} days. ` +
      `Differentiators: ${PRODUCT_DIFFERENTIATORS.slice(0, 3).join("; ")}.`
    ),
  },
  {
    id: "who-for-beachhead",
    topic: "Who it’s for / beachheads",
    match:
      /who\s*(is\s*)?(this|it)\s*for|ideal\s*customer|icp|beachhead|holding\s*co|fintech|healthcare|utility|nerc|hipaa|bhc/i,
    answer: (
      `${PRODUCT_NAME} beachheads: multi-entity / regional BHC, utility / NERC, MSSP enclaves, healthcare / HIPAA — ` +
      `operators who need hard isolation and whole-cent board exposure, not checklist-only GRC. ` +
      `Cohort is a small paid co-builder set (${DESIGN_PARTNER_COHORT_SEATS} seats), not unlimited free logos.`
    ),
  },
  {
    id: "hitl-no-auto-send",
    topic: "HITL / auto-send",
    match:
      /auto[-\s]?send|human[-\s]?in[-\s]?the[-\s]?loop|hitl|does\s+(ai|it|the\s+agent)\s+(send|email|dispatch)|agents?\s+send/i,
    answer:
      "Perimeter drafts never auto-send. HITL DISPATCH only — a human approves outbound. Agents draft and observe; they do not own the send button.",
  },
  {
    id: "provisioning",
    topic: "Provisioning / go-live timing",
    match:
      /how\s*(long|fast).*(provision|stand\s*up|go[-\s]?live|onboard)|provision(ing)?\s*(time|speed|sla)|when\s*(do\s*we|can\s*we)\s*(get|have)\s*(access|a\s*tenant)/i,
    answer: `After a yes: order form with ${DESIGN_PARTNER_SUCCESS_CRITERIA_COUNT} written criteria and client-owned operator email → provision (SoD — seller does not self-provision) → Path B activation link to that tenant. Timing is ops-gated after payment and form lock, not “instant sandbox after this call.”`,
  },
  {
    id: "next-step-gate",
    topic: "Next step / order form / Path B link",
    match:
      /next\s*step|order\s*form|activation\s*link|path\s*b\s*link|after\s*(a\s*)?yes|how\s*do\s*we\s*(buy|sign|start)|\/pricing/i,
    answer: (
      `Gate after yes: order form with ${DESIGN_PARTNER_SUCCESS_CRITERIA_COUNT} success criteria → provision with ` +
      `client-owned operator email → tenant-scoped Path B activation link. Never send a PENDING partner to generic /pricing. ` +
      `CTA on this call remains a ${WORKFLOW_REVIEW_CTA_MINUTES} minute workflow review — not a demo circus.`
    ),
  },
  {
    id: "isolation-deep",
    topic: "Isolation / RLS / enclaves",
    match:
      /how\s*(does|is)\s*(isolation|rls|multi[-\s]?tenant|enclave)|cross[-\s]?tenant|data\s*bleed|client\s*wall|separate\s*(clients?|entities)/i,
    answer:
      "Containment is at the database / tenant boundary: PostgreSQL RLS plus Ironguard. MSSP-style client enclaves are hard walls per client — not shared folders. Irongate sanitizes external intel before persist so junk doesn’t land inside the wall.",
  },
  {
    id: "ale-reporting",
    topic: "ALE / board numbers",
    match:
      /board\s*(pack|report|number)|heatmap|qualitative\s*risk|5\s*[x×]\s*5|loss\s*exposure|annualized\s*loss/i,
    answer:
      "Board-facing math is whole-cent estimated loss exposure (BigInt) — heatmaps can stay as context, but they are not the decision layer. Prefer exposure ranges with visible assumptions over a single ‘true ALE.’ Narrative agents don’t invent dollars. SEC materiality includes quantitative and qualitative factors — quantification helps defensibility; it does not require FAIR.",
  },
  {
    id: "docs-training",
    topic: "Docs / partner training",
    match:
      /where\s*(are|is)\s*(the\s*)?(docs|documentation|manual|training)|operator\s*packet|how\s*(do\s*)?(we|operators)\s*learn|get[-\s]?started/i,
    answer: `Partner learning lives in-app: Docs Hub ${DOCS_HUB_HREF}, Operator Packet ${PARTNER_OPERATOR_PACKET_HREF}, LEVEL1 training ${PARTNER_TRAINING_INDEX_HREF}, checklist ${PARTNER_GET_STARTED_HREF}. Approvals / Ops Hub is the HITL send queue — not a second docs store.`,
  },
  {
    id: "integrations",
    topic: "Integrations / connectors",
    match:
      /integrat(e|ion)|connector|api\s*(access|key)|webhook|sso|okta|azure\s*ad|saml/i,
    answer:
      "Don’t invent a connector matrix on this call. Map the evidence / board-report workflow pain first; integrations and IdP details land in written Design Partner criteria and diligence after the seat — not as a demo shopping list.",
  },
  {
    id: "data-hosting",
    topic: "Hosting / residency",
    match:
      /where\s*(is\s*)?(data|it)\s*host|data\s*residenc|aws|azure|gcp|which\s*cloud|on[-\s]?prem/i,
    answer:
      "Don’t invent region or on-prem claims mid-call. Isolation and control-first architecture are the diligence hook; hosting / residency details are scoped in writing under the Design Partner seat if that’s a hard requirement.",
  },
  {
    id: "support-model",
    topic: "Support / who helps",
    match:
      /support\s*(model|sla|ticket)|who\s*(do\s*we\s*)?(call|email|escalate)|customer\s*success|cs\s*manager/i,
    answer: `${CUSTOMER_FACING_PATH_B_SKU} is a co-builder seat with written success criteria — not a black-box ticket farm. Human hosts the workflow review; after provision, partner learning surfaces and HITL ops paths are the operating model. Don’t invent a public SLA logo.`,
  },
  {
    id: "ai-agents-scope",
    topic: "AI agents scope",
    match:
      /ai\s*agent|llm|chatbot|copilot|does\s*(ai|it)\s*(replace|automate)\s*(auditor|grc|compliance)/i,
    answer:
      "Agents are observable helpers inside the control plane — drafts and assist, not unsupervised compliance replacement. Humans stay on DISPATCH and on Design Partner criteria. No free AI pilot instead of the paid seat.",
  },
  {
    id: "mssp-beachhead",
    topic: "MSSP / multi-entity",
    match:
      /mssp|v\s*ciso|vciso|multi[-\s]?entity|managed\s*service|client\s*portfolio/i,
    answer:
      "MSSP / vCISO beachhead: hard per-client enclaves so portfolio work doesn’t bleed. Same commercial gate — Command Design Partner with written criteria — not a free multi-tenant sandbox. True portfolio scale uses the Partner book, not unlimited Core.",
  },
  {
    id: "export-exit",
    topic: "Export / exit",
    match:
      /export\s*(data|evidence)|data\s*portability|if\s*we\s*(leave|exit|cancel)|lock[-\s]?in/i,
    answer: `${CUSTOMER_FACING_PATH_B_SKU} ${formatPathBUsd()} is non-refundable on exit. Convert in-window and the fee credits year-1 Command; exit and the fee stays paid. Don’t invent a full dump format mid-call — portability and exit mechanics are diligence under the seat, not a verbal SOW.`,
  },
] as const;

export type SaasCallKbHit = {
  id: string;
  topic: string;
  answer: string;
};

/** Topic labels for miss / empty-state guidance (operator-facing). */
export function listSaasCallKnowledgeTopics(): string[] {
  return SAAS_CALL_KNOWLEDGE_BASE.map((row) => row.topic);
}

/** First matching curated SaaS answer, or null. */
export function lookupSaasCallKnowledge(questionRaw: string): SaasCallKbHit | null {
  const question = questionRaw.trim();
  if (!question) return null;
  for (const row of SAAS_CALL_KNOWLEDGE_BASE) {
    if (row.match.test(question)) {
      return { id: row.id, topic: row.topic, answer: row.answer };
    }
  }
  return null;
}
