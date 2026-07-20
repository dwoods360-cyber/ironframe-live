import { describe, expect, it } from "vitest";

import {
  analyzeWorkflowReviewTranscript,
  assistWorkflowReviewQuestion,
  buildWorkflowReviewCallRecap,
} from "@/app/lib/server/workflowReviewCallAssistCore";

describe("workflowReviewCallAssistCore", () => {
  it("returns pocket answer for SOC 2 and free-trial questions", () => {
    const soc = assistWorkflowReviewQuestion("Are you SOC 2 certified?");
    expect(soc.answer.toLowerCase()).toContain("soc2-aligned");
    expect(soc.answer.toLowerCase()).toContain("type ii");

    const trial = assistWorkflowReviewQuestion("Can we do a free PoC first?");
    expect(trial.answer).toContain("$4,999");
    expect(trial.answer.toLowerCase()).toMatch(/no free/);
  });

  it("detects buying signs and close readiness from a strong transcript", () => {
    const analysis = analyzeWorkflowReviewTranscript(`
      Prospect: We're drowning in spreadsheet evidence before the board pack and multi-entity bleed.
      You: Here's how containment works at the tenant boundary.
      Prospect: What does Path B cost — is it $4,999? I can sign if we write success criteria.
      Prospect: Send me the order form as the next step.
    `);
    const ids = analysis.buyingSignals.map((s) => s.id);
    expect(ids).toContain("NAMES_PAIN");
    expect(ids).toContain("ASKS_PRICE");
    expect(ids).toContain("NEXT_STEP_ORDER");
    expect(analysis.closeReadiness.band).toBe("high");
    expect(analysis.closeReadiness.nextMove.toLowerCase()).toContain("order form");
  });

  it("builds an end-call recap with Path B ask and action items", () => {
    const recap = buildWorkflowReviewCallRecap({
      company: "Western Alliance",
      contactName: "Stephen McMaster",
      channel: "teams",
      transcript: `
        Prospect: Spreadsheet evidence before the board pack is killing us.
        Prospect: What does Path B cost — $4,999? I'll send intro to our CFO.
        Prospect: Send me the order form as the next step.
      `,
    });
    expect(recap.company).toBe("Western Alliance");
    expect(recap.closeReadiness.band).toBe("high");
    expect(recap.pathBAsk.toLowerCase()).toContain("path b");
    expect(recap.actionItems.some((a) => a.owner === "operator")).toBe(true);
    expect(recap.markdown).toContain("Workflow review recap");
    expect(recap.markdown).toContain("Action items");
  });
});
