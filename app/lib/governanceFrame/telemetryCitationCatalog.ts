import type { BoardContextPayload } from "@/app/lib/board/sharedBoardContext";

import {
  formatBriefingCitationLine,
  renderBriefingCitationsMarkdown,
  type BriefingCitation,
} from "@/app/lib/governanceFrame/parseBriefingCitations";

/** Canonical locators reviewers use to fact-check board and narrate output. */
export function buildTelemetryCitationCatalog(
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

export function appendTelemetryCitationsToMarkdown(
  markdown: string,
  payload: BoardContextPayload,
  retrievedAt = new Date().toISOString(),
): string {
  if (/###\s+V\.\s+Sources/i.test(markdown)) return markdown;
  const block = renderBriefingCitationsMarkdown(
    buildTelemetryCitationCatalog(payload, retrievedAt),
  );
  return `${markdown.trim()}\n\n${block}`;
}

export function formatTelemetryCitationLines(
  payload: BoardContextPayload,
  retrievedAt = new Date().toISOString(),
): string[] {
  return buildTelemetryCitationCatalog(payload, retrievedAt).map(formatBriefingCitationLine);
}
