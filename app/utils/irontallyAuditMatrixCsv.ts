import type { FrameworkReadinessSummary } from "@/app/types/irontallyReadiness";

function escapeCsvCell(value: string): string {
  const v = value.replace(/"/g, '""');
  return /[",\n\r]/.test(v) ? `"${v}"` : v;
}

function extractEvidenceAction(physicalContext: string): string {
  const m = physicalContext.match(/Ledger attestation \(([^)]+)\)/i);
  return m?.[1]?.trim() ?? "ORCHESTRATION_BUS_CYCLE_SUCCESS";
}

export function buildIrontallyAuditMatrixCsv(params: {
  tenantName: string;
  tenantId: string;
  asOf: string;
  readiness: FrameworkReadinessSummary[];
}): string {
  const { tenantName, tenantId, asOf, readiness } = params;
  const lines: string[] = [
    `# Ironframe Irontally Audit Matrix — ${tenantName}`,
    `# Tenant: ${tenantId}`,
    `# As of: ${asOf}`,
    "Framework,Control ID,Status,Evidence Action,Last Verified Timestamp",
  ];

  for (const fw of readiness) {
    lines.push(
      [
        escapeCsvCell(fw.framework),
        escapeCsvCell("FRAMEWORK_SUMMARY"),
        escapeCsvCell(`${fw.passingControlsCount}/${fw.totalControlsMonitored} PASSING`),
        escapeCsvCell("—"),
        escapeCsvCell(asOf),
      ].join(","),
    );

    for (const log of fw.verifiedEvidenceLogs) {
      lines.push(
        [
          escapeCsvCell(fw.framework),
          escapeCsvCell(log.controlId),
          escapeCsvCell("VERIFIED"),
          escapeCsvCell(extractEvidenceAction(log.physicalContext)),
          escapeCsvCell(log.timestamp),
        ].join(","),
      );
    }
  }

  return `${lines.join("\n")}\r\n`;
}
