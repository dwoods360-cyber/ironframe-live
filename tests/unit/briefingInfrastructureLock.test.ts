import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { scanPublishedBriefingsForRss } from "../../scripts/compile-rss";
import {
  assertBriefingDataTestAcknowledged,
  assertBriefingDeployAcknowledged,
  assertBriefingInfrastructureLocked,
  evaluateBriefingInfrastructureLock,
  scanPublishedLedgerExposure,
} from "@/app/lib/governanceFrame/briefingInfrastructureLock";

const PUBLIC_SAFE_PUBLISHED = `---
title: "Regional Healthcare Perimeter Review"
publishedAt: "2026-06-17T12:00:00.000Z"
classification: "Institutional Governance"
summary: "Board-ready perimeter review for regulated healthcare operators."
---

### I. Exposure Vector
Supervisory expectations for third-party risk attestations continue to tighten across regional healthcare networks.

### II. Calculated Quantitative Impact
- **Reported ALE delta (¢):** "0"

### III. Machine-Rule Technical Translation
Continuous attestation programs should validate DORA Pillar 5 telemetry before syndication.

### V. Sources & Citations
- **[1] CISA advisory** — https://www.cisa.gov/news-events · retrieved 2026-06-17
`;

function makeTempDocsRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ironframe-infra-lock-"));
  fs.writeFileSync(path.join(root, "TAS.md"), "# TAS\n", "utf8");
  fs.mkdirSync(path.join(root, "briefing-queue"), { recursive: true });
  fs.mkdirSync(path.join(root, "published-briefings"), { recursive: true });
  return root;
}

describe("briefingInfrastructureLock", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    vi.unstubAllEnvs();
    for (const root of tempRoots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("passes when published ledger is public-safe and RSS mirrors published slugs only", () => {
    const docsRoot = makeTempDocsRoot();
    tempRoots.push(docsRoot);

    fs.writeFileSync(
      path.join(docsRoot, "published-briefings", "2026-06-17-healthcare-review.md"),
      PUBLIC_SAFE_PUBLISHED,
      "utf8",
    );
    fs.writeFileSync(
      path.join(docsRoot, "briefing-queue", "2026-06-18-draft-medshield.md"),
      `---
title: "Draft"
status: "QUARANTINED_DRAFT"
tenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01"
---
### I. Exposure Vector
Draft only.
`,
      "utf8",
    );

    const result = evaluateBriefingInfrastructureLock({ docsRoot });
    expect(result.ok).toBe(true);
    expect(result.issues.some((issue) => issue.severity === "error")).toBe(false);
  });

  it("fails when published ledger retains QUARANTINED_DRAFT status", () => {
    const docsRoot = makeTempDocsRoot();
    tempRoots.push(docsRoot);

    fs.writeFileSync(
      path.join(docsRoot, "published-briefings", "leaked-draft.md"),
      `---
title: "Leaked Draft"
status: "QUARANTINED_DRAFT"
classification: "Institutional Governance"
---
### I. Exposure Vector
Should not be published.
`,
      "utf8",
    );

    const issues = scanPublishedLedgerExposure(docsRoot);
    expect(issues.some((issue) => issue.code === "PUBLISHED_QUARANTINE_MARKER")).toBe(true);
    expect(evaluateBriefingInfrastructureLock({ docsRoot }).ok).toBe(false);
  });

  it("fails when published ledger contains internal API routes", () => {
    const docsRoot = makeTempDocsRoot();
    tempRoots.push(docsRoot);

    fs.writeFileSync(
      path.join(docsRoot, "published-briefings", "internal-leak.md"),
      `${PUBLIC_SAFE_PUBLISHED}\nSee GET /api/board/shared-context for live telemetry.`,
      "utf8",
    );

    const issues = scanPublishedLedgerExposure(docsRoot);
    expect(issues.some((issue) => issue.code === "PUBLISHED_INTERNAL_API_ROUTE")).toBe(true);
  });

  it("warns on staging-classified published briefings but does not fail the lock", () => {
    const docsRoot = makeTempDocsRoot();
    tempRoots.push(docsRoot);

    fs.writeFileSync(
      path.join(docsRoot, "published-briefings", "2026-06-07-staging-boundary-check.md"),
      `---
title: "Staging Boundary Check"
classification: "INTERNAL STAGING"
---
### I. Exposure Vector
Engineering sandbox only.
`,
      "utf8",
    );

    const result = evaluateBriefingInfrastructureLock({ docsRoot });
    expect(result.ok).toBe(true);
    expect(
      result.issues.some((issue) => issue.code === "PUBLISHED_STAGING_CLASSIFICATION"),
    ).toBe(true);
  });

  it("RSS compiler ignores briefing-queue drafts that were never promoted", () => {
    const docsRoot = makeTempDocsRoot();
    tempRoots.push(docsRoot);

    fs.writeFileSync(
      path.join(docsRoot, "briefing-queue", "secret-queue-draft.md"),
      `---
title: "Secret Queue Draft"
classification: "Institutional Governance"
publishedAt: "2026-06-18T12:00:00.000Z"
summary: "Queue only"
---
### I. Exposure Vector
Queue only.
`,
      "utf8",
    );

    const rssItems = scanPublishedBriefingsForRss(docsRoot);
    expect(rssItems.some((item) => item.slug === "secret-queue-draft")).toBe(false);
  });

  it("blocks non-promotable glossary artifacts in briefing-queue", () => {
    const docsRoot = makeTempDocsRoot();
    tempRoots.push(docsRoot);

    fs.writeFileSync(
      path.join(docsRoot, "briefing-queue", "2026-07-02-writer-glossary-delta.md"),
      "# glossary delta",
      "utf8",
    );

    const result = evaluateBriefingInfrastructureLock({ docsRoot });
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "QUEUE_NON_PROMOTABLE_ARTIFACT")).toBe(
      true,
    );
  });

  it("requires explicit acknowledgement env vars for data tests and deploy", () => {
    expect(() => assertBriefingDataTestAcknowledged()).toThrow(/IRONFRAME_BRIEFING_DATA_TEST_ACK/);
    expect(() => assertBriefingDeployAcknowledged()).toThrow(/IRONFRAME_BRIEFING_DEPLOY_ACK/);

    vi.stubEnv("IRONFRAME_BRIEFING_DATA_TEST_ACK", "1");
    vi.stubEnv("IRONFRAME_BRIEFING_DEPLOY_ACK", "1");
    expect(() => assertBriefingDataTestAcknowledged()).not.toThrow();
    expect(() => assertBriefingDeployAcknowledged()).not.toThrow();
  });

  it("assertBriefingInfrastructureLocked throws when lock fails", () => {
    const docsRoot = makeTempDocsRoot();
    tempRoots.push(docsRoot);

    fs.writeFileSync(
      path.join(docsRoot, "briefing-queue", "2026-07-02-writer-glossary-delta.md"),
      "# glossary delta",
      "utf8",
    );

    expect(() => assertBriefingInfrastructureLocked({ docsRoot })).toThrow(
      /Briefing infrastructure lock failed/,
    );
  });

  it("promotion syndication path remains free of server-only briefingLoader imports", async () => {
    const mod = await import("@/app/lib/governanceFrame/publishBriefingSyndication");
    expect(mod.syndicatePublishedBriefing).toBeTypeOf("function");
    expect(mod.mirrorPublishedBriefingToFilesystem).toBeTypeOf("function");
  });
});

describe("briefingInfrastructureLock (repo published ledger)", () => {
  it("repo staging boundary check is classified as internal staging", () => {
    const docsRoot = path.join(process.cwd(), "docs");
    const stagingPath = path.join(
      docsRoot,
      "published-briefings",
      "2026-06-07-staging-boundary-check.md",
    );
    if (!fs.existsSync(stagingPath)) return;

    const issues = scanPublishedLedgerExposure(docsRoot);
    expect(
      issues.some(
        (issue) =>
          issue.code === "PUBLISHED_STAGING_CLASSIFICATION" &&
          issue.scope?.includes("2026-06-07-staging-boundary-check.md"),
      ),
    ).toBe(true);
  });
});
