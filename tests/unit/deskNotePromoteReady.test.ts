import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { validateBriefingQueueDraft } from "@/app/lib/governanceFrame/briefingDraftValidation";
import { parseBriefingCitations } from "@/app/lib/governanceFrame/parseBriefingCitations";
import { parseBriefingSections } from "@/app/lib/governanceFrame/parseBriefingSections";
import { resolvePublicBriefingProfile } from "@/app/lib/governanceFrame/publicBriefingDeclassification";

const QUEUE = resolve(process.cwd(), "docs/briefing-queue");

describe("desk-note queue promote readiness", () => {
  it.each([
    "2026-07-01-draft-desk-note-sharepoint-kev.md",
    "2026-07-02-draft-desk-note-ai-cyber-clearinghouse.md",
  ])("passes promotion validation: %s", (filename) => {
    const markdown = readFileSync(resolve(QUEUE, filename), "utf8");
    expect(resolvePublicBriefingProfile(markdown, filename)).toBe("desk-note");

    const sections = parseBriefingSections(markdown);
    const cite = sections.find((s) => s.id === "citations");
    expect(cite, "citations section missing").toBeTruthy();
    const parsed = parseBriefingCitations(cite!.body);
    expect(parsed.length, "parsed citations empty").toBeGreaterThan(0);

    const result = validateBriefingQueueDraft(filename, markdown, { promotion: true });
    expect(result.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
