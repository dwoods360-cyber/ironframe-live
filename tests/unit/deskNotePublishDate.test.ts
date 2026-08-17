import { describe, expect, it } from "vitest";

import {
  calendarDayToPublishedAtIso,
  extractCalendarDayFromFilename,
  resolveDeskNotePublishedAtIso,
  resolveGfSlatePublishedAtIso,
  resolvePublishedBriefingDisplayAt,
} from "@/app/lib/governanceFrame/deskNotePublishDate";

describe("deskNotePublishDate / GF slate dating", () => {
  it("maps calendar days to noon UTC", () => {
    expect(calendarDayToPublishedAtIso("2026-08-02")).toBe("2026-08-02T12:00:00.000Z");
  });

  it("reads the day prefix from filenames and slugs", () => {
    expect(
      extractCalendarDayFromFilename("2026-07-01-draft-desk-note-sharepoint-kev.md"),
    ).toBe("2026-07-01");
    expect(
      extractCalendarDayFromFilename("2026-06-16-research-cps-230-msp-contracts"),
    ).toBe("2026-06-16");
  });

  it("promote path prefers draft frontmatter published day", () => {
    const md = `---
category: desk-note
published: "2026-08-07"
title: "Desk Note — BOD 26-04"
---
Body
`;
    expect(
      resolveGfSlatePublishedAtIso("2026-08-07-draft-desk-note-bod-26-04-policy.md", md),
    ).toBe("2026-08-07T12:00:00.000Z");
  });

  it("promote path falls back to filename day", () => {
    const md = `---
title: "CPS 230 briefing"
---
Body
`;
    expect(
      resolveGfSlatePublishedAtIso("2026-06-16-draft-research-cps-230-msp-contracts.md", md),
    ).toBe("2026-06-16T12:00:00.000Z");
  });

  it("desk-note helper still scopes to desk-note drafts only", () => {
    const md = `---
title: "Monthly briefing"
published: "2026-08-01"
---
Body
`;
    expect(
      resolveDeskNotePublishedAtIso("2026-08-01-draft-gf-desk-monthly.md", md),
    ).toBeNull();
    expect(
      resolveGfSlatePublishedAtIso("2026-08-01-draft-gf-desk-monthly.md", md),
    ).toBe("2026-08-01T12:00:00.000Z");
  });

  it("public display prefers slug week over Approve-day frontmatter", () => {
    const content = `---
title: "CPS 230"
publishedAt: "2026-08-04T17:00:41.997Z"
published: "2026-08-04"
---
Body
`;
    const display = resolvePublishedBriefingDisplayAt({
      content,
      createdAt: new Date("2026-08-04T17:00:41.997Z"),
      slug: "2026-06-16-research-cps-230-msp-contracts",
    });
    expect(display.iso).toBe("2026-06-16T12:00:00.000Z");
  });

  it("public display uses slug for Control-First parts stamped Jul 16", () => {
    const content = `---
publishedAt: "2026-07-16T15:29:57.625Z"
published: "2026-07-16"
---
Body
`;
    const display = resolvePublishedBriefingDisplayAt({
      content,
      createdAt: new Date("2026-07-16T15:29:57.625Z"),
      slug: "2026-01-15-market-grc-2000-2008",
    });
    expect(display.iso).toBe("2026-01-15T12:00:00.000Z");
  });
});
