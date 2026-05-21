import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { IncidentReportPayload } from "@/app/utils/incidentReportData";

const MARGIN = 14;
const PAGE_W = 210;
const MAX_TEXT_W = PAGE_W - 2 * MARGIN;

const ESCALATION_FORMULA_LINE =
  "Composite severity model: Sm = (V × P) + B_radius (recorded per-row in Escalation math column).";

function escapeCell(s: string, max = 320): string {
  return s.replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * NIST SP 800-61–oriented post-mortem: constitutional audit header, forensic calibration + temporal attestation,
 * ReasoningLog autotable, audit gates, strategic recommendations, immutable TAS workforce signature.
 */
export function buildPostMortemPdfBytes(payload: IncidentReportPayload): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const generatedIso = new Date().toISOString();

  let y = 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`IRONFRAME CONSTITUTIONAL AUDIT | CASE ID: ${payload.threat.id}`, PAGE_W / 2, y, {
    align: "center",
  });
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Incident Handling Guide Alignment (NIST SP 800-61)", PAGE_W / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(9);
  const summaryLines = [
    `Preparation / Detection summary: ${escapeCell(payload.threat.title, 200)}`,
    `Source agent: ${payload.threat.sourceAgent} | Terminal status: ${payload.threat.status}`,
    `Opened (UTC): ${payload.threat.createdAt.toISOString()} | Last update: ${payload.threat.updatedAt.toISOString()}`,
    `Report generated (UTC): ${generatedIso}`,
  ];
  for (const line of summaryLines) {
    doc.text(line, MARGIN, y);
    y += 5;
  }
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.text("1. Forensic calibration & temporal accuracy", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const driftMs = payload.forensicDriftMsAtDrillStart;
  const driftParagraph =
    driftMs != null
      ? `Clock drift at session handshake (ms): ${driftMs}. This value reflects client epoch vs server receipt at Ironscribe forensic calibration (see ReasoningLog JSON).`
      : "Clock drift at drill start: not present on earliest Ironscribe forensic handshake — attest temporal ordering using server UTC baseline only.";
  for (const line of doc.splitTextToSize(driftParagraph, MAX_TEXT_W)) {
    doc.text(line, MARGIN, y);
    y += 4;
  }
  y += 2;
  doc.setFont("helvetica", "italic");
  doc.text(
    "Temporal Accuracy Attestation: Audit timestamps for this case are reconciled to coordinated UTC; material skew beyond organizational tolerance invalidates real-time ordering guarantees under GRC policy.",
    MARGIN,
    y,
    { maxWidth: MAX_TEXT_W },
  );
  y += 12;
  doc.setFont("helvetica", "normal");
  if (payload.calibrationMathSummary) {
    doc.setFontSize(7);
    doc.setFont("courier", "normal");
    for (const line of doc.splitTextToSize(payload.calibrationMathSummary, MAX_TEXT_W)) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, MARGIN, y);
      y += 3.5;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    y += 4;
  }

  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("2. Reasoning trail (agent escalation ledger)", MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(ESCALATION_FORMULA_LINE, MARGIN, y);
  y += 6;

  const reasoningBody = payload.reasoningLogs.map((r) => [
    r.createdAt.toISOString(),
    r.agentName,
    escapeCell(r.escalationLogic ?? "—", 280),
    r.isCorrection ? "Yes" : "No",
    r.confidence.toFixed(2),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["UTC", "Agent", "Escalation math / logic", "Self-correction pivot", "Conf."]],
    body: reasoningBody,
    styles: { fontSize: 7, cellPadding: 1.2 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    theme: "striped",
  });

  y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  y += 10;

  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("3. Audit / handling gates (immutable trail)", MARGIN, y);
  y += 6;

  const auditBody = payload.auditLogs.map((a) => [
    a.createdAt.toISOString(),
    escapeCell(a.action, 40),
    escapeCell(a.operatorId, 36),
    escapeCell(a.justification ?? "—", 220),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["UTC", "Action", "Operator", "Justification / detail"]],
    body: auditBody,
    styles: { fontSize: 7, cellPadding: 1 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    theme: "striped",
  });

  y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 30;
  y += 12;

  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("4. Predictive fidelity", MARGIN, y);
  y += 6;
  const pf = payload.predictiveFidelity;
  const predictedPath = pf?.predictedPath ?? [];
  const actualPath = pf?.actualPath ?? [];
  const maxRows = Math.max(predictedPath.length, actualPath.length, 1);
  const fidelityBody = Array.from({ length: maxRows }, (_, i) => [
    predictedPath[i] ?? "—",
    actualPath[i] ?? "—",
  ]);
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Predicted path", "Actual path"]],
    body: fidelityBody,
    styles: { fontSize: 7, cellPadding: 1.1 },
    headStyles: { fillColor: [14, 116, 144], textColor: 255 },
    theme: "striped",
  });
  y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20;
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const accuracy = pf?.predictionAccuracyScorePct ?? 0;
  const handover = pf?.handoverEfficiencyMs != null ? `${Math.round(pf.handoverEfficiencyMs / 1000)}s` : "n/a";
  const divergence = (pf?.divergencePoints ?? []).join(", ") || "none";
  const fidelityLines = [
    `Prediction Accuracy Score: ${accuracy.toFixed(2)}%`,
    `Handover Efficiency: ${handover}`,
    `Divergence points: ${escapeCell(divergence, 200)}`,
  ];
  for (const line of fidelityLines) {
    doc.text(line, MARGIN, y);
    y += 4;
  }
  y += 6;

  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("5. Strategic recommendations (lessons learned)", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const strat =
    payload.strategicRecommendations?.trim() ||
    "No dedicated recommendations block — refer to reasoning trail and audit gates.";
  for (const line of doc.splitTextToSize(strat, MAX_TEXT_W)) {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, MARGIN, y);
    y += 4;
  }
  y += 10;

  if (y > 230) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("6. ANONYMIZED TACTICAL SUMMARY", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const anon = payload.anonymizedTacticalSummary ?? {
    predictiveAccuracyScore: payload.predictiveFidelity?.predictionAccuracyScorePct ?? null,
    mitigationStrategy: "Autonomous mitigation sequence completed under constitutional controls.",
    tacticalSignals: [],
  };
  const anonJson = JSON.stringify(anon, null, 2);
  doc.text(
    "Export-safe summary (community intelligence): includes predictive accuracy and mitigation strategy, excludes operator identity and specific asset names.",
    MARGIN,
    y,
    { maxWidth: MAX_TEXT_W },
  );
  y += 8;
  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  for (const line of doc.splitTextToSize(anonJson, MAX_TEXT_W)) {
    if (y > 275) {
      doc.addPage();
      y = 20;
      doc.setFont("courier", "normal");
      doc.setFontSize(7);
    }
    doc.text(line, MARGIN, y);
    y += 3.5;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  y += 8;

  if (y > 245) {
    doc.addPage();
    y = 24;
  }

  doc.setDrawColor(160, 160, 170);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("WORKFORCE SIGNATURE — TAS COMPLIANCE SIGNATURE", PAGE_W / 2, y, { align: "center" });
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const seal = doc.splitTextToSize(
    "This artifact was emitted under Ironframe constitutional controls. ReasoningLog and AuditLog excerpts above constitute the authoritative chain-of-custody for post-incident review per organizational policy aligned with NIST SP 800-61.",
    MAX_TEXT_W,
  );
  for (const line of seal) {
    doc.text(line, PAGE_W / 2, y, { align: "center" });
    y += 4;
  }
  if (pf?.metricHash) {
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.text(`Predictive Fidelity Metric Hash: ${pf.metricHash}`, PAGE_W / 2, y, { align: "center" });
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
  }

  const out = doc.output("arraybuffer");
  return new Uint8Array(out as ArrayBuffer);
}

export { buildDueDiligencePdfBytes } from "@/app/utils/generateDueDiligenceReport";
