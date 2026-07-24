import { describe, expect, it } from "vitest";

import { normalizeLiveTranscriptChunk } from "@/app/lib/operations/liveTranscriptHygiene";
import {
  analyzeWorkflowReviewTranscript,
  assistWorkflowReviewQuestion,
  buildWorkflowReviewCallRecap,
  extractMeetingFacts,
} from "@/app/lib/server/workflowReviewCallAssistCore";
import { assembleRecapFromLlmDraft } from "@/app/lib/server/workflowReviewCallRecapLlm";

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
    expect(recap.pathBAsk.toLowerCase()).toContain("design partner");
    expect(recap.actionItems.some((a) => a.owner === "operator")).toBe(true);
    expect(recap.markdown).toContain("Workflow review recap");
    expect(recap.markdown).toContain("Action items");
  });

  it("normalizes common LIVE STT mishears", () => {
    const cleaned = normalizeLiveTranscriptChunk(
      "meet on July 20 Fifth to discuss the SMS provider tax bill We'll meet Probably about 9:30",
    );
    expect(cleaned).toContain("July 25th");
    expect(cleaned).toContain("Textbelt");
    expect(cleaned).not.toMatch(/tax bill/i);
    expect(cleaned).not.toMatch(/20 Fifth/i);
  });

  it("recaps ops/sync notes with schedule facts instead of Path B diagnosis", () => {
    const mangled = `
      Friday, July 24th. We had a meeting that morning. and decide that we would meet on July 20 Fifth,
      to discuss the problems we were having with the SMS provider tax bill We'll meet Probably about.
      9:30 that morning. This is a our priority.
    `;
    const facts = extractMeetingFacts(normalizeLiveTranscriptChunk(mangled));
    expect(facts.scheduledFollowUps.some((s) => /July 25th/i.test(s))).toBe(true);
    expect(facts.topics.some((t) => /Textbelt|SMS/i.test(t))).toBe(true);

    const recap = buildWorkflowReviewCallRecap({
      company: "Internal ops",
      channel: "teams",
      transcript: mangled,
    });
    expect(recap.summary.join(" ")).toMatch(/July 25th/i);
    expect(recap.summary.join(" ")).toMatch(/Textbelt|SMS/i);
    expect(recap.pathBAsk.toLowerCase()).toContain("no design partner ask");
    expect(
      recap.actionItems.some((a) => /July 25th|9:30|Textbelt|SMS/i.test(a.text)),
    ).toBe(true);
    expect(recap.actionItems.some((a) => /ill We'll meet/i.test(a.text))).toBe(false);
    expect(
      recap.actionItems.some((a) => /Keep diagnosing pain/i.test(a.text)),
    ).toBe(false);
  });

  it("assembles an LLM meeting summary draft without Path B boilerplate", () => {
    const transcript = `
      Friday, July 24th. We had a meeting that morning, and decided that we would meet on July 25th,
      to discuss the problems we were having with the SMS provider Textbelt. We'll meet probably about
      9:30 that morning. This is our priority.
    `;
    const recap = assembleRecapFromLlmDraft({
      company: "Internal ops",
      channel: "teams",
      transcript,
      draft: {
        meetingType: "ops_sync",
        summary: [
          "Morning sync on July 24th covered SMS provider failures.",
          "Agreed to reconvene July 25th around 9:30 to dig into Textbelt issues.",
          "Marked as a priority.",
        ],
        decisions: ["Meet July 25th ~9:30 about Textbelt SMS problems."],
        actionItems: [
          {
            owner: "shared",
            text: "Meet July 25th ~9:30 to discuss Textbelt SMS provider issues",
            priority: "now",
          },
          {
            owner: "operator",
            text: "Bring Textbelt status / credits context to the follow-up",
            priority: "now",
          },
        ],
        openQuestions: ["What is the current Textbelt credit balance?"],
        pathBAsk:
          "No Design Partner ask from this buffer — capture the scheduled Textbelt follow-up first.",
      },
    });
    expect(recap.summary.join(" ")).toMatch(/Textbelt|July 25/i);
    expect(recap.pathBAsk.toLowerCase()).toContain("no design partner ask");
    expect(recap.actionItems[0]?.text).toMatch(/July 25|Textbelt/i);
    expect(recap.markdown).toContain("Decision:");
  });
});
