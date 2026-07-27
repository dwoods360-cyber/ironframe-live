/**
 * Curated SaaS facts for LIVE Pocket Q&A (workflow-review sidecar).
 * Spoken, short answers only — no invented certs, customers, soft “max clients,” or free pilots.
 * Edit here when product Qs keep arising on calls; unit tests assert lookup behavior.
 */

import {
  CUSTOMER_FACING_PATH_B_SKU,
  DESIGN_PARTNER_COHORT_SEATS,
  DESIGN_PARTNER_DEFAULT_WINDOW_DAYS,
  DESIGN_PARTNER_SUCCESS_CRITERIA_COUNT,
  formatPathBUsd,
} from "./commercial";
import {
  DOCS_HUB_HREF,
  PARTNER_GET_STARTED_HREF,
  PARTNER_OPERATOR_PACKET_HREF,
  PARTNER_TRAINING_INDEX_HREF,
  PRODUCT_NAME,
} from "./productFacts";

export type SaasCallKbEntry = {
  id: string;
  /** Operator-facing topic label (optional UI later). */
  topic: string;
  match: RegExp;
  answer: string;
};

/**
 * Order matters: first regex win. Keep commercial locks in workflowReviewCallAssistCore
 * POCKET_QA (price / free pilot / SOC2 / demo gate); this KB covers product shape.
 */
export const SAAS_CALL_KNOWLEDGE_BASE: readonly SaasCallKbEntry[] = [
  {
    id: "capacity-clients-tenants",
    topic: "Client / tenant capacity",
    match:
      /max(imum)?\s*(number\s*of\s*)?(clients?|tenants?|entities|enclaves)|(how\s*many|number\s*of)\s*(clients?|tenants?|entities)|(clients?|tenants?|entities)\s*(we\s*can\s*)?(load|run|onboard|add|support|host)|client\s*limit|tenant\s*limit|unlimited\s*clients|capacity|scale\s*(to|with)\s*(clients?|tenants?)/i,
    answer: `No soft marketing “max clients” ceiling. Isolation is hard per-client / per-entity walls (PostgreSQL RLS + Ironguard) — not shared spreadsheet folders. Design Partner cohort is intentionally small (${DESIGN_PARTNER_COHORT_SEATS} seats). Entity count and client enclaves for a live seat are written into your ${DESIGN_PARTNER_SUCCESS_CRITERIA_COUNT} success criteria on the order form — we don’t invent a free-for-all quota on this call.`,
  },
  {
    id: "what-is-command",
    topic: "What is Command / Command Center",
    match:
      /what\s+is\s+(ironframe\s+)?command|command\s+center|command\s+tier|what\s+does\s+(the\s+)?(product|platform|saas)\s+do|what\s+is\s+ironframe/i,
    answer: `${PRODUCT_NAME} Command is the control-first GRC operating plane: multi-tenant isolation, integer-cent loss exposure (BigInt ALE), Irongate sanitize-before-persist, and HITL perimeter workers. Entry today is ${CUSTOMER_FACING_PATH_B_SKU} at ${formatPathBUsd()} for ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS} days — co-builder seat, not a freemium sandbox.`,
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
      "Board-facing math is integer cents (BigInt) — not qualitative 5×5 heatmaps as the truth layer. Exposure tracks to dollar boundaries from live constraints; narrative agents don’t invent ALE.",
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
      "MSSP / vCISO beachhead: hard per-client enclaves so portfolio work doesn’t bleed. Same commercial gate — Command Design Partner with written criteria — not a free multi-tenant sandbox.",
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
