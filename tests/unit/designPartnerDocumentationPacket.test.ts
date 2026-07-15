import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { containsPreAuthOnboardingCopy } from "@/lib/onboarding/onboardingContentPolicy";

const PARTNER_PACK = [
  "user-manuals/design-partner-operator-packet.md",
  "user-manuals/get-started-workspace-setup.md",
  "user-manuals/audit-exports.md",
  "user-manuals/pilot-vs-preview.md",
  "training/LEVEL1-PARTNER-INDEX.md",
] as const;

describe("design partner documentation packet", () => {
  it("ships required partner manuals with cockpit paths and no Bucket A leak", () => {
    for (const relative of PARTNER_PACK) {
      const absolute = path.join(process.cwd(), "docs", relative);
      expect(fs.existsSync(absolute), relative).toBe(true);
      const markdown = fs.readFileSync(absolute, "utf8");
      expect(containsPreAuthOnboardingCopy(markdown), relative).toBe(false);
    }

    const packet = fs.readFileSync(
      path.join(process.cwd(), "docs", "user-manuals", "design-partner-operator-packet.md"),
      "utf8",
    );
    expect(packet).toContain("/register/{token}");
    expect(packet).toContain("/get-started");
    expect(packet).toContain("/exports");
    expect(packet).toContain("Path B");
    expect(packet).toContain("ALE baseline");
    expect(packet).toContain("delivery@ironframegrc.com");

    const exportsGuide = fs.readFileSync(
      path.join(process.cwd(), "docs", "user-manuals", "audit-exports.md"),
      "utf8",
    );
    expect(exportsGuide).toContain("**`/exports`**");
    expect(exportsGuide).not.toMatch(/Navigate to `\/dashboard\/exports`/);

    const partnerIndex = fs.readFileSync(
      path.join(process.cwd(), "docs", "training", "LEVEL1-PARTNER-INDEX.md"),
      "utf8",
    );
    expect(partnerIndex).toContain("Intentionally omitted");
    expect(partnerIndex).toContain("09 Docs hub handbook");
  });
});
