import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { IncidentReportPayload } from "@/app/utils/incidentReportData";
import { calculateBudgetJustificationFromIncidentPayload } from "@/app/utils/grcMath";
import { formatCentsToUSD } from "@/app/utils/formatCentsToUSD";

const MARGIN = 14;
const PAGE_W = 210;
const MAX_TEXT_W = PAGE_W - 2 * MARGIN;

function escapeCell(s: string, max = 320): string {
  return s.replace(/\s+/g, " ").trim().slice(0, max);
}

function scrutinyWindowFromPayload(payload: IncidentReportPayload): {
  start: string;
  end: string;
} {
  const due = payload.dueDiligence;
  const ing = payload.hypothesisIngestionMeta;
  const ccvStart = ing?.continuousControlValidationStartedAtUtc;
  const ccvEnd = ing?.continuousControlValidationEndedAtUtc;
  const dmStart = ing?.deepMonitoringStartedAtUtc;
  const dmEnd = ing?.deepMonitoringEndedAtUtc;
  const start =
    ccvStart ??
    dmStart ??
    due?.monitoringStartedAtUtc ??
    payload.threat.createdAt.toISOString();
  const end =
    ccvEnd ??
    dmEnd ??
    due?.monitoringEndedAtUtc ??
    payload.threat.updatedAt.toISOString();
  return { start, end };
}

function primaryMappedControl(payload: IncidentReportPayload): string {
  const m = payload.mappedControls?.filter(Boolean) ?? [];
  if (m.length > 0) return m[0]!;
  return "SOC2 CC6.1";
}

/**
 * Due diligence PDF for HUMAN_SENTINEL hypothesis expiry (negative finding).
 * Header: CONTROL EFFECTIVENESS ATTESTATION (DUE DILIGENCE).
 */
export function buildDueDiligencePdfBytes(payload: IncidentReportPayload): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const generatedIso = new Date().toISOString();
  const { start: windowStart, end: windowEnd } = scrutinyWindowFromPayload(payload);
  const assets =
    payload.dueDiligence?.scannedAssets?.length ? payload.dueDiligence.scannedAssets : ["General Infrastructure"];
  const asset = escapeCell(assets[0] ?? "General Infrastructure", 120);

  const hyp = payload.hypothesisSummary;
  const hypothesisBlock =
    hyp?.lines?.join(" ") ||
    `Human sentinel hypothesis on ${asset}. Original intake: ${payload.threat.title}.`;

  const ironCycles = payload.reasoningLogs.filter(
    (r) => r.agentName === "Ironwatch" || r.agentName === "Ironsight",
  ).length;
  const mhe =
    payload.operationalResourceUtilization?.mheHumanHours != null
      ? payload.operationalResourceUtilization.mheHumanHours.toFixed(2)
      : "—";

  const control = primaryMappedControl(payload);
  const verdict = `No Control Deficiency Detected. Control ${control} confirmed effective.`;

  let y = 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("CONTROL EFFECTIVENESS ATTESTATION (DUE DILIGENCE)", PAGE_W / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Case ID: ${payload.threat.id}`, PAGE_W / 2, y, { align: "center" });
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("1. Hypothesis Summary", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  for (const line of doc.splitTextToSize(hypothesisBlock, MAX_TEXT_W)) {
    doc.text(line, MARGIN, y);
    y += 4;
  }
  y += 4;
  doc.text(`Target asset / scope: ${asset}`, MARGIN, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("2. Scrutiny Window (continuous control validation)", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Window start (UTC): ${windowStart}`, MARGIN, y);
  y += 4;
  doc.text(`Window end (UTC): ${windowEnd}`, MARGIN, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("3. Agentic Labor (MHE)", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    `Total reasoning cycles (Ironwatch + Ironsight only): ${ironCycles}`,
    MARGIN,
    y,
  );
  y += 4;
  doc.text(`Human-hour equivalent (MHE): ${mhe}`, MARGIN, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("4. Verdict", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  for (const line of doc.splitTextToSize(verdict, MAX_TEXT_W)) {
    doc.text(line, MARGIN, y);
    y += 4;
  }
  y += 6;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Assets observed", "Scrutiny window (UTC)"]],
    body: assets.map((a) => [escapeCell(a, 120), `${windowStart} → ${windowEnd}`]),
    styles: { fontSize: 8, cellPadding: 1.4 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    theme: "striped",
  });
  y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 24;
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Report generated (UTC): ${generatedIso}`, MARGIN, y);

  // --- Page 2: Executive budget justification ---
  const budget = calculateBudgetJustificationFromIncidentPayload(payload);
  const controlId = primaryMappedControl(payload);
  const mheStr = budget.mheHumanHours.toFixed(2);
  const fineAmount = formatCentsToUSD(budget.regulatoryUpliftCents);
  const laborSavings = formatCentsToUSD(budget.humanLaborCostCents);
  const totalMitigatedDisplay = formatCentsToUSD(budget.potentialLossCents);
  const aleDisplay = formatCentsToUSD(budget.aleCents);
  const netValueDisplay = formatCentsToUSD(budget.totalValueCreatedCents);

  doc.addPage();
  let yb = 14;
  doc.setFillColor(22, 78, 99);
  doc.rect(MARGIN, yb, PAGE_W - 2 * MARGIN, 13, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Total Risk Value Mitigated: ${totalMitigatedDisplay}`, PAGE_W / 2, yb + 8, { align: "center" });
  doc.setTextColor(30, 41, 42);
  yb += 20;

  doc.setFontSize(12);
  doc.text("EXECUTIVE BUDGET JUSTIFICATION", PAGE_W / 2, yb, { align: "center" });
  yb += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const nar1 = `By validating Control ${controlId} before a regulatory audit, Ironframe has mitigated a potential exposure of ${fineAmount}.`;
  const nar2 = `Automated investigation replaced ${mheStr} hours of manual labor, resulting in an immediate efficiency gain of ${laborSavings}.`;
  for (const line of doc.splitTextToSize(nar1, MAX_TEXT_W)) {
    doc.text(line, MARGIN, yb);
    yb += 4;
  }
  yb += 2;
  for (const line of doc.splitTextToSize(nar2, MAX_TEXT_W)) {
    doc.text(line, MARGIN, yb);
    yb += 4;
  }
  yb += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Cost Avoidance", MARGIN, yb);
  yb += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  autoTable(doc, {
    startY: yb,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Line item", "Amount (USD)"]],
    body: [
      ["ALE baseline (recorded exposure)", aleDisplay],
      ["Regulatory / framework uplift (multiplier on ALE)", fineAmount],
      ["Potential loss mitigated (ALE + uplift)", totalMitigatedDisplay],
      [`Human labor avoided (MHE × $150/hr; ${mheStr} h)`, laborSavings],
      ["Net value created (cost avoidance)", netValueDisplay],
    ],
    styles: { fontSize: 8, cellPadding: 1.4, fontStyle: "bold" },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
    theme: "striped",
    columnStyles: { 0: { fontStyle: "bold" } },
  });
  yb = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? yb + 40;
  yb += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Budget appendix generated (UTC): ${generatedIso}`, MARGIN, yb);

  const out = doc.output("arraybuffer");
  return new Uint8Array(out as ArrayBuffer);
}

export { buildDueDiligencePdfBytes as generateDueDiligenceReport };
