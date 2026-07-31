import { describe, expect, it } from "vitest";

import {
  lookupSaasCallKnowledge,
  saasCapacityClientsTenantsAnswer,
} from "@/lib/ironframeProductKnowledge/saasCallKnowledgeBase";
import { assistWorkflowReviewQuestion } from "@/app/lib/server/workflowReviewCallAssistCore";

describe("saasCallKnowledgeBase capacity", () => {
  it("answers upload / more-than-N tenant asks from dual-motion packaging", () => {
    const hit = lookupSaasCallKnowledge("Can we upload more than 3 tenants?");
    expect(hit?.id).toBe("capacity-clients-tenants");
    expect(hit?.answer).toContain("1 Primary Entity");
    expect(hit?.answer).toContain("2 Subtenant");
    expect(hit?.answer).toContain("3 Subtenants");
    expect(hit?.answer).toContain("$3,500");
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
});
