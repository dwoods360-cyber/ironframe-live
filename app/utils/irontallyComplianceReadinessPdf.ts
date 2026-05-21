import { jsPDF } from "jspdf";
import type { IrontallyFrameworkSnapshot } from "@/app/services/irontallyMapper";

const MARGIN = 18;

export function buildIrontallyComplianceReadinessPdfBytes(
  snapshot: IrontallyFrameworkSnapshot,
): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("COMPLIANCE READINESS STATEMENT", 105, y, { align: "center" });
  y += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Irontally (Agent 19) — Framework Mapper · Ironframe GRC", 105, y, { align: "center" });
  y += 5;
  doc.text(`As of ${snapshot.asOf.slice(0, 10)} · Maturity ${snapshot.maturityScore.toFixed(1)}/10`, 105, y, {
    align: "center",
  });
  y += 12;

  doc.setFontSize(10);
  const body = doc.splitTextToSize(snapshot.readinessStatement, 174);
  doc.text(body, MARGIN, y);
  y += body.length * 5 + 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Framework posture", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  for (const row of snapshot.frameworks) {
    doc.text(
      `${row.frameworkName}: ${row.postureLabel} (${row.certified ? "certified band" : "gap band"})`,
      MARGIN,
      y,
    );
    y += 5;
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text("Market comparison ($1.6B entity peers)", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const m = snapshot.market;
  doc.text(`Ironframe score: ${m.currentScore.toFixed(1)} / 10`, MARGIN, y);
  y += 5;
  doc.text(`Industry average: ${m.industryAverage.toFixed(1)} / 10`, MARGIN, y);
  y += 5;
  doc.text(`Resilience surplus: ${m.resilienceSurplusDisplay}`, MARGIN, y);
  y += 5;
  if (snapshot.nist.tier >= 4) {
    doc.text(
      `NIST Tier 4 headroom: ${snapshot.nistTierExceedancePercent}% above tier floor (${snapshot.nist.scoreMin}.0)`,
      MARGIN,
      y,
    );
    y += 5;
  }

  y += 6;
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.text(
    "This statement is generated from Ironframe System Maturity Score and mapped controls in TAS.md. " +
      "External auditors must validate control design and operating effectiveness independently.",
    MARGIN,
    y,
    { maxWidth: 174 },
  );

  return new Uint8Array(doc.output("arraybuffer"));
}
