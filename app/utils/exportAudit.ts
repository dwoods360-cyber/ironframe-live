/**
 * PDF export for Audit Trail with Risk SaaS metrics.
 * Report header (Active Tenant, Risk Summary), itemized trail with Supply Chain Impact,
 * professional formatting (system font, Confidential footer), and Historical Entries count
 * matching the sidebar filtered count.
 */
import type { AuditLogRecord, AuditActionType } from "@/app/utils/auditLogger";

const ACTION_LABELS: Partial<Record<AuditActionType, string>> = {
  LOGIN: "Login",
  CONFIG_CHANGE: "Config Change",
  EMAIL_SENT: "Email Sent",
  ALERT_DISMISSED: "Alert Dismissed",
  GRC_ACKNOWLEDGE_CLICK: "ACKNOWLEDGE",
  GRC_DEACKNOWLEDGE_CLICK: "DEACKNOWLEDGE",
  GRC_PROCESS_THREAT: "INGEST",
  GRC_SET_TTL: "GRC Set TTL",
  GRC_DECREMENT_TTL: "GRC Decrement TTL",
  GRC_SENTINEL_SWEEP: "Sentinel Sweep",
  GRC_VENDOR_ARTIFACT_SUBMIT: "INGEST",
  RISK_REGISTRATION_MANUAL: "Manual Risk Registration",
  EXPORT_PDF: "PDF Exported",
  RED_TEAM_SIMULATION_START: "Simulation Start",
  RED_TEAM_SIMULATION_STOP: "Simulation Stop",
  SPRINT_CLOSE: "Sprint Close",
};

export type AuditReportFilter = {
  logTypeFilter?: "GRC" | "APP_SYSTEM" | "SERVER" | "TELEMETRY" | "SIMULATION";
  descriptionIncludes?: string[];
  companyId?: string | null;
  selectedIndustry?: string;
  selectedTenantName?: string | null;
};

/**
 * Apply the same filter as AuditIntelligence sidebar so PDF Historical Entries count matches.
 */
export function getFilteredAuditLogsForReport(
  logs: ReadonlyArray<AuditLogRecord>,
  filter: AuditReportFilter
): AuditLogRecord[] {
  const { logTypeFilter, descriptionIncludes = [], companyId, selectedIndustry = "Healthcare", selectedTenantName } = filter;
  const descriptionKeywords = descriptionIncludes.map((k) => k.toLowerCase());
  const industryLower = selectedIndustry.toLowerCase();
  const companyKey = (companyId ?? selectedTenantName)?.toLowerCase() ?? "";

  return logs.filter((entry) => {
    if (entry.log_type === "SIMULATION") return false;
    const isGrcBotSimulation =
      entry.user_id === "GRCBOT" || (entry.metadata_tag?.includes("SIMULATION|GRCBOT") ?? false);
    if (isGrcBotSimulation) return false;
    const matchesLogType = logTypeFilter ? entry.log_type === logTypeFilter : true;
    const matchesDescription =
      descriptionKeywords.length === 0 ||
      descriptionKeywords.some((keyword) => entry.description.toLowerCase().includes(keyword));
    const matchesIndustry =
      entry.description.toLowerCase().includes(industryLower) ||
      (entry.metadata_tag?.toLowerCase().includes(industryLower) ?? false);
    const matchesCompany =
      !companyKey ||
      (entry.metadata_tag && entry.metadata_tag.toLowerCase().includes(companyKey)) ||
      (entry.description && entry.description.toLowerCase().includes(companyKey));

    return matchesLogType && matchesDescription && matchesIndustry && matchesCompany;
  });
}

/**
 * Supply Chain Impact (1–10) for vendor/third-party audit entries.
 * Uses metadata_tag liability when present (e.g. liability:5000000 → $5M → 9.2); else heuristic.
 */
function supplyChainImpactForAuditEntry(entry: AuditLogRecord): number | null {
  const desc = (entry.description ?? "").toLowerCase();
  const tag = (entry.metadata_tag ?? "").toLowerCase();
  const action = entry.action_type;

  const isVendorOrThirdParty =
    action === "GRC_VENDOR_ARTIFACT_SUBMIT" ||
    desc.includes("vendor") ||
    desc.includes("third-party") ||
    desc.includes("third party") ||
    desc.includes("artifact") ||
    tag.includes("vendor") ||
    tag.includes("artifact");

  if (!isVendorOrThirdParty) return null;

  const liabilityMatch = (entry.metadata_tag ?? "").match(/liability[:\s]*(\d+)/i);
  if (liabilityMatch) {
    const raw = Number(liabilityMatch[1]);
    const liabilityM = raw >= 1e6 ? raw / 1e6 : raw < 1000 ? raw : raw / 1e6;
    if (liabilityM > 5) return 9.2;
    if (liabilityM < 1) return 3.0;
    return 3 + ((liabilityM - 1) * (9 - 3)) / 4;
  }

  const hasCriticalAccess =
    desc.includes("patient records") || desc.includes("core infrastructure");
  return hasCriticalAccess ? 9.2 : 8.6;
}

function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r\n/g, " ")
    .replace(/\n/g, " ")
    .slice(0, 200);
}

const LINE_HEIGHT = 12;
const FONT_SIZE = 10;
const MARGIN = 72;
const PAGE_HEIGHT = 792;
const BODY_TOP = 720;

export type RiskSummary = {
  currentRiskUsd: number;
  potentialImpactUsd: number;
  riskGapUsd: number;
};

const INDUSTRY_BENCHMARKS: Record<string, { baseRisk: number; baseImpact: number }> = {
  Healthcare: { baseRisk: 10.9, baseImpact: 15.2 },
  Finance: { baseRisk: 11.5, baseImpact: 18.0 },
  Energy: { baseRisk: 11.0, baseImpact: 17.0 },
  Technology: { baseRisk: 9.0, baseImpact: 12.0 },
  Defense: { baseRisk: 10.5, baseImpact: 16.0 },
};

/**
 * Compute risk summary ($) from store state for PDF report. Matches StrategicIntel math.
 */
export function computeRiskSummary(params: {
  selectedIndustry: string;
  acceptedThreatImpacts: Record<string, number>;
  pipelineThreats: Array<{ score?: number; loss: number; source?: string; name?: string; description?: string }>;
  dashboardLiabilities: Record<string, number>;
  riskOffset: number;
}): RiskSummary {
  const b = INDUSTRY_BENCHMARKS[params.selectedIndustry] ?? INDUSTRY_BENCHMARKS.Healthcare;
  const totalActiveLoss = Object.values(params.acceptedThreatImpacts).reduce((a, x) => a + x, 0);
  const pipelinePendingTotal = params.pipelineThreats.reduce((sum, t) => sum + (t.score ?? t.loss), 0);
  const dashboardLiabilitySum = Object.values(params.dashboardLiabilities).reduce((a, x) => a + x, 0);
  const rawCurrentRisk = b.baseRisk + totalActiveLoss * 0.5 + dashboardLiabilitySum * 0.5;
  const rawPotentialImpact = b.baseImpact + totalActiveLoss + pipelinePendingTotal;
  const currentRiskM = Math.max(0, rawCurrentRisk - params.riskOffset);
  const potentialImpactM = Math.max(0, rawPotentialImpact - params.riskOffset);
  const riskGapM = Math.max(0, potentialImpactM - currentRiskM);
  return {
    currentRiskUsd: currentRiskM * 1e6,
    potentialImpactUsd: potentialImpactM * 1e6,
    riskGapUsd: riskGapM * 1e6,
  };
}

export type BuildAuditPdfParams = {
  activeTenantName: string;
  riskSummary: RiskSummary;
  entries: ReadonlyArray<AuditLogRecord>;
  generatedAt?: string;
};

/**
 * Build PDF content stream lines (header, risk summary, itemized trail, footer).
 * Uses system font stack (Helvetica in PDF).
 */
function buildPdfLines(params: BuildAuditPdfParams): string[] {
  const { activeTenantName, riskSummary, entries, generatedAt = new Date().toISOString() } = params;
  const lines: string[] = [];

  lines.push("Confidential: Enterprise Risk Report");
  lines.push("");
  lines.push(`Active Tenant: ${escapePdfText(activeTenantName)}`);
  lines.push("");
  lines.push("--- Risk Summary ---");
  lines.push(`Current Risk: $${(riskSummary.currentRiskUsd / 1e6).toFixed(2)}M`);
  lines.push(`Potential Impact: $${(riskSummary.potentialImpactUsd / 1e6).toFixed(2)}M`);
  lines.push(`Risk Gap: $${(riskSummary.riskGapUsd / 1e6).toFixed(2)}M`);
  lines.push("");
  lines.push(`Historical Entries: ${entries.length}`);
  lines.push("");
  lines.push("--- Itemized Audit Trail ---");

  for (const entry of entries) {
    const actionLabel = (ACTION_LABELS[entry.action_type] ?? entry.action_type) as string;
    const impact = supplyChainImpactForAuditEntry(entry);
    const descText =
      impact != null
        ? `${escapePdfText(entry.description)} [Supply Chain Impact: ${impact.toFixed(1)}/10]`
        : escapePdfText(entry.description);
    lines.push(`[ ${actionLabel} ] ${entry.timestamp}`);
    lines.push(descText);
    lines.push("");
  }

  lines.push("---");
  lines.push(`Report generated: ${escapePdfText(generatedAt)}`);
  lines.push("Confidential: Enterprise Risk Report");

  return lines;
}

/**
 * Build a minimal PDF (single page) with multi-line content and Confidential footer.
 * Font: Helvetica (standard PDF system font).
 */
export function buildAuditPdf(params: BuildAuditPdfParams): string {
  const lines = buildPdfLines(params);
  const escapedLines = lines.map((line) => {
    const safe = line
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/\r/g, "")
      .replace(/\n/g, " ");
    return `(${safe}) Tj`;
  });

  const streamParts: string[] = ["BT", `/F1 ${FONT_SIZE} Tf`, `${MARGIN} ${BODY_TOP} Td`];
  for (let i = 0; i < escapedLines.length; i++) {
    if (i > 0) streamParts.push(`0 -${LINE_HEIGHT} Td`);
    streamParts.push(escapedLines[i]);
  }
  const streamContent = streamParts.join("\n");
  const contentObj =
    `4 0 obj\n<< /Length ${streamContent.length} >>\nstream\n` +
    streamContent +
    "\nendstream\nendobj\n";
  const fontObj = "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";
  const catalog = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  const pages = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
  const pageObj =
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n";

  let offset = 0;
  const offsets: number[] = [];
  const chunks = ["%PDF-1.4\n", catalog, pages, pageObj, contentObj, fontObj];
  for (const chunk of chunks) {
    offsets.push(offset);
    offset += chunk.length;
  }

  const xrefRows = [
    "0000000000 65535 f ",
    ...offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n `),
  ];
  const xref = "xref\n0 6\n" + xrefRows.join("\n") + "\ntrailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n" + offset + "\n%%EOF";

  return chunks.join("") + xref;
}
