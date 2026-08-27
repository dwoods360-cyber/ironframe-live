import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { validateBriefingQueueDraft } from "@/app/lib/governanceFrame/briefingDraftValidation";
import { parseBriefingCitations } from "@/app/lib/governanceFrame/parseBriefingCitations";
import { parseBriefingSections } from "@/app/lib/governanceFrame/parseBriefingSections";
import { resolvePublicBriefingProfile } from "@/app/lib/governanceFrame/publicBriefingDeclassification";

const QUEUE = resolve(process.cwd(), "docs/briefing-queue");

/**
 * Enumerate the queue instead of pinning filenames. Promoting a desk note deletes
 * it from the queue, so a hardcoded list rots into an ENOENT the moment the desk
 * ships anything — which is how this suite sat red and blocked the deploy gate.
 */
function queuedDeskNotes(): string[] {
  return readdirSync(QUEUE)
    .filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md")
    .filter((f) => !f.toLowerCase().includes("template"))
    .filter((f) => {
      const markdown = readFileSync(resolve(QUEUE, f), "utf8");
      return resolvePublicBriefingProfile(markdown, f) === "desk-note";
    })
    .sort();
}

describe("desk-note queue promote readiness", () => {
  const deskNotes = queuedDeskNotes();

  // An empty queue satisfies "every queued desk note is promote-ready" — but assert
  // the directory is readable so a bad path can't masquerade as a drained queue.
  if (deskNotes.length === 0) {
    it("queue holds no desk-note drafts to validate", () => {
      expect(readdirSync(QUEUE).length).toBeGreaterThan(0);
    });
    return;
  }

  it.each(deskNotes)("passes promotion validation: %s", (filename) => {
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
