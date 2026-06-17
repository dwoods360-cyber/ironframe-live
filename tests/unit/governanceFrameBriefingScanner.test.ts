import { describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

import {
  enforceBriefingQuarantine,
  scanPublishedBriefings,
} from "../../Ironboard/src/governanceFrame/briefingScanner.js";

describe("Governance Frame briefing scanner", () => {
  it("ingests only published-briefings markdown and warns on queue drafts", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gf-briefings-"));
    const publishedDir = path.join(root, "published-briefings");
    const queueDir = path.join(root, "briefing-queue");
    fs.mkdirSync(publishedDir);
    fs.mkdirSync(queueDir);

    fs.writeFileSync(
      path.join(publishedDir, "alpha.md"),
      "# Alpha Briefing\n\n## **I. Exposure Vector**\n\nTest.",
      "utf-8",
    );
    fs.writeFileSync(path.join(queueDir, "template.md"), "# template", "utf-8");
    fs.writeFileSync(path.join(queueDir, "secret-draft.md"), "# draft", "utf-8");

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const briefings = scanPublishedBriefings(root);
    expect(briefings).toHaveLength(1);
    expect(briefings[0]?.slug).toBe("alpha");

    enforceBriefingQuarantine(root);
    expect(warnSpy).toHaveBeenCalledWith(
      "[SECURITY AUDIT] Unauthorized compilation attempt blocked for unvetted draft: secret-draft.md",
    );

    warnSpy.mockRestore();
    fs.rmSync(root, { recursive: true, force: true });
  });
});
