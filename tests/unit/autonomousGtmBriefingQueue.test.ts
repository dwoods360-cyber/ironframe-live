import { describe, expect, it } from "vitest";

import {
  AUTONOMOUS_GTM_TOPICS,
  buildAutonomousDraftFilenames,
  pickAutonomousGtmTopic,
  utcCalendarDateLabel,
} from "@/app/lib/server/autonomousGtmBriefingQueueCore";
import { denyBriefingQueueDraftCore } from "@/app/lib/server/denyBriefingQueueDraftCore";

describe("autonomous GTM briefing queue helpers", () => {
  it("rotates topics deterministically by UTC day", () => {
    const a = pickAutonomousGtmTopic(new Date(Date.UTC(2026, 6, 14)));
    const b = pickAutonomousGtmTopic(new Date(Date.UTC(2026, 6, 15)));
    expect(AUTONOMOUS_GTM_TOPICS.some((topic) => topic.id === a.id)).toBe(true);
    expect(a.id).not.toBe(b.id);
  });

  it("builds quarantine filenames for briefing and newsletter", () => {
    const topic = AUTONOMOUS_GTM_TOPICS[0]!;
    const files = buildAutonomousDraftFilenames("2026-07-14", topic);
    expect(files.briefing).toBe("2026-07-14-draft-auto-briefing-heatmap-vs-dollars.md");
    expect(files.newsletter).toBe("2026-07-14-draft-auto-newsletter-heatmap-vs-dollars.md");
    expect(utcCalendarDateLabel(new Date(Date.UTC(2026, 6, 14)))).toBe("2026-07-14");
  });
});

describe("denyBriefingQueueDraftCore", () => {
  it("rejects invalid filenames without DB writes", async () => {
    const result = await denyBriefingQueueDraftCore({
      filename: "../secret.md",
      operator: "test-operator",
    });
    expect(result.ok).toBe(false);
  });
});
