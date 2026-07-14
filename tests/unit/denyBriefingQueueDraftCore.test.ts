import { describe, expect, it } from "vitest";

import { denyBriefingQueueDraftCore } from "@/app/lib/server/denyBriefingQueueDraftCore";

describe("denyBriefingQueueDraftCore", () => {
  it("rejects invalid filenames without touching the database", async () => {
    const result = await denyBriefingQueueDraftCore({
      filename: "not-a-draft.md",
      operator: "test-operator",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Invalid filename/i);
    }
  });
});
