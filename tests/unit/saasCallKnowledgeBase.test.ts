import { describe, expect, it } from "vitest";

import {
  COMMAND_CORE_INCLUDED_SUBTENANT_ENCLAVES,
  COMMAND_CORE_TOTAL_ENTITIES,
  COMMAND_MULTI_MAX_ENTITIES,
  COMMAND_MULTI_SUBTENANTS,
  COMMAND_MULTI_USD,
  PAID_ENCLAVE_LIST_USD,
  PAID_ENCLAVES_TO_FILL_MULTI,
  PLANNED_GA_COMMAND_USD,
} from "@/lib/ironframeProductKnowledge/commercial";
import {
  collectSaasCallKnowledgeHits,
  listSaasCallKnowledgeTopics,
  lookupSaasCallKnowledge,
  saasCapacityClientsTenantsAnswer,
  saasCommandMultiEligibilityAnswer,
  saasCorePaidToMultiStackAnswer,
  saasEntityRangePricingAnswer,
  saasEntityStackingCostAnswer,
  saasPaidEnclaveAnswer,
} from "@/lib/ironframeProductKnowledge/saasCallKnowledgeBase";
import { assistWorkflowReviewQuestion } from "@/app/lib/server/workflowReviewCallAssistCore";

describe("saasCallKnowledgeBase capacity", () => {
  it("pins Multi stack math to commercial.ts (no drifted counts)", () => {
    expect(COMMAND_CORE_TOTAL_ENTITIES).toBe(4);
    expect(COMMAND_CORE_INCLUDED_SUBTENANT_ENCLAVES).toBe(3);
    expect(COMMAND_MULTI_MAX_ENTITIES).toBe(10);
    expect(COMMAND_MULTI_SUBTENANTS).toBe(9);
    expect(PAID_ENCLAVES_TO_FILL_MULTI).toBe(6);
    expect(PAID_ENCLAVES_TO_FILL_MULTI).toBe(
      COMMAND_MULTI_SUBTENANTS - COMMAND_CORE_INCLUDED_SUBTENANT_ENCLAVES,
    );
    const stack = saasCorePaidToMultiStackAnswer();
    expect(stack).toContain(String(PAID_ENCLAVES_TO_FILL_MULTI));
    expect(stack).toContain(`$${PLANNED_GA_COMMAND_USD.toLocaleString("en-US")}`);
    expect(stack).toContain(`$${PAID_ENCLAVE_LIST_USD.toLocaleString("en-US")}`);
    expect(stack).toContain(`$${COMMAND_MULTI_USD.toLocaleString("en-US")}`);
  });

  it("answers Core → next 6 Paid → Multi counting clearly", () => {
    const questions = [
      "So after the 1st 3, the cost is $3,500 each?",
      "So $3,500 for each after the 1st 3 subtenants, up to 9 subtenants?",
      "So, 3,500 for each of the next 6 subtenants?",
      "How many paid enclaves to get to 10 entities?",
    ];
    for (const q of questions) {
      const hit = lookupSaasCallKnowledge(q);
      expect(hit?.id, q).toBe("core-paid-to-multi-stack");
      expect(hit?.answer, q).toBe(saasCorePaidToMultiStackAnswer());
      expect(hit?.answer, q).toMatch(/next 6 Subtenants/i);
      expect(hit?.answer, q).toContain("$3,500");
      expect(hit?.answer, q).toContain("$55,000");
      expect(assistWorkflowReviewQuestion(q).answer, q).toBe(saasCorePaidToMultiStackAnswer());
    }
  });

  it("answers when to quote Command Multi $55,000", () => {
    const q = "When am I eligible to pay $55,000 per year?";
    const hit = lookupSaasCallKnowledge(q);
    expect(hit?.id).toBe("packaging-multi-eligibility");
    expect(hit?.answer).toBe(saasCommandMultiEligibilityAnswer());
    expect(hit?.answer).toMatch(/up to 10 entities/i);
    expect(hit?.answer).toMatch(/not “pay \$55,000 the moment/i);
    expect(assistWorkflowReviewQuestion(q).answer).toBe(saasCommandMultiEligibilityAnswer());
  });

  it("gives a straight no to $3,500 each from 10–25 entities", () => {
    const q = "From 10 to 25 entities, the cost is $3,500 each?";
    const hit = lookupSaasCallKnowledge(q);
    expect(hit?.id).toBe("entity-range-pricing");
    expect(hit?.answer).toBe(saasEntityRangePricingAnswer());
    expect(hit?.answer).toMatch(/^No — not \$3,500/i);
    expect(hit?.answer).toContain("$55,000");
    expect(hit?.answer).toContain("$95,000");
    expect(hit?.answer).toMatch(/6 Paid/i);
    expect(hit?.answer).not.toMatch(/beyond 3 entities is a commercial expansion/i);
    expect(assistWorkflowReviewQuestion(q).answer).toBe(saasEntityRangePricingAnswer());
    const hits = collectSaasCallKnowledgeHits(q);
    expect(hits.map((h) => h.id)).toContain("entity-range-pricing");
    expect(hits[0]?.id).toBe("entity-range-pricing");
  });

  it("answers bare Paid Enclave asks without the 10–25 refute opener", () => {
    const hit = lookupSaasCallKnowledge("How much is a Paid Enclave?");
    expect(hit?.id).toBe("packaging-paid-enclave");
    expect(hit?.answer).toBe(saasPaidEnclaveAnswer());
    expect(hit?.answer).toMatch(/^Yes — \$3,500/i);
    expect(hit?.answer).toMatch(/6 Paid Enclaves/i);
  });

  it("rejects Path B + Paid Enclave stacking for four tenants", () => {
    const q =
      "So, if I upload 4 tenants, the cost is 4,999+3,500=8,400?";
    const hit = lookupSaasCallKnowledge(q);
    expect(hit?.id).toBe("entity-stacking-cost");
    expect(hit?.answer).toBe(saasEntityStackingCostAnswer());
    expect(hit?.answer).toMatch(/No — do not stack/i);
    expect(hit?.answer).toContain("$35,000");
    expect(hit?.answer).toMatch(/entity #5/i);
    expect(assistWorkflowReviewQuestion(q).answer).toBe(saasEntityStackingCostAnswer());
  });

  it("answers upload / more-than-N tenant asks from dual-motion packaging", () => {
    const hit = lookupSaasCallKnowledge("Can we upload more than 3 tenants?");
    expect(hit?.id).toBe("capacity-clients-tenants");
    expect(hit?.answer).toContain("1 Primary Entity");
    expect(hit?.answer).toContain("2 Subtenant");
    expect(hit?.answer).toContain("3 Subtenants");
    expect(hit?.answer).toContain("$3,500");
    expect(hit?.answer).toMatch(/not \$4,999 \+ \$3,500/);
    expect(hit?.answer).not.toContain("Stay in peer-to-peer diligence");
  });

  it("surfaces the same answer through LIVE Pocket assist", () => {
    const assist = assistWorkflowReviewQuestion("Can we upload more than 3 tenants?");
    expect(assist.answer).toBe(saasCapacityClientsTenantsAnswer());
    expect(assist.banNote).toMatch(/SaaS KB hit/i);
  });

  it("still answers classic how-many / limit phrasings", () => {
    expect(lookupSaasCallKnowledge("How many clients can we load?")?.id).toBe(
      "capacity-clients-tenants",
    );
    expect(lookupSaasCallKnowledge("What is the tenant limit?")?.id).toBe(
      "capacity-clients-tenants",
    );
  });

  it("covers dual-motion packaging and Partner book from commercial.ts", () => {
    expect(lookupSaasCallKnowledge("What is Command Core pricing?")?.answer).toContain(
      "$35,000",
    );
    expect(lookupSaasCallKnowledge("How much is a Paid Enclave?")?.answer).toContain(
      "$3,500",
    );
    expect(lookupSaasCallKnowledge("Tell me about Command Enterprise")?.answer).toContain(
      "$95,000",
    );
    expect(lookupSaasCallKnowledge("What is Partner Gold?")?.answer).toMatch(/Gold/);
    expect(lookupSaasCallKnowledge("Do you charge per seat?")?.answer).toMatch(
      /No per-seat/i,
    );
    expect(lookupSaasCallKnowledge("What is the convert credit?")?.answer).toContain(
      "$30,001",
    );
    expect(listSaasCallKnowledgeTopics().length).toBeGreaterThanOrEqual(18);
  });
});
