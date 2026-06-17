import "server-only";

import type { BoardContextPayload } from "@/app/lib/board/sharedBoardContext";
import {
  formatCentsToMacroUsd,
  formatPhysicalKwh,
  formatPhysicalLiters,
} from "@/app/lib/board/boardFinancialDisplay";

export { formatCentsToMacroUsd, formatPhysicalKwh, formatPhysicalLiters };

const CVE_PATTERN = /CVE-\d{4}-\d+/gi;
const UUID_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

export type GovernanceTriadRow = {
  pillar: string;
  stance: string;
  summary: string;
};

/** Strip CVE tokens, UUIDs, and raw threat row identifiers from export-facing copy. */
export function sanitizeExportProse(input: string): string {
  return input
    .replace(CVE_PATTERN, "perimeter-classified threat")
    .replace(UUID_PATTERN, "redacted-asset")
    .replace(/\bthreat[_-]?id[:\s]*\S+/gi, "threat perimeter signal")
    .trim();
}

function buildExposureSummary(payload: BoardContextPayload): string {
  const count = payload.technical.criticalThreatCount;
  if (count <= 0) {
    return "All edge-validation ingress constraints monitored and de-escalated.";
  }
  return sanitizeExportProse(
    `${count} critical perimeter signal(s) under continuous machine-rule observation. No raw exploit identifiers exported.`,
  );
}

function buildImpactSummary(payload: BoardContextPayload): string {
  const pool = payload.financials.display.sovereignPool;
  const med = pool.medshield.baselineFormatted;
  const vault = pool.vaultbank.baselineFormatted;
  const grid = pool.gridcore.baselineFormatted;
  const kwh = payload.financials.display.sustainability.powerUsageFormatted;
  const liters = payload.financials.display.sustainability.fluidConsumptionFormatted;

  return sanitizeExportProse(
    `Medshield baseline ${med} (live ${pool.medshield.currentExposureFormatted}) | Vaultbank baseline ${vault} (live ${pool.vaultbank.currentExposureFormatted}) | Gridcore baseline ${grid} (live ${pool.gridcore.currentExposureFormatted}). Eco-dividend: ${kwh} averted; ${liters} cooling water conserved.`,
  );
}

function buildRemediationSummary(payload: BoardContextPayload): string {
  const doraIndex = payload.financials.display.compliance.doraReadinessFormatted;
  return sanitizeExportProse(
    `DORA Readiness Index at ${doraIndex}. Written to Immutable Audit Ledger. Human-in-the-loop validation gate active.`,
  );
}

/** Approved Governance Frame Triad rows from live board context. */
export function buildGovernanceTriadRows(
  payload: BoardContextPayload,
): GovernanceTriadRow[] {
  return [
    {
      pillar: "Exposure Vector",
      stance: "Grid Ingress Invariants & Perimeter Boundaries",
      summary: buildExposureSummary(payload),
    },
    {
      pillar: "Impact",
      stance: "Sovereign Baseline Protections & Eco-Dividend",
      summary: buildImpactSummary(payload),
    },
    {
      pillar: "Remediation",
      stance: "Continuous Verification & Human-in-the-Loop Gates",
      summary: buildRemediationSummary(payload),
    },
  ];
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildGovernanceTriadCsv(payload: BoardContextPayload): string {
  const rows = buildGovernanceTriadRows(payload);
  const header = ["Governance Triad Pillar", "Stance", "Summary"].map(escapeCsvCell).join(",");
  const body = rows
    .map((row) => [row.pillar, row.stance, row.summary].map(escapeCsvCell).join(","))
    .join("\n");
  return `${header}\n${body}\n`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildGovernanceTriadPrintHtml(payload: BoardContextPayload): string {
  const rows = buildGovernanceTriadRows(payload);
  const scaffold = payload.financials.display.governanceTriadScaffold;
  const tableRows = rows
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.pillar)}</td><td>${escapeHtml(row.stance)}</td><td>${escapeHtml(row.summary)}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Governance Frame Triad — ${escapeHtml(payload.timestamp)}</title>
  <style>
    body { font-family: Georgia, serif; margin: 2rem; color: #0f172a; }
    h1 { font-size: 1.25rem; }
    h2 { font-size: 1rem; margin-top: 1.5rem; }
    table { border-collapse: collapse; width: 100%; margin-top: 1rem; }
    th, td { border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; }
  </style>
</head>
<body>
  <h1>Governance Frame Triad Export</h1>
  <p>Tenant scope: ${escapeHtml(payload.financials.display.activeTenant.slug)} · ${escapeHtml(payload.timestamp)}</p>
  <h2>${escapeHtml(scaffold.exposureHeading)}</h2>
  <h2>${escapeHtml(scaffold.impactHeading)}</h2>
  <h2>${escapeHtml(scaffold.remediationHeading)}</h2>
  <table>
    <thead><tr><th>Pillar</th><th>Stance</th><th>Summary</th></tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`;
}
