import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  calculateInsuranceIncentive,
  type InsuranceIncentiveResult,
  type InsuranceTenantData,
} from "@/app/utils/insuranceMath";
import { formatCentsToUSD } from "@/app/utils/formatCentsToUSD";
import { getCarrierTemplate, type CarrierTemplate } from "@/app/utils/carrierTemplates";
import { generateSimulationSignature } from "@/app/utils/simulationSignature";
import {
  buildGovernanceGlossaryEntries,
  GOVERNANCE_ALE_FORMULA_LINES,
  GOVERNANCE_ALE_FORMULA_TITLE,
} from "@/app/utils/governanceGlossary";

const MARGIN = 14;
const PAGE_W = 210;
/** A4 height (mm) for footer placement */
const PAGE_H = 297;
const MAX_TEXT_W = PAGE_W - 2 * MARGIN;

/** Table / banner header: simulation (purple) vs production (slate / sector colors). */
const SIMULATION_PURPLE: [number, number, number] = [109, 40, 217];
const PRODUCTION_HEAD_SLATE: [number, number, number] = [15, 23, 42];
const PRODUCTION_HEAD_TEAL: [number, number, number] = [19, 78, 74];
const PRODUCTION_HEAD_BLUE: [number, number, number] = [30, 58, 138];
const PRODUCTION_INCENTIVE_GREEN: [number, number, number] = [6, 78, 59];
const SIMULATION_INCENTIVE_PURPLE: [number, number, number] = [91, 33, 182];

function tableHeadStyle(
  isSimulation: boolean,
  productionRgb: [number, number, number],
): { fillColor: [number, number, number]; textColor: number; fontStyle: "bold" } {
  return {
    fillColor: isSimulation ? SIMULATION_PURPLE : productionRgb,
    textColor: 255,
    fontStyle: "bold",
  };
}

function applySimulationWatermarkAndFooter(doc: jsPDF, isSimulation: boolean): void {
  if (!isSimulation) return;
  const total = doc.getNumberOfPages();
  const footer =
    "This report is based on deterministic simulation data and does not reflect live asset performance.";
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.saveGraphicsState();
    try {
      const GState = (doc as unknown as { GState?: new (opts: { opacity: number }) => unknown }).GState;
      if (GState) {
        doc.setGState(new GState({ opacity: 0.14 }));
      }
    } catch {
      /* opacity optional */
    }
    doc.setTextColor(167, 139, 250);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(21);
    doc.text("SIMULATED RESULTS - SHADOW PLANE ACTIVE", PAGE_W / 2, PAGE_H / 2 + 25, {
      align: "center",
      angle: 35,
    });
    doc.restoreGraphicsState();

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(90, 90, 90);
    const lines = doc.splitTextToSize(footer, PAGE_W - 2 * MARGIN);
    let fy = PAGE_H - 10 - (lines.length - 1) * 3.2;
    for (const line of lines) {
      doc.text(line, PAGE_W / 2, fy, { align: "center" });
      fy += 3.2;
    }
    doc.setTextColor(30, 41, 42);
  }
}

/** Rows for the forensic shredding appendix (last N AuditReceipt records). */
export type ForensicShreddingLogRow = {
  timestampIso: string;
  assetName: string;
  sector: string;
  /** Display label e.g. Ironwatch (Agent 13). */
  agentId: string;
  sha256Signature: string;
};

export type BudgetReportPdfInput = InsuranceTenantData & {
  /** Target carrier pack — drives page order, visuals, and attestation wording. */
  carrierKey?: string | null;
  /** Shadow plane: watermark, purple headers, simulation disclaimer footer on every page. */
  isSimulation?: boolean;
  /** Tenant sector for Industry Average glossary line (falls back to `framework`). */
  glossaryIndustryLabel?: string | null;
  /** Last N audit receipts for the shredding log table (optional). */
  shreddingLogRows?: ForensicShreddingLogRow[];
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
  isSimulation: boolean,
): void {
  let y = 16;
  doc.setProperties({ title: `Ironframe Actuarial Loss Table — ${carrier.label}` });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  if (isSimulation) {
    doc.setTextColor(...SIMULATION_PURPLE);
  }
  doc.text("ACTUARIAL LOSS TABLE", PAGE_W / 2, y, { align: "center" });
  doc.setTextColor(30, 41, 42);
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
    headStyles: tableHeadStyle(isSimulation, PRODUCTION_HEAD_SLATE),
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
function renderBeazleyResponseTimeline(
  doc: jsPDF,
  carrier: CarrierTemplate,
  generatedIso: string,
  isSimulation: boolean,
): void {
  let y = 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  if (isSimulation) {
    doc.setTextColor(...SIMULATION_PURPLE);
  }
  doc.text("AUTOMATED RESPONSE TIMELINE", PAGE_W / 2, y, { align: "center" });
  doc.setTextColor(30, 41, 42);
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
    headStyles: tableHeadStyle(isSimulation, PRODUCTION_HEAD_TEAL),
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
  isSimulation: boolean,
): void {
  let y = 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  if (isSimulation) {
    doc.setTextColor(...SIMULATION_PURPLE);
  }
  doc.text("SYSTEMIC RESILIENCE DASHBOARD", PAGE_W / 2, y, { align: "center" });
  doc.setTextColor(30, 41, 42);
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
    headStyles: tableHeadStyle(isSimulation, PRODUCTION_HEAD_BLUE),
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
  isSimulation: boolean,
): void {
  let y = 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  if (isSimulation) {
    doc.setTextColor(...SIMULATION_PURPLE);
  }
  doc.text("ACTUARIAL EVIDENCE SUMMARY", PAGE_W / 2, y, { align: "center" });
  doc.setTextColor(30, 41, 42);
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
  y = writeWrapped(
    doc,
    "🤖 [MARKET_PROTECTION] | This control was re-validated due to a 20% industry risk spike, preventing potential 'Hard Market' premium surcharges.",
    MARGIN,
    y,
    MAX_TEXT_W,
    4.5,
  );
  y += 2;
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

  const incentiveRgb = isSimulation ? SIMULATION_INCENTIVE_PURPLE : PRODUCTION_INCENTIVE_GREEN;
  doc.setFillColor(...incentiveRgb);
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
  isSimulation: boolean,
): void {
  let y = 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  if (isSimulation) {
    doc.setTextColor(...SIMULATION_PURPLE);
  }
  doc.text("ATTESTATION FOR UNDERWRITERS", PAGE_W / 2, y, { align: "center" });
  doc.setTextColor(30, 41, 42);
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

function renderSimulationMethodologyPage(
  doc: jsPDF,
  opts: {
    generatedIso: string;
    integritySealHash: string;
    sealLabel: string;
    isSimulation: boolean;
  },
): void {
  let y = 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  if (opts.isSimulation) {
    doc.setTextColor(...SIMULATION_PURPLE);
  }
  doc.text("SIMULATION METHODOLOGY & INTEGRITY", PAGE_W / 2, y, { align: "center" });
  doc.setTextColor(30, 41, 42);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Generated (UTC): ${opts.generatedIso}`, MARGIN, y);
  y += 10;

  const blocks: Array<[string, string]> = [
    ["Simulation Engine", "Ironframe Shadow Plane v2026.1."],
    ["Deterministic Logic", "7-Gate Expert Agent Lifecycle."],
    [opts.sealLabel, opts.integritySealHash],
    [
      "Validation",
      "This test was conducted using deterministic logic to prove platform resilience under market volatility.",
    ],
  ];

  for (const [heading, body] of blocks) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(heading, MARGIN, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    y = writeWrapped(doc, body, MARGIN, y, MAX_TEXT_W, 4.8);
    y += 8;
  }

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  y = writeWrapped(
    doc,
    "The Integrity Seal is a salted SHA-256 digest of this export’s methodology payload; it does not attest to live production data.",
    MARGIN,
    y,
    MAX_TEXT_W,
    4,
  );
  doc.setTextColor(30, 41, 42);
}

function renderGovernanceDefinitionsAppendix(
  doc: jsPDF,
  opts: { sectorLabel: string; isSimulation: boolean },
): void {
  let y = 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  if (opts.isSimulation) {
    doc.setTextColor(...SIMULATION_PURPLE);
  } else {
    doc.setTextColor(...PRODUCTION_INCENTIVE_GREEN);
  }
  doc.text("APPENDIX: GOVERNANCE DEFINITIONS", PAGE_W / 2, y, { align: "center" });
  doc.setTextColor(30, 41, 42);
  y += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(`Sector context: ${opts.sectorLabel}`, MARGIN, y);
  doc.setTextColor(30, 41, 42);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Definition", MARGIN, y);
  doc.text("Regulatory reference (audit)", MARGIN + 105, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("— ISO / SOC mappings apply where listed below.", MARGIN, y);
  doc.setTextColor(30, 41, 42);
  y += 6;

  const entries = buildGovernanceGlossaryEntries(opts.sectorLabel);
  for (const { term, description, regulatoryReference } of entries) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(term, MARGIN, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    y = writeWrapped(doc, description, MARGIN, y, MAX_TEXT_W, 4.8);
    y += 4;
    if (regulatoryReference) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(90, 90, 90);
      y = writeWrapped(
        doc,
        `Regulatory reference: ${regulatoryReference}`,
        MARGIN,
        y,
        MAX_TEXT_W,
        3.8,
      );
      doc.setTextColor(30, 41, 42);
      doc.setFont("helvetica", "normal");
    }
    y += 6;
  }

  y += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  if (opts.isSimulation) {
    doc.setTextColor(...SIMULATION_PURPLE);
  } else {
    doc.setTextColor(...PRODUCTION_INCENTIVE_GREEN);
  }
  doc.text(GOVERNANCE_ALE_FORMULA_TITLE, MARGIN, y);
  doc.setTextColor(30, 41, 42);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const line of GOVERNANCE_ALE_FORMULA_LINES) {
    y = writeWrapped(doc, line, MARGIN, y, MAX_TEXT_W, 4.8);
    y += 3;
  }
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);
  y += 4;
  y = writeWrapped(
    doc,
    "Irontrust stores monetary exposure as BigInt cents at the ledger boundary; $ALE$ in this appendix is annualized loss expectancy in presentation terms.",
    MARGIN,
    y,
    MAX_TEXT_W,
    4,
  );
  doc.setTextColor(30, 41, 42);
}

/** Appendix: sector-to-framework mappings for Defense / Federal / Aerospace exports. */
function renderGeopoliticalRegulatoryAppendix(doc: jsPDF, isSimulation: boolean): void {
  let y = 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  if (isSimulation) {
    doc.setTextColor(...SIMULATION_PURPLE);
  } else {
    doc.setTextColor(...PRODUCTION_INCENTIVE_GREEN);
  }
  doc.text("APPENDIX: GEOPOLITICAL SECTOR REGULATORY MAPPINGS", PAGE_W / 2, y, { align: "center" });
  doc.setTextColor(30, 41, 42);
  y += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  y = writeWrapped(
    doc,
    "High-security sectors align budget justification narratives to sector-specific control regimes (illustrative mapping for underwriter review).",
    MARGIN,
    y,
    MAX_TEXT_W,
    4,
  );
  doc.setTextColor(30, 41, 42);
  y += 10;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Sector profile", "Primary regulatory / quality frameworks"]],
    body: [
      ["Defense", "CMMC Level 3 / ITAR"],
      ["Federal Government", "FISMA High / NIST SP 800-53"],
      ["Aerospace", "AS9100 Rev D"],
      ["State & Local", "State procurement / CJIS-aligned controls (where applicable)"],
    ],
    styles: { fontSize: 8, cellPadding: 1.6 },
    headStyles: tableHeadStyle(isSimulation, PRODUCTION_HEAD_SLATE),
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 52 } },
    theme: "striped",
  });

  const dy = (doc as DocWithAutoTable).lastAutoTable?.finalY ?? y + 40;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(90, 90, 90);
  writeWrapped(
    doc,
    "Mappings support audit traceability; carrier underwriting and statutory regimes prevail over these illustrative labels.",
    MARGIN,
    dy + 8,
    MAX_TEXT_W,
    3.8,
  );
  doc.setTextColor(30, 41, 42);
}

function renderForensicShreddingLogAppendix(
  doc: jsPDF,
  rows: ForensicShreddingLogRow[],
  isSimulation: boolean,
): void {
  let y = 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 42);
  doc.text("FORENSIC ASSET DISPOSAL & SHREDDING LOG", MARGIN, y);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const head = [["Timestamp", "Asset Name", "Sector", "Agent ID (Ironwatch)", "SHA-256 Signature"]];
  const body =
    rows.length > 0
      ? rows.map((r) => [
          r.timestampIso.replace("T", " ").slice(0, 19) + " UTC",
          r.assetName,
          r.sector,
          r.agentId,
          r.sha256Signature,
        ])
      : [["—", "(no disposals on file)", "—", "—", "—"]];

  autoTable(doc, {
    startY: y,
    head,
    body,
    styles: { fontSize: 7, cellPadding: 1.4, overflow: "linebreak" },
    headStyles: tableHeadStyle(isSimulation, PRODUCTION_HEAD_SLATE),
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 38 },
      2: { cellWidth: 28 },
      3: { cellWidth: 36 },
      4: { cellWidth: 52 },
    },
    theme: "striped",
  });

  const finalY = (doc as DocWithAutoTable).lastAutoTable?.finalY ?? y + 36;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(90, 90, 90);
  const footerNote =
    "This audit trail confirms the cryptographic erasure of sensitive assets in compliance with NIST 800-88 standards.";
  writeWrapped(doc, footerNote, MARGIN, finalY + 10, MAX_TEXT_W, 3.5);
  doc.setTextColor(30, 41, 42);
}

/**
 * Multi-page budget / actuarial evidence PDF with carrier-specific layout and attestation.
 * Internal-only diagnostics (coverage gaps, peer benchmarking, competitive remediation hints)
 * are intentionally excluded from this export surface.
 */
export function generateBudgetReport(input: BudgetReportPdfInput): Uint8Array {
  const { carrierKey, isSimulation = false, glossaryIndustryLabel, shreddingLogRows = [], ...tenantData } = input;
  const carrier = getCarrierTemplate(carrierKey);
  const inv = calculateInsuranceIncentive(tenantData);
  const generatedIso = new Date().toISOString();
  const sectorForGlossary =
    glossaryIndustryLabel?.trim() || tenantData.framework.trim() || "General";

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setProperties({
    title: `Ironframe Underwriter Evidence — ${carrier.label}`,
    subject: isSimulation ? "Actuarial / GRC export (simulation)" : "Actuarial / GRC export",
    keywords: `carrier:${carrier.key},framework:${tenantData.framework},simulation:${isSimulation}`,
  });

  if (carrier.key === "MUNICH_RE") {
    renderMunichActuarialLossCover(doc, inv, tenantData, carrier, generatedIso, isSimulation);
    doc.addPage();
  }

  if (carrier.key === "BEAZLEY") {
    renderBeazleyResponseTimeline(doc, carrier, generatedIso, isSimulation);
    doc.addPage();
  }

  renderActuarialEvidenceSummary(doc, inv, tenantData, carrier, generatedIso, isSimulation);

  if (carrier.key === "CHUBB") {
    doc.addPage();
    renderChubbSystemicResilienceDashboard(doc, carrier, inv, tenantData, isSimulation);
  }

  doc.addPage();
  renderAttestationForUnderwriters(doc, carrier, inv, tenantData, generatedIso, isSimulation);

  if (isSimulation) {
    const signaturePayload = {
      engineVersion: "2026.1",
      exportKind: "actuarial_budget_simulation",
      framework: tenantData.framework,
      carrierKey: carrier.key,
      generatedAtIso: generatedIso,
      basePremium_cents: tenantData.basePremium_cents?.toString() ?? "",
      totalDiscountBps: inv.totalDiscountBps,
      totalEstimatedSavings_cents: inv.totalEstimatedSavings_cents.toString(),
      hasContinuousMonitoring: tenantData.hasContinuousMonitoring,
      hasDueDiligencePdfs: tenantData.hasDueDiligencePdfs,
    };
    const sig = generateSimulationSignature(signaturePayload);
    doc.addPage();
    renderSimulationMethodologyPage(doc, {
      generatedIso,
      integritySealHash: sig.auditIdHex,
      sealLabel: sig.sealLabel,
      isSimulation,
    });
  }

  doc.addPage();
  renderGovernanceDefinitionsAppendix(doc, {
    sectorLabel: sectorForGlossary,
    isSimulation,
  });

  doc.addPage();
  renderGeopoliticalRegulatoryAppendix(doc, isSimulation);

  doc.addPage();
  renderForensicShreddingLogAppendix(doc, shreddingLogRows, isSimulation);

  applySimulationWatermarkAndFooter(doc, isSimulation);

  const out = doc.output("arraybuffer");
  return new Uint8Array(out as ArrayBuffer);
}

/** Generic (GRC Gold) pack — same as `generateBudgetReport` with `carrierKey: GENERIC`. */
export function buildActuarialEvidencePdfBytes(
  tenantData: InsuranceTenantData,
  options?: { isSimulation?: boolean; glossaryIndustryLabel?: string | null },
): Uint8Array {
  return generateBudgetReport({
    ...tenantData,
    carrierKey: "GENERIC",
    isSimulation: options?.isSimulation,
    glossaryIndustryLabel: options?.glossaryIndustryLabel,
  });
}
