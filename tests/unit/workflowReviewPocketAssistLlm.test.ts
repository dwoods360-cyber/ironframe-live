import { describe, expect, it } from "vitest";

import {
  assistWorkflowReviewQuestion,
  assistWorkflowReviewQuestionAsync,
} from "@/app/lib/server/workflowReviewCallAssistCore";
import {
  buildPocketGroundingPack,
  pocketRefuseAnswer,
  refuseIfInventedUsdAmounts,
} from "@/app/lib/server/workflowReviewPocketAssistLlm";
import {
  DESIGN_PARTNER_PATH_B_USD,
  PAID_ENCLAVE_LIST_USD,
  PLANNED_GA_COMMAND_USD,
  formatUsdWhole,
} from "@/lib/ironframeProductKnowledge/commercial";
import {
  saasCorePaidToMultiStackAnswer,
  saasEntityStackingCostAnswer,
} from "@/lib/ironframeProductKnowledge/saasCallKnowledgeBase";

describe("buildPocketGroundingPack", () => {
  it("embeds dual-motion entity math and Path B locks", () => {
    const pack = buildPocketGroundingPack();
    expect(pack).toContain(formatUsdWhole(DESIGN_PARTNER_PATH_B_USD));
    expect(pack).toContain(formatUsdWhole(PLANNED_GA_COMMAND_USD));
    expect(pack).toContain(formatUsdWhole(PAID_ENCLAVE_LIST_USD));
    expect(pack).toContain("Command Design Partner");
    expect(pack).toContain(saasEntityStackingCostAnswer().slice(0, 40));
    expect(pack).toMatch(/Forbidden/i);
  });
});

describe("assistWorkflowReviewQuestion (deterministic offline fallback)", () => {
  it("still returns locked card text when sync path is used (API-down fallback)", () => {
    const stacking = assistWorkflowReviewQuestion(
      "Is Path B $4999 plus $3500 for a fourth tenant?",
    );
    expect(stacking.source).toBe("saas_kb");
    expect(stacking.answer).toBe(saasEntityStackingCostAnswer());
  });

  it("marks unknown phrasing as miss on sync path (LIVE async determines or refuses)", () => {
    const miss = assistWorkflowReviewQuestion(
      "What color is the login button on the mobile app?",
    );
    expect(miss.source).toBe("miss");
    expect(miss.answer.toLowerCase()).toMatch(/don.?t invent|no locked/);
  });
});

describe("pocketRefuseAnswer", () => {
  it("refuses without inventing features", () => {
    const refuse = pocketRefuseAnswer("Do you support quantum encryption?");
    expect(refuse.answer).toMatch(/don.?t invent/i);
    expect(refuse.answer.toLowerCase()).not.toContain("quantum");
    expect(refuse.banNote).toMatch(/refused|Grounded miss/i);
  });
});

describe("refuseIfInventedUsdAmounts", () => {
  it("allows locked commercial dollars and rejects invented ones", () => {
    expect(
      refuseIfInventedUsdAmounts("q", "Command Multi is $55,000/yr and Paid Enclave is $3,500."),
    ).toBeNull();
    expect(refuseIfInventedUsdAmounts("q", "Core is $35k planned GA.")).toBeNull();
    const bad = refuseIfInventedUsdAmounts("q", "We charge $12,345 per entity.");
    expect(bad?.banNote).toMatch(/Anti-hallucination/i);
    expect(bad?.answer).toContain("$12,345");
    const badK = refuseIfInventedUsdAmounts("q", "We charge $12k per seat.");
    expect(badK?.banNote).toMatch(/Anti-hallucination/i);
  });
});

describe("assistWorkflowReviewQuestionAsync anti-hallucination", () => {
  it("returns verbatim SaaS KB text for packaging asks (no LLM rewrite)", async () => {
    const q = "So, 3,500 for each of the next 6 subtenants?";
    const assist = await assistWorkflowReviewQuestionAsync(q);
    expect(assist.source).toBe("saas_kb");
    expect(assist.answer).toBe(saasCorePaidToMultiStackAnswer());
  });
});
