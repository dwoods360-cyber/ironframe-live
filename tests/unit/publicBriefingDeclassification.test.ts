import { describe, expect, it } from "vitest";

import {
  assertPublicBroadcastMirror,
  resolvePublicBriefingProfile,
  scanPublicBriefingDeclassification,
} from "@/app/lib/governanceFrame/publicBriefingDeclassification";
import { validateBriefingQueueDraft } from "@/app/lib/governanceFrame/briefingDraftValidation";

const EMERGING_THREATS_BODY = `## Active Threat Landscape Analysis
CISA KEV deadline pressure on CVE-2026-20262 affects SD-WAN perimeter stacks.

## Regulatory Posture & Institutional Impact
HIPAA and FFIEC supervisory expectations continue to elevate forensic evidence retention.

## Recommended Mitigation Controls
Institutional programs consolidate continuous attestation with board-ready reporting.

### V. Sources & Citations
- **[1] CISA KEV** — https://www.cisa.gov/known-exploited-vulnerabilities-catalog · retrieved 2026-07-02
`;

const EMERGING_FRONTMATTER = `---
title: "TGF Emerging Threats Notice — July 2, 2026"
classification: "Emerging Threats Notice"
status: "QUARANTINED_DRAFT"
summary: "Threat overview"
tenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01"
tenantSlug: "medshield"
---
`;

describe("publicBriefingDeclassification", () => {
  it("allows CVE identifiers for emerging threats notices", () => {
    const markdown = `${EMERGING_FRONTMATTER}\n${EMERGING_THREATS_BODY}`;
    const issues = scanPublicBriefingDeclassification(markdown, {
      profile: "emerging-threats-notice",
    });
    expect(issues.some((i) => i.code === "CVE_LITERAL")).toBe(false);
  });

  it("blocks Windows paths and repository footprints", () => {
    const markdown = `${EMERGING_FRONTMATTER}\n${EMERGING_THREATS_BODY}\nSee C:\\Users\\Dereck\\ironframe-live\\app\\vendors\\page.tsx`;
    expect(() =>
      assertPublicBroadcastMirror(markdown, {
        profile: "emerging-threats-notice",
        label: "test draft",
      }),
    ).toThrow(/WINDOWS_FILE_PATH|SOURCE_FILE_EXTENSION/);
  });

  it("blocks CVE identifiers for governance triad briefings", () => {
    const triad = `### I. Exposure Vector
Perimeter review CVE-2026-20262

### II. Calculated Quantitative Impact
$1.0M USD

### III. Machine-Rule Technical Translation
Controls

### V. Sources & Citations
- **[1] CISA** — https://www.cisa.gov/known-exploited-vulnerabilities-catalog · retrieved 2026-07-02
`;
    const issues = scanPublicBriefingDeclassification(triad, { profile: "governance-triad" });
    expect(issues.some((i) => i.code === "CVE_LITERAL")).toBe(true);
  });

  it("resolves profile from classification frontmatter", () => {
    expect(resolvePublicBriefingProfile(`${EMERGING_FRONTMATTER}\nbody`)).toBe(
      "emerging-threats-notice",
    );
  });
});

describe("desk-note promotion validation", () => {
  const DESK_NOTE = `---
title: "Desk Note — CISA KEV SharePoint perimeter RCE"
category: desk-note
status: QUARANTINED_DRAFT
publishState: QUARANTINED_AWAITING_OPERATOR
published: "2026-07-01"
summary: "KEV addition for on-premises SharePoint remote code execution."
classification: "Institutional Governance"
author: "Ironframe Governance Frame"
tenantId: "00000000-0000-0000-0000-000000000000"
tenantSlug: "ironframe-sandbox"
activeExposureCents: "0"
requiresImmediatePromotion: false
---

> **Signal (1 July 2026):** CISA added Microsoft SharePoint Server CVE-2026-45659 to KEV.

## What moved

On-premises SharePoint farms become short-fuse remediation priorities when listed in KEV.

## Governance implication (one test)

1. Inventory exposed SharePoint instances.
2. Record patch evidence and owners.
3. Document residual acceptance if past due.

## V. Sources & Citations

- **[1] CISA KEV** — https://www.cisa.gov/known-exploited-vulnerabilities-catalog
`;

  it("resolves desk-note profile from category/filename", () => {
    expect(
      resolvePublicBriefingProfile(DESK_NOTE, "2026-07-01-draft-desk-note-sharepoint-kev.md"),
    ).toBe("desk-note");
  });

  it("allows CVE identifiers on desk notes and passes promotion", () => {
    const issues = scanPublicBriefingDeclassification(DESK_NOTE, {
      profile: "desk-note",
      filename: "2026-07-01-draft-desk-note-sharepoint-kev.md",
    });
    expect(issues.some((i) => i.code === "CVE_LITERAL")).toBe(false);

    const result = validateBriefingQueueDraft(
      "2026-07-01-draft-desk-note-sharepoint-kev.md",
      DESK_NOTE,
      { promotion: true },
    );
    expect(result.ok).toBe(true);
  });
});
