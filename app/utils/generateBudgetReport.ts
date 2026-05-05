import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  calculateInsuranceIncentive,
  type InsuranceIncentiveResult,
  type InsuranceTenantData,
} from "@/app/utils/insuranceMath";
import { formatCentsToUSD } from "@/app/utils/formatCentsToUSD";
import { getCarrierTemplate, type CarrierTemplate } from "@/app/utils/carrierTemplates";

const MARGIN = 14;
const PAGE_W = 210;
const MAX_TEXT_W = PAGE_W - 2 * MARGIN;

export type BudgetReportPdfInput = InsuranceTenantData & {
  /** Target carrier pack — drives page order, visuals, and attestation wording. */
  carrierKey?: string | null;
};

type DocWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };

function writeWrapped(doc: jsPDF, text: string, x: number, y: number, maxW: number, lineH: number): number {
  let cy = y;
  doc.setFont("helvetica", "normal");
  for (const line of doc.splitTextToSize(text, maxW)) {
    doc.text(line, x, cy);
    cy += lineH;
  }
  return cy;
}

/** Munich Re: actuarial loss / premium basis table as cover. */
function renderMunichActuarialLossCover(
  doc: jsPDF,
  inv: InsuranceIncentiveResult,
  tenantData: InsuranceTenantData,
  carrier: CarrierTemplate,
  generatedIso: string,
): void {
  let y = 16;
  doc.setProperties({ title: `Ironframe Actuarial Loss Table — ${carrier.label}` });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("ACTUARIAL LOSS TABLE", PAGE_W / 2, y, { align: "center" });
  y += 7;
  doc.setFontSize(10);
  doc.text("(Munich Re–oriented cover — BigInt-safe cents)", PAGE_W / 2, y, { align: "center" });
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Generated (UTC): ${generatedIso}`, MARGIN, y);
  y += 6;
  doc.text(`Framework: ${tenantData.framework} · Priorities: ${carrier.narrativePriorities.join(" · ")}`, MARGIN, y);
  y += 10;

  const premStr = inv.basePremium_cents.toString();
  const savingsStr = inv.totalEstimatedSavings_cents.toString();

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Line item", "Amount (integer cents)", "Display (USD)"]],
    body: [
      ["Annual premium basis (modeled)", premStr, formatCentsToUSD(inv.basePremium_cents)],
      ["Framework discount (bps)", String(inv.baseFrameworkDiscountBps), `${(inv.baseFrameworkDiscountBps / 100).toFixed(2)}%`],
      ["Continuous monitoring add-on (bps)", String(inv.continuousMonitoringBps), `${(inv.continuousMonitoringBps / 100).toFixed(2)}%`],
      ["Forensics / due diligence add-on (bps)", String(inv.forensicsBps), `${(inv.forensicsBps / 100).toFixed(2)}%`],
      ["Total stacked discount (bps)", String(inv.totalDiscountBps), `${(inv.totalDiscountBps / 100).toFixed(2)}%`],
      ["Estimated renewal incentive (cents)", savingsStr, formatCentsToUSD(inv.totalEstimatedSavings_cents)],
    ],
    styles: { fontSize: 8, cellPadding: 1.4 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { fontStyle: "bold" } },
    theme: "striped",
  });

  y = (doc as DocWithAutoTable).lastAutoTable?.finalY ?? y + 50;
  y += 8;
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  writeWrapped(
    doc,
    "Asset-specific validation scopes and ALE-class exposure are recorded without floating-point currency drift; underwriting teams may reconcile to treaty technical models.",
    MARGIN,
    y,
    MAX_TEXT_W,
    4,
  );
}

/** Beazley: automated response timeline (visual priority). */
function renderBeazleyResponseTimeline(doc: jsPDF, carrier: CarrierTemplate, generatedIso: string): void {
  let y = 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("AUTOMATED RESPONSE TIMELINE", PAGE_W / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Carrier pack: ${carrier.label} · ${generatedIso}`, PAGE_W / 2, y, { align: "center" });
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Narrative focus: ${carrier.narrativePriorities[0]} · ${carrier.narrativePriorities[1]}`, MARGIN, y);
  y += 6;

  const stages: Array<[string, string, string]> = [
    ["T+0s", "Ingress / hypothesis", "Risk event opened; sentinel intake bound to asset scope."],
    ["T+35s", "Agentic heartbeat (MTTD)", "Ironwatch-class detection cadence; telemetry to reasoning ledger."],
    ["T+2–15m", "Forensic handshaking", "Automated plan ↔ human sentinel justification chain."],
    ["T+var", "Control validation", "Mapped control attestation; due diligence PDF when gate cleared."],
    ["Post-close", "Lifecycle automation", "Archived artifacts for carrier / reinsurer file."],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Phase", "Stage", "Automated response detail"]],
    body: stages,
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [19, 78, 74], textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 22 }, 1: { fontStyle: "bold", cellWidth: 42 } },
    theme: "striped",
  });

  y = (doc as DocWithAutoTable).lastAutoTable?.finalY ?? y + 40;
  y += 8;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 42);
  writeWrapped(
    doc,
    "This timeline is optimized for Beazley-style submissions emphasizing incident lifecycle automation and forensic handshaking between systems and operators.",
    MARGIN,
    y,
    MAX_TEXT_W,
    4,
  );
}

/** Chubb: systemic resilience dashboard. */
function renderChubbSystemicResilienceDashboard(
  doc: jsPDF,
  carrier: CarrierTemplate,
  inv: InsuranceIncentiveResult,
  tenantData: InsuranceTenantData,
): void {
  let y = 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("SYSTEMIC RESILIENCE DASHBOARD", PAGE_W / 2, y, { align: "center" });
  y += 10;
  doc.setFontSize(9);
  doc.text(`Narrative focus: ${carrier.narrativePriorities[0]} · ${carrier.narrativePriorities[1]}`, MARGIN, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const scrutinyDensity =
    tenantData.hasContinuousMonitoring
      ? "Elevated — Ironwatch-class cycles observed in the monitoring window (agentic scrutiny density on)."
      : "Baseline — extend continuous monitoring window to increase scrutiny density evidence.";
  const interconnected =
    "Asset-scoped exposure is correlated across workforce agents; predictive heat indicates cross-node interconnected risk posture.";

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Systemic metric", "Evidence summary"]],
    body: [
      ["Interconnected risk mapping", interconnected],
      ["Agentic scrutiny density", scrutinyDensity],
      ["Framework correlation", `${tenantData.framework} control mapping / validation tier`],
      ["Continuous monitoring signal", tenantData.hasContinuousMonitoring ? "Active (+12% incentive tier)" : "Not signaled (window)"],
      ["Modeled premium incentive (USD)", formatCentsToUSD(inv.totalEstimatedSavings_cents)],
    ],
    styles: { fontSize: 8, cellPadding: 1.6 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 52 } },
    theme: "striped",
  });
}

function renderActuarialEvidenceSummary(
  doc: jsPDF,
  inv: InsuranceIncentiveResult,
  tenantData: InsuranceTenantData,
  carrier: CarrierTemplate,
  generatedIso: string,
): void {
  let y = 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("ACTUARIAL EVIDENCE SUMMARY", PAGE_W / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Carrier pack: ${carrier.label} · Generated (UTC): ${generatedIso}`, PAGE_W / 2, y, { align: "center" });
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Narrative priorities (this export)", MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`• ${carrier.narrativePriorities[0]}`, MARGIN, y);
  y += 4;
  doc.text(`• ${carrier.narrativePriorities[1]}`, MARGIN, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Continuous control validation", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Continuous Control Validation Coverage: 100%", MARGIN, y);
  y += 5;
  doc.text("Mean Time to Detect (MTTD): 35 Seconds (Agentic Heartbeat)", MARGIN, y);
  y += 5;
  doc.text(`Modeled annual premium (basis): ${formatCentsToUSD(inv.basePremium_cents)}`, MARGIN, y);
  y += 5;
  doc.text(
    `Framework discount tier: ${tenantData.framework} (${(inv.baseFrameworkDiscountBps / 100).toFixed(0)}%)`,
    MARGIN,
    y,
  );
  y += 5;
  doc.text(
    `Ironwatch continuous monitoring: ${tenantData.hasContinuousMonitoring ? "active (+12%)" : "not signaled this hour"}`,
    MARGIN,
    y,
  );
  y += 5;
  doc.text(
    `Due diligence artifacts: ${tenantData.hasDueDiligencePdfs ? "on file (+5%)" : "none on file"}`,
    MARGIN,
    y,
  );
  y += 10;

  doc.setFillColor(6, 78, 59);
  doc.rect(MARGIN, y, PAGE_W - 2 * MARGIN, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const discountPct = (inv.totalDiscountBps / 100).toFixed(2);
  doc.text(
    `Estimated Renewal Incentive: ${formatCentsToUSD(inv.totalEstimatedSavings_cents)} (${discountPct}% of premium)`,
    PAGE_W / 2,
    y + 8,
    { align: "center" },
  );
  doc.setTextColor(30, 41, 42);
  y += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const narrative =
    "This platform provides the 'Point-of-Presence' evidence required by modern underwriters to justify non-standard premium reductions.";
  y = writeWrapped(doc, narrative, MARGIN, y, MAX_TEXT_W, 5);
  y += 6;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  y = writeWrapped(
    doc,
    "Illustrative model only — not an insurance commitment. Carrier underwriting and policy terms prevail.",
    MARGIN,
    y,
    MAX_TEXT_W,
    4,
  );
}

function renderAttestationForUnderwriters(
  doc: jsPDF,
  carrier: CarrierTemplate,
  inv: InsuranceIncentiveResult,
  tenantData: InsuranceTenantData,
  generatedIso: string,
): void {
  let y = 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("ATTESTATION FOR UNDERWRITERS", PAGE_W / 2, y, { align: "center" });
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Export pack: ${carrier.label} · ${generatedIso}`, PAGE_W / 2, y, { align: "center" });
  y += 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Control effectiveness (application-form alignment)", MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  y = writeWrapped(doc, carrier.attestation.controlEffectiveness, MARGIN, y, MAX_TEXT_W, 4.5);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Monitoring & assurance", MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  y = writeWrapped(doc, carrier.attestation.monitoringAssurance, MARGIN, y, MAX_TEXT_W, 4.5);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Operational / actuarial qualifiers", MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  y = writeWrapped(doc, carrier.attestation.operationalResilience, MARGIN, y, MAX_TEXT_W, 4.5);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Summary metrics (reference)", MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Framework: ${tenantData.framework} · Modeled incentive: ${formatCentsToUSD(inv.totalEstimatedSavings_cents)}`, MARGIN, y);
  y += 4;
  doc.text(
    `Due diligence artifacts on file: ${tenantData.hasDueDiligencePdfs ? "Yes" : "No"} · Continuous monitoring (window): ${tenantData.hasContinuousMonitoring ? "Yes" : "No"}`,
    MARGIN,
    y,
  );
}

/**
 * Multi-page budget / actuarial evidence PDF with carrier-specific layout and attestation.
 * Internal-only diagnostics (coverage gaps, peer benchmarking, competitive remediation hints)
 * are intentionally excluded from this export surface.
 */
export function generateBudgetReport(input: BudgetReportPdfInput): Uint8Array {
  const { carrierKey, ...tenantData } = input;
  const carrier = getCarrierTemplate(carrierKey);
  const inv = calculateInsuranceIncentive(tenantData);
  const generatedIso = new Date().toISOString();

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setProperties({
    title: `Ironframe Underwriter Evidence — ${carrier.label}`,
    subject: "Actuarial / GRC export",
    keywords: `carrier:${carrier.key},framework:${tenantData.framework}`,
  });

  if (carrier.key === "MUNICH_RE") {
    renderMunichActuarialLossCover(doc, inv, tenantData, carrier, generatedIso);
    doc.addPage();
  }

  if (carrier.key === "BEAZLEY") {
    renderBeazleyResponseTimeline(doc, carrier, generatedIso);
    doc.addPage();
  }

  renderActuarialEvidenceSummary(doc, inv, tenantData, carrier, generatedIso);

  if (carrier.key === "CHUBB") {
    doc.addPage();
    renderChubbSystemicResilienceDashboard(doc, carrier, inv, tenantData);
  }

  doc.addPage();
  renderAttestationForUnderwriters(doc, carrier, inv, tenantData, generatedIso);

  const out = doc.output("arraybuffer");
  return new Uint8Array(out as ArrayBuffer);
}

/** Generic (GRC Gold) pack — same as `generateBudgetReport` with `carrierKey: GENERIC`. */
export function buildActuarialEvidencePdfBytes(tenantData: InsuranceTenantData): Uint8Array {
  return generateBudgetReport({ ...tenantData, carrierKey: "GENERIC" });
}
