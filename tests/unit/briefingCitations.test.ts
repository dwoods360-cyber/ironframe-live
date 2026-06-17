import { describe, expect, it } from "vitest";

import {
  parseBriefingCitations,
  renderBriefingCitationsMarkdown,
} from "@/app/lib/governanceFrame/parseBriefingCitations";
import { parseBriefingSections } from "@/app/lib/governanceFrame/parseBriefingSections";
import {
  evaluateAlertThresholds,
  parseExposureThresholdCents,
  validateBriefingDraftContent,
  validateBriefingQueueDraft,
  buildBriefingDraftFrontmatter,
  parseBriefingDraftAlertFlags,
  parseBriefingDraftFrontmatter,
  stripFrontmatter,
} from "@/app/lib/governanceFrame/briefingDraftValidation";
import { buildTelemetryCitationCatalog } from "@/app/lib/governanceFrame/telemetryCitationCatalog";
import type { BoardContextPayload } from "@/app/lib/board/sharedBoardContext";

const SAMPLE_BODY = `### I. Exposure Vector
Perimeter review.

### II. Calculated Quantitative Impact
- **Reported ALE delta (¢):** "0"

### III. Machine-Rule Technical Translation
Checklist item.

### V. Sources & Citations

- **[1] Live telemetry** — \`GET /api/board/shared-context\` · retrieved 2026-06-17 · tenant scope
- **[2] TAS baseline** — \`docs/TAS.md\` · retrieved 2026-06-17
`;

describe("parseBriefingCitations", () => {
  it("parses indexed citation bullets", () => {
    const sections = parseBriefingSections(SAMPLE_BODY);
    const citationsSection = sections.find((s) => s.id === "citations");
    expect(citationsSection).toBeTruthy();

    const citations = parseBriefingCitations(citationsSection!.body);
    expect(citations).toHaveLength(2);
    expect(citations[0]?.label).toBe("Live telemetry");
    expect(citations[0]?.locator).toContain("/api/board/shared-context");
  });

  it("renders Section V markdown block", () => {
    const block = renderBriefingCitationsMarkdown([
      {
        index: 1,
        label: "Telemetry",
        locator: "financials.display.activeTenant",
        retrievedAt: "2026-06-17",
        note: null,
      },
    ]);
    expect(block).toMatch(/### V\. Sources & Citations/);
    expect(block).toMatch(/\[1\] Telemetry/);
  });
});

describe("briefingDraftValidation", () => {
  it("passes well-formed queue drafts with warnings only", () => {
    const result = validateBriefingQueueDraft("my-draft.md", SAMPLE_BODY);
    expect(result.ok).toBe(true);
    expect(result.issues.some((i) => i.code === "FILENAME_CONVENTION")).toBe(true);
  });

  it("blocks promotion without citations", () => {
    const noCitations = SAMPLE_BODY.replace(/### V\.[\s\S]*/, "");
    const result = validateBriefingQueueDraft("2026-06-17-draft-medshield.md", noCitations, {
      promotion: true,
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "MISSING_CITATIONS")).toBe(true);
  });

  it("flags CVE literals on promotion", () => {
    const withCve = `${SAMPLE_BODY}\nCVE-2024-1234`;
    const result = validateBriefingDraftContent(withCve, { promotion: true });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "CVE_LEAK")).toBe(true);
  });

  it("evaluates exposure threshold with BigInt (no float drift)", () => {
    const below = evaluateAlertThresholds(4_999_999n);
    expect(below.requiresImmediatePromotion).toBe(false);

    const at = evaluateAlertThresholds(5_000_000n);
    expect(at.requiresImmediatePromotion).toBe(true);

    const medshield = evaluateAlertThresholds(9_650_000n);
    expect(medshield.requiresImmediatePromotion).toBe(true);
    expect(medshield.thresholdCents).toBe(parseExposureThresholdCents("5000000"));
  });

  it("builds quarantine frontmatter with escalation flag", () => {
    const header = buildBriefingDraftFrontmatter({
      title: "Automated Governance Triad Narrative",
      dateIso: "2026-06-17T03:00:00.000Z",
      tenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
      tenantSlug: "medshield",
      currentExposureCents: 9_650_000n,
      requiresImmediatePromotion: true,
    });
    expect(header).toMatch(/requiresImmediatePromotion: true/);
    expect(header).toMatch(/activeExposureCents: "9650000"/);
    expect(header).toMatch(/status: "QUARANTINED_DRAFT"/);

    const flags = parseBriefingDraftAlertFlags(`${header}\n\n# Body`);
    expect(flags.requiresImmediatePromotion).toBe(true);
  });

  it("parses promotion frontmatter for database persistence", () => {
    const header = buildBriefingDraftFrontmatter({
      title: "Automated Governance Triad Narrative",
      dateIso: "2026-06-17T03:00:00.000Z",
      tenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
      tenantSlug: "medshield",
      currentExposureCents: 9_650_000n,
      requiresImmediatePromotion: true,
    });
    const parsed = parseBriefingDraftFrontmatter(`${header}\n\n${SAMPLE_BODY}`, "fallback");
    expect(parsed?.tenantId).toBe("5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01");
    expect(parsed?.activeExposureCents).toBe(9_650_000n);
    expect(stripFrontmatter(`${header}\n\n${SAMPLE_BODY}`)).toContain("### I. Exposure Vector");
  });
});

describe("telemetryCitationCatalog", () => {
  it("builds deterministic locators from board context payload", () => {
    const payload = {
      tenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
      timestamp: "2026-06-17T00:00:00.000Z",
      systemStatus: "ARCHITECTURE ENFORCED",
      financials: {
        baselines: { medshield: 1110000000n, vaultbank: 590000000n, gridcore: 470000000n },
        currentExposureCents: 9650000n,
        display: {
          sovereignPool: {
            medshield: {
              rawBaselineCents: "1110000000",
              baselineFormatted: "$11.1M USD",
              rawCurrentExposureCents: "9650000",
              currentExposureFormatted: "$96,500.00 USD",
            },
            vaultbank: {
              rawBaselineCents: "590000000",
              baselineFormatted: "$5.9M USD",
              rawCurrentExposureCents: "15400000",
              currentExposureFormatted: "$154,000.00 USD",
            },
            gridcore: {
              rawBaselineCents: "470000000",
              baselineFormatted: "$4.7M USD",
              rawCurrentExposureCents: "15950000",
              currentExposureFormatted: "$159,500.00 USD",
            },
          },
          activeTenant: {
            tenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
            slug: "medshield",
            companyName: "Medshield Health",
            rawCurrentExposureCents: "9650000",
            currentExposureFormatted: "$96,500.00 USD",
          },
          activeTenantScope: {
            companyUuid: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
            companyName: "Medshield Health",
            baselineFormatted: "$11.1M USD",
            currentExposureFormatted: "$96,500.00 USD",
          },
          sustainability: {
            powerUsageFormatted: "0 kWh",
            fluidConsumptionFormatted: "0 L",
          },
          compliance: {
            doraReadinessFormatted: "100%",
            doraStatus: "COMPLIANT",
          },
          governanceTriadScaffold: {
            exposureHeading: "I. Exposure Vector",
            impactHeading: "II. Calculated Quantitative Impact",
            remediationHeading: "III. Machine-Rule Technical Translation",
          },
        },
      },
      technical: { criticalThreatCount: 0, activeVulnerabilities: [] },
      compliance: { frameworks: [] },
      sustainability: { powerUsageKwh: 0n, fluidConsumptionLiters: 0n },
      narrativeCache: null,
    } as BoardContextPayload;

    const citations = buildTelemetryCitationCatalog(payload, "2026-06-17T12:00:00.000Z");
    expect(citations[1]?.locator).toContain("$96,500.00 USD");
    expect(citations.some((c) => c.locator.includes("doraReadinessFormatted"))).toBe(true);
  });
});
