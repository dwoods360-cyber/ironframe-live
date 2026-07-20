import { describe, expect, it } from "vitest";

import { buildSuccessTeamMandate } from "@/lib/ironframeProductKnowledge/boardBinding";
import {
  PARTNER_GET_STARTED_HREF,
  PARTNER_OPERATOR_PACKET_HREF,
  PARTNER_TRAINING_INDEX_HREF,
} from "@/lib/ironframeProductKnowledge/productFacts";

/**
 * Ops worker chat injects buildSuccessTeamMandate() into the success-team specialty.
 * Assert the mandate answers "where is training?" correctly without inventing Approvals as a doc store.
 */
describe("success-team operator chat knowledge", () => {
  it("grounds Success in partner learning hrefs and HITL-only Approvals", () => {
    const mandate = buildSuccessTeamMandate();
    expect(mandate).toContain(PARTNER_OPERATOR_PACKET_HREF);
    expect(mandate).toContain(PARTNER_TRAINING_INDEX_HREF);
    expect(mandate).toContain(PARTNER_GET_STARTED_HREF);
    expect(mandate).toContain("HITL send queue only");
    expect(mandate).toContain("not where training documents live");
    expect(mandate).toContain("order form");
    expect(mandate).toContain("ANTI-HALLUCINATION MANDATE");
    expect(mandate).toContain("NEVER invent product surfaces");
  });
});
