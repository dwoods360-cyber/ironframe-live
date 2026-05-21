import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { IrontechPostMortemReport } from "@/app/services/irontechPostMortem";

const MARGIN = 14;

export function buildIrontechPostMortemPdfBytes(report: IrontechPostMortemReport): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("IRONTECH POST-MORTEM — CONSTITUTIONAL CHAOS", 105, y, { align: "center" });
  y += 7;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Tenant ${report.tenantId.slice(0, 8)}… · Report ${report.reportId}`, 105, y, { align: "center" });
  y += 5;
  doc.text(`Generated ${report.generatedAt} · [SIMULATION_DATA]`, 105, y, { align: "center" });
  y += 10;

  const summary = [
    `Containment: ${report.containment.containmentMs ?? "—"}ms (Ironlock freeze)`,
    `Isolation: ${report.isolation.integrityVerdict} (${report.isolation.bleedIncidentCount} bleed signals)`,
    `Forensic LWT: ${report.forensicQuality.verdict} (min justification ${report.forensicQuality.minJustificationLength} chars)`,
    `DMS wipe: ${report.dmsLearning.wipeComplete ? "COMPLETE" : "INCOMPLETE"}`,
  ];
  for (const line of summary) {
    doc.text(line, MARGIN, y);
    y += 5;
  }
  y += 4;

  if (report.dmsLearning.failurePoint) {
    doc.setTextColor(180, 40, 40);
    doc.setFont("helvetica", "bold");
    doc.text("Learning loop — failure point", MARGIN, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const fp = doc.splitTextToSize(report.dmsLearning.failurePoint, 182);
    doc.text(fp, MARGIN, y);
    y += fp.length * 4 + 4;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
  }

  doc.setFont("helvetica", "bold");
  doc.text("Compliance Delta (Actual vs. TAS.md)", MARGIN, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Directive", "TAS Ln", "Expected", "Actual", "Delta", "Status"]],
    body: report.complianceDelta.map((r) => [
      r.directiveId,
      String(r.tasLineRef),
      r.expected,
      r.actual,
      r.delta,
      r.status,
    ]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [15, 23, 42] },
    margin: { left: MARGIN, right: MARGIN },
  });

  let finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  if (report.financialDefenseSummary) {
    const fin = report.financialDefenseSummary;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Financial Defense Summary", MARGIN, finalY);
    finalY += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      `Maturity ${fin.maturityScoreAtEvent.toFixed(1)}/10 · Dividend ${fin.financialImpact.governanceDividendDisplay}`,
      MARGIN,
      finalY,
    );
    finalY += 4;
    doc.text(
      `Probabilistic liability ${fin.financialImpact.probabilisticLiabilityDisplay} (max ${fin.financialImpact.maxExposureDisplay})`,
      MARGIN,
      finalY,
    );
    finalY += 6;
    doc.setFontSize(7);
    const narrative = doc.splitTextToSize(fin.narrative, 182);
    doc.text(narrative, MARGIN, finalY);
    finalY += narrative.length * 3.5 + 6;
  }

  doc.setFontSize(7);
  doc.setFont("courier", "normal");
  doc.text(`Report SHA-256: ${report.reportSha256}`, MARGIN, finalY);
  doc.text(`Signed seal: ${report.signedSeal}`, MARGIN, finalY + 4);
  doc.setFont("helvetica", "italic");
  doc.text(
    "Ironframe GRC — Auditor export. Seal binds report body; verify before external submission.",
    MARGIN,
    finalY + 10,
    { maxWidth: 182 },
  );

  return new Uint8Array(doc.output("arraybuffer"));
}
