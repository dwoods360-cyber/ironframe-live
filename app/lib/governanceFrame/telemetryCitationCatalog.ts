import type { BoardContextPayload } from "@/app/lib/board/sharedBoardContext";

import {
  formatBriefingCitationLine,
  renderBriefingCitationsMarkdown,
  type BriefingCitation,
} from "@/app/lib/governanceFrame/parseBriefingCitations";

/** @deprecated Internal reviewer locators — never append to public-bound briefing bodies. */
export function buildInternalReviewCitationCatalog(
  payload: BoardContextPayload,
  retrievedAt = new Date().toISOString(),
): BriefingCitation[] {
  const display = payload.financials.display;
  const date = retrievedAt.slice(0, 10);

  const citations: BriefingCitation[] = [
    {
      index: 1,
      label: "Ironframe live telemetry (tenant scope)",
      locator: `GET /api/board/shared-context · tenantId=${payload.tenantId}`,
      retrievedAt: date,
      note: `systemStatus=${payload.systemStatus}`,
    },
    {
      index: 2,
      label: "Active tenant exposure (formatted)",
      locator: `financials.display.activeTenant.currentExposureFormatted → ${display.activeTenant.currentExposureFormatted}`,
      retrievedAt: date,
      note: display.activeTenant.companyName,
    },
    {
      index: 3,
      label: "Sovereign pool baselines",
      locator: `financials.display.sovereignPool.*.baselineFormatted`,
      retrievedAt: date,
      note: `medshield ${display.sovereignPool.medshield.baselineFormatted}; vaultbank ${display.sovereignPool.vaultbank.baselineFormatted}`,
    },
    {
      index: 4,
      label: "Sustainability ledger",
      locator: `financials.display.sustainability.powerUsageFormatted · fluidConsumptionFormatted`,
      retrievedAt: date,
      note: `${display.sustainability.powerUsageFormatted}; ${display.sustainability.fluidConsumptionFormatted}`,
    },
    {
      index: 5,
      label: "DORA readiness register",
      locator: `financials.display.compliance.doraReadinessFormatted → ${display.compliance.doraReadinessFormatted}`,
      retrievedAt: date,
      note: `status ${display.compliance.doraStatus}`,
    },
    {
      index: 6,
      label: "Governance Frame triad scaffold",
      locator: "financials.display.governanceTriadScaffold",
      retrievedAt: date,
      note: `${display.governanceTriadScaffold.exposureHeading}; ${display.governanceTriadScaffold.impactHeading}; ${display.governanceTriadScaffold.remediationHeading}`,
    },
  ];

  if (payload.narrativeCache?.operationalDate) {
    citations.push({
      index: 7,
      label: "Nightly triad snapshot",
      locator: `governance_frame_triad_snapshots · operationalDate=${payload.narrativeCache.operationalDate}`,
      retrievedAt: date,
      note: "Human review required before promotion to published-briefings",
    });
  }

  return citations;
}

/** External-facing Section V scaffold — safe for public newsletter and Governance Frame readers. */
export function buildPublicBriefingCitationCatalog(
  retrievedAt = new Date().toISOString(),
): BriefingCitation[] {
  const date = retrievedAt.slice(0, 10);
  return [
    {
      index: 1,
      label: "CISA Known Exploited Vulnerabilities Catalog",
      locator: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
      retrievedAt: date,
      note: "Federal cyber defense coordination baseline",
    },
    {
      index: 2,
      label: "NIST Cybersecurity Framework",
      locator: "https://www.nist.gov/cyberframework",
      retrievedAt: date,
      note: null,
    },
    {
      index: 3,
      label: "Ironframe Governance Frame",
      locator: "https://brief.ironframegrc.com",
      retrievedAt: date,
      note: "Institutional GRC intelligence surface",
    },
  ];
}

/** @deprecated Alias — use buildInternalReviewCitationCatalog for operator review tooling only. */
export const buildTelemetryCitationCatalog = buildInternalReviewCitationCatalog;

export function appendPublicBriefingCitationsToMarkdown(
  markdown: string,
  retrievedAt = new Date().toISOString(),
): string {
  if (/###\s+V\.\s+Sources/i.test(markdown)) return markdown;
  const block = renderBriefingCitationsMarkdown(buildPublicBriefingCitationCatalog(retrievedAt));
  return `${markdown.trim()}\n\n${block}`;
}

/** @deprecated Appends internal reviewer locators — not for public-bound drafts. */
export function appendTelemetryCitationsToMarkdown(
  markdown: string,
  payload: BoardContextPayload,
  retrievedAt = new Date().toISOString(),
): string {
  if (/###\s+V\.\s+Sources/i.test(markdown)) return markdown;
  const block = renderBriefingCitationsMarkdown(
    buildInternalReviewCitationCatalog(payload, retrievedAt),
  );
  return `${markdown.trim()}\n\n${block}`;
}

export function formatTelemetryCitationLines(
  payload: BoardContextPayload,
  retrievedAt = new Date().toISOString(),
): string[] {
  return buildInternalReviewCitationCatalog(payload, retrievedAt).map(formatBriefingCitationLine);
}
