import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

import { resolveGeminiFlashModel } from "@/app/config/geminiModels";
import type { CallAssistAnswer } from "@/app/lib/server/workflowReviewCallAssistCore";
import {
  COMMAND_CORE_INCLUDED_SUBTENANT_ENCLAVES,
  COMMAND_CORE_TOTAL_ENTITIES,
  COMMAND_ENTERPRISE_MAX_ENTITIES,
  COMMAND_ENTERPRISE_USD,
  COMMAND_MULTI_MAX_ENTITIES,
  COMMAND_MULTI_SUBTENANTS,
  COMMAND_MULTI_USD,
  PAID_ENCLAVES_TO_FILL_MULTI,
  CUSTOMER_FACING_PATH_B_SKU,
  DESIGN_PARTNER_COHORT_SEATS,
  DESIGN_PARTNER_DEFAULT_WINDOW_DAYS,
  DESIGN_PARTNER_MIN_WINDOW_DAYS,
  DESIGN_PARTNER_PATH_B_USD,
  DESIGN_PARTNER_SUCCESS_CRITERIA_COUNT,
  DESIGN_PARTNER_YEAR1_COMMAND_BALANCE_USD,
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
  WORKFLOW_REVIEW_CTA_MINUTES,
  formatPathBUsd,
  formatPlannedGaCommandUsd,
  formatUsdWhole,
  formatYear1CommandBalanceUsd,
  pathBEntityScopeLockText,
} from "@/lib/ironframeProductKnowledge/commercial";
import {
  FORBIDDEN_PRODUCT_CLAIMS,
  PRODUCT_DIFFERENTIATORS,
  PRODUCT_NAME,
  PRODUCT_POSITIONING,
} from "@/lib/ironframeProductKnowledge/productFacts";
import {
  SAAS_CALL_KNOWLEDGE_BASE,
  collectSaasCallKnowledgeHits,
  saasCapacityClientsTenantsAnswer,
  saasCommandCorePackagingAnswer,
  saasCommandMultiEligibilityAnswer,
  saasCommandMultiEnterpriseAnswer,
  saasCorePaidToMultiStackAnswer,
  saasEntityRangePricingAnswer,
  saasEntityStackingCostAnswer,
  saasFairUseWormIngestAnswer,
  saasPaidEnclaveAnswer,
  saasPartnerBookAnswer,
  saasPocketTopicCatalog,
  type SaasCallKbHit,
} from "@/lib/ironframeProductKnowledge/saasCallKnowledgeBase";

const groundedAssistSchema = z.object({
  grounded: z
    .boolean()
    .describe("True only if every number and claim in answer is supported by LOCKED FACTS."),
  determination: z
    .enum(["yes", "no", "partial", "n/a", "unknown"])
    .describe(
      "Direct call on the prospect’s ask: yes/no when they proposed a fact; partial if nuanced; n/a if not a yes/no; unknown if facts insufficient.",
    ),
  answer: z
    .string()
    .min(12)
    .max(700)
    .describe(
      "Spoken operator pocket answer tailored to THIS question — determination first, then the supporting locked math. No markdown.",
    ),
  missingFact: z
    .string()
    .max(240)
    .nullable()
    .describe("If grounded=false, what fact was missing. Null when grounded."),
});

function resolveApiKey(): string | null {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  return key?.trim() || null;
}

/** Authoritative pocket grounding pack — commercial spine + curated SaaS facts. */
export function buildPocketGroundingPack(): string {
  const curated = SAAS_CALL_KNOWLEDGE_BASE.map(
    (row) => `### ${row.topic} (${row.id})\n${row.answer}`,
  ).join("\n\n");

  return `
LOCKED FACTS — Ironframe LIVE Pocket (authoritative). Do not invent beyond this pack.

## Product
${PRODUCT_NAME}
${PRODUCT_POSITIONING}
Differentiators: ${PRODUCT_DIFFERENTIATORS.join("; ")}

## Design Partner / Path B
- Customer-facing SKU: ${CUSTOMER_FACING_PATH_B_SKU}
- Price: ${formatPathBUsd()} flat (non-refundable on exit)
- Window: ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day default (floor ${DESIGN_PARTNER_MIN_WINDOW_DAYS} if scoped in writing)
- Success criteria: ${DESIGN_PARTNER_SUCCESS_CRITERIA_COUNT} written
- Entity hard cap: ${PATH_B_PRIMARY_ENTITIES} Primary + ${PATH_B_INCLUDED_SUBTENANT_ENCLAVES} Subtenant Enclaves
- Cohort seats (company program size, NOT client ceiling): ${DESIGN_PARTNER_COHORT_SEATS}
- CTA: ${WORKFLOW_REVIEW_CTA_MINUTES} minute workflow review — not free pilot / not Request Demo
- Convert credit: in-window convert credits ${formatPathBUsd()} to year-1 Command at planned GA list ${formatPlannedGaCommandUsd()}/yr → year-1 net ≈ ${formatYear1CommandBalanceUsd()} (fixed credit, not negotiated %)
- Entity scope lock: ${pathBEntityScopeLockText()}

## Planned GA packaging (always say "planned GA")
- Command Core: ${formatUsdWhole(PLANNED_GA_COMMAND_USD)}/yr — ${PATH_B_PRIMARY_ENTITIES} Primary + ${COMMAND_CORE_INCLUDED_SUBTENANT_ENCLAVES} Subtenants (${COMMAND_CORE_TOTAL_ENTITIES} total)
- Four entities = Core list alone — NOT Core + Paid Enclave
- Paid Enclave: ${formatUsdWhole(PAID_ENCLAVE_LIST_USD)}/yr list beyond Core's three included Subtenants; volume ${formatUsdWhole(PAID_ENCLAVE_VOLUME_11_50_USD)} (11–50), floor ${formatUsdWhole(PAID_ENCLAVE_FLOOR_USD)} (51+)
- To fill Multi (${COMMAND_MULTI_MAX_ENTITIES} entities / ${COMMAND_MULTI_SUBTENANTS} Subtenants): ${PAID_ENCLAVES_TO_FILL_MULTI} Paid Enclaves after Core's three — or quote Multi flat
- Command Multi: ${formatUsdWhole(COMMAND_MULTI_USD)}/yr up to ${COMMAND_MULTI_MAX_ENTITIES} entities
- Command Enterprise: ${formatUsdWhole(COMMAND_ENTERPRISE_USD)}/yr up to ${COMMAND_ENTERPRISE_MAX_ENTITIES} entities
- Growth / Sustainability track: ~${formatUsdWhole(PLANNED_GA_GROWTH_USD)}/yr (capability track, not entity count)
- Partner book (MSSP MSA; unaffiliated end-clients): Silver ${formatUsdWhole(PARTNER_SILVER_USD)}/${PARTNER_SILVER_ENCLAVES}; Gold ${formatUsdWhole(PARTNER_GOLD_USD)}/${PARTNER_GOLD_ENCLAVES}; Platinum ${formatUsdWhole(PARTNER_PLATINUM_USD)}/${PARTNER_PLATINUM_ENCLAVES}

## Canonical packaging determinations (use as source math — do not paste whole cards)
${saasEntityStackingCostAnswer()}

${saasCorePaidToMultiStackAnswer()}

${saasCommandMultiEligibilityAnswer()}

${saasEntityRangePricingAnswer()}

${saasCapacityClientsTenantsAnswer()}

${saasCommandCorePackagingAnswer()}

${saasPaidEnclaveAnswer()}

${saasCommandMultiEnterpriseAnswer()}

${saasPartnerBookAnswer()}

${saasFairUseWormIngestAnswer()}

## Curated SaaS pocket cards
${curated}

## Forbidden (never claim)
${FORBIDDEN_PRODUCT_CLAIMS.map((c) => `- ${c}`).join("\n")}

## Topic catalog (for miss guidance)
${saasPocketTopicCatalog()}
`.trim();
}

function formatPriorityCards(cards: SaasCallKbHit[]): string {
  if (cards.length === 0) {
    return "(none matched by keyword — reason only from LOCKED FACTS above)";
  }
  return cards
    .map((c, i) => `${i + 1}. [${c.id}] ${c.topic}\n${c.answer}`)
    .join("\n\n");
}

export function pocketRefuseAnswer(question: string): CallAssistAnswer {
  return {
    question,
    answer: (
      `I don’t have a locked fact for that — don’t invent numbers or features. ` +
      `Capture it as written diligence / order-form criteria, or re-ask using: ${saasPocketTopicCatalog()}. ` +
      `Stay on peer-to-peer workflow review; CTA remains a ${WORKFLOW_REVIEW_CTA_MINUTES} minute diligence slot for ${CUSTOMER_FACING_PATH_B_SKU} at ${formatPathBUsd()}.`
    ),
    banNote:
      "Grounded miss — refused rather than hallucinate. Add recurring facts to saasCallKnowledgeBase.ts / commercial.ts.",
  };
}

/** Dollar amounts allowed in grounded LLM pocket answers (commercial.ts only). */
const POCKET_ALLOWED_USD = new Set<number>([
  DESIGN_PARTNER_PATH_B_USD,
  DESIGN_PARTNER_YEAR1_COMMAND_BALANCE_USD,
  PLANNED_GA_COMMAND_USD,
  PLANNED_GA_GROWTH_USD,
  PAID_ENCLAVE_LIST_USD,
  PAID_ENCLAVE_VOLUME_11_50_USD,
  PAID_ENCLAVE_FLOOR_USD,
  COMMAND_MULTI_USD,
  COMMAND_ENTERPRISE_USD,
  PARTNER_SILVER_USD,
  PARTNER_GOLD_USD,
  PARTNER_PLATINUM_USD,
  PARTNER_SILVER_OVERAGE_USD,
  PARTNER_GOLD_OVERAGE_USD,
  PARTNER_PLATINUM_OVERAGE_USD,
]);

/**
 * Reject LLM text that invents dollar amounts outside commercial.ts.
 * Returns null when clean; otherwise a refuse answer.
 */
function parseUsdToken(raw: string): number | null {
  const m = raw.match(/^\$([\d,]+(?:\.\d+)?)([kKmM])?$/);
  if (!m) return null;
  const base = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(base)) return null;
  const suffix = (m[2] || "").toLowerCase();
  if (suffix === "k") return Math.round(base * 1_000);
  if (suffix === "m") return Math.round(base * 1_000_000);
  return base;
}

export function refuseIfInventedUsdAmounts(
  question: string,
  answer: string,
): CallAssistAnswer | null {
  const amounts = [...answer.matchAll(/\$[\d,]+(?:\.\d+)?[kKmM]?\b/g)]
    .map((m) => parseUsdToken(m[0]))
    .filter((n): n is number => n != null);
  const invented = amounts.filter((n) => n >= 100 && !POCKET_ALLOWED_USD.has(n));
  if (invented.length === 0) return null;
  return {
    question,
    answer: (
      `I won’t invent pricing — that answer contained unlocked dollar amounts ` +
      `(${invented.map((n) => formatUsdWhole(n)).join(", ")}). ` +
      `Re-ask with Command Core / Paid Enclave / Multi / Enterprise wording, or use a locked pocket topic.`
    ),
    banNote:
      "Anti-hallucination: grounded LLM cited USD not in commercial.ts — refused.",
  };
}

export type GroundedPocketAssistOptions = {
  /** Extra locked cards / pocket-lock text to highlight for this ask. */
  priorityCards?: SaasCallKbHit[];
  priorityNotes?: string[];
};

/**
 * Grounded Gemini pocket answer: uses LOCKED FACTS to make a determination on THIS question.
 * Returns null if API unavailable or model call fails.
 */
export async function groundedPocketAssistFromLlm(
  questionRaw: string,
  options: GroundedPocketAssistOptions = {},
): Promise<CallAssistAnswer | null> {
  const question = questionRaw.trim().slice(0, 1_000);
  if (!question) return null;

  const apiKey = resolveApiKey();
  if (!apiKey) return null;

  const priorityCards =
    options.priorityCards ?? collectSaasCallKnowledgeHits(question);
  const priorityNotes = options.priorityNotes ?? [];

  const google = createGoogleGenerativeAI({ apiKey });
  const modelId = resolveGeminiFlashModel(
    process.env.GEMINI_POCKET_ASSIST_MODEL,
    process.env.GEMINI_FLASH_MODEL,
  );

  try {
    const { object } = await generateObject({
      model: google(modelId),
      schema: groundedAssistSchema,
      temperature: 0,
      system: [
        "You are the Ironframe LIVE Pocket Q&A sidecar for a human-hosted workflow-review call.",
        "Your job is to MAKE A DETERMINATION on the prospect’s exact question using only LOCKED FACTS.",
        "Do NOT dump a generic knowledge card. Answer this ask: if they propose a price/math, say Yes or No first, then the correct locked packaging in 2–4 short spoken sentences.",
        "Synthesize from facts the way a sharp operator would — tailor numbers and books to the range or claim they stated.",
        "If the facts do not clearly support a complete answer, set grounded=false and determination=unknown.",
        "Never invent prices, entity caps, certifications, customers, connectors, SLAs, or regions.",
        "Never cite medshield, vaultbank, or gridcore as customers.",
        "Always label Command Core / Multi / Enterprise / Paid Enclave as planned GA when quoting those lists.",
        "Correct wrong customer math when LOCKED FACTS contradict it.",
      ].join(" "),
      prompt: [
        buildPocketGroundingPack(),
        "",
        "PRIORITY LOCKED CARDS (keyword matches — use as source math, do not paste verbatim unless they already answer this ask):",
        formatPriorityCards(priorityCards),
        "",
        priorityNotes.length
          ? `ADDITIONAL LOCKED NOTES:\n${priorityNotes.map((n) => `- ${n}`).join("\n")}\n`
          : "",
        "CUSTOMER / PROSPECT QUESTION:",
        question,
        "",
        "Make a determination for THIS question. Lead the spoken answer with Yes / No / Not exactly when the ask is a claim.",
        "Set grounded=true only if every number is supported by LOCKED FACTS. Otherwise grounded=false.",
      ]
        .filter(Boolean)
        .join("\n"),
    });

    if (!object.grounded || object.determination === "unknown") {
      return {
        question,
        answer: (
          `I don’t have a locked fact for that${object.missingFact ? ` (${object.missingFact})` : ""} — ` +
          `don’t invent. Capture as diligence / order-form criteria, or re-ask: ${saasPocketTopicCatalog()}.`
        ),
        banNote:
          "Grounded LLM refused — missing fact in pack. Human hosts; do not improvise numbers.",
      };
    }

    const answer = object.answer.trim();
    if (!answer) return pocketRefuseAnswer(question);

    const usdRefuse = refuseIfInventedUsdAmounts(question, answer);
    if (usdRefuse) return usdRefuse;

    if (/\b(medshield|vaultbank|gridcore)\b/i.test(answer)) {
      return {
        question,
        answer: pocketRefuseAnswer(question).answer,
        banNote:
          "Anti-hallucination: grounded LLM cited demo-tenant names — refused.",
      };
    }

    const determinationLabel =
      object.determination === "n/a"
        ? "determination n/a"
        : `determination=${object.determination}`;

    return {
      question,
      answer,
      banNote:
        `Grounded LLM ${determinationLabel} from commercial/SaaS pack — verify aloud; never expand beyond locked facts. Human hosts; agent is sidecar only.`,
    };
  } catch {
    return null;
  }
}
