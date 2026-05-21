/**
 * Ironscribe (Agent 5) — Sustainability_Achievement_Report_V1 (investor PDF).
 */
import { formatCentsToAccountingUSD } from "@/app/utils/formatCentsToUSD";
import type { jsPDF } from "jspdf";

export const SUSTAINABILITY_ACHIEVEMENT_REPORT_TEMPLATE = "Sustainability_Achievement_Report_V1";

export const SUSTAINABILITY_ACHIEVEMENT_GAVEL_ATTESTATION =
  "This data was autonomously generated, verified by SHA-256 fingerprinting, " +
  "and governed by the Ironframe Constitutional Architecture without manual override.";

export type SustainabilityAchievementReportV1PdfInput = {
  generatedAtIso: string;
  reportingPeriodLabel: string;
  /** Sum of mitigated sustainability ALE (ledger) in cents. */
  mitigatedSustainabilityAleCents: bigint;
  totalKwhSaved: bigint;
  /** Average observed grid intensity (gCO₂eq/kWh) over samples in window. */
  averageGridIntensityGco2PerKwh: number | null;
  /** Simple delta: last half minus first half of window sample means (g/kWh); null if insufficient data. */
  gridIntensityDeltaGco2PerKwh: number | null;
  constitutionalTasSha256: string | null;
  compositeBodySha256: string;
  wormTargetGsUri: string;
};

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

export async function buildSustainabilityAchievementReportV1Pdf(
  input: SustainabilityAchievementReportV1PdfInput,
): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const M = 14;
  const maxW = pageW - M * 2;
  let y = 18;

  doc.setProperties({
    title: `${SUSTAINABILITY_ACHIEVEMENT_REPORT_TEMPLATE} — Ironframe`,
    subject: "ESG / CSRD investor sustainability achievement",
    keywords: "Ironscribe,Ironbloom,TAS,constitutional,SHA-256",
  });

  doc.setFontSize(16);
  doc.text(SUSTAINABILITY_ACHIEVEMENT_REPORT_TEMPLATE.replace(/_/g, " "), M, y);
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 70);
  y = addWrappedText(
    doc,
    `Generated: ${input.generatedAtIso} · Period: ${input.reportingPeriodLabel} · Template: ${SUSTAINABILITY_ACHIEVEMENT_REPORT_TEMPLATE}`,
    M,
    y,
    maxW,
    4,
  );
  y += 4;
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(11);
  doc.text("Executive financial summary", M, y);
  y += 6;
  doc.setFontSize(10);
  const aleUsd = formatCentsToAccountingUSD(input.mitigatedSustainabilityAleCents);
  y = addWrappedText(
    doc,
    `Mitigated sustainability ALE (ledger aggregate, integer cents → USD): ${aleUsd}. ` +
      `Raw mitigated cents: ${input.mitigatedSustainabilityAleCents.toString()}.`,
    M,
    y,
    maxW,
    5,
  );
  y += 4;

  doc.setFontSize(11);
  doc.text("Operational metrics", M, y);
  y += 6;
  doc.setFontSize(10);
  y = addWrappedText(
    doc,
    `Aggregated energy averted (kWh, SustainabilityMetric ledger): ${input.totalKwhSaved.toString()} kWh.`,
    M,
    y,
    maxW,
    5,
  );
  y += 4;
  const avg =
    input.averageGridIntensityGco2PerKwh != null
      ? `${input.averageGridIntensityGco2PerKwh.toFixed(1)} gCO₂eq/kWh (pulse telemetry window; not a full 30-day curve)`
      : "No grid intensity samples in the current Carbon Pulse buffer.";
  const delta =
    input.gridIntensityDeltaGco2PerKwh != null
      ? ` Grid intensity delta (second half − first half of samples): ${input.gridIntensityDeltaGco2PerKwh >= 0 ? "+" : ""}${input.gridIntensityDeltaGco2PerKwh.toFixed(1)} g/kWh.`
      : "";
  y = addWrappedText(doc, `${avg}${delta}`, M, y, maxW, 5);
  y += 6;

  doc.setFontSize(11);
  doc.text("Constitutional verification", M, y);
  y += 6;
  doc.setFontSize(10);
  y = addWrappedText(
    doc,
    `TAS.md SHA-256 (point-in-time constitutional hash governing mitigation evidence): ${
      input.constitutionalTasSha256 ?? "(unavailable — constitutional file not readable)"
    }`,
    M,
    y,
    maxW,
    5,
  );
  y += 4;
  y = addWrappedText(
    doc,
    `Canonical narrative body SHA-256 (pre-PDF composite): ${input.compositeBodySha256}`,
    M,
    y,
    maxW,
    5,
  );
  y += 4;
  y = addWrappedText(
    doc,
    "Cryptographic digest of this PDF file is published in the paired WORM manifest and AuditLog entry " +
      "(action GOVERNANCE_ACHIEVEMENT_LOG).",
    M,
    y,
    maxW,
    5,
  );
  y += 6;

  doc.setFontSize(11);
  doc.text("Forensic storage (WORM target)", M, y);
  y += 6;
  doc.setFontSize(9);
  y = addWrappedText(
    doc,
    `Designated immutable object URI: ${input.wormTargetGsUri}. ` +
      `Operational mirror: local WORM-class path under application storage (see Governance achievement log).`,
    M,
    y,
    maxW,
    4,
  );
  y += 8;

  doc.setFillColor(236, 253, 245);
  doc.roundedRect(M, y, maxW, 28, 2, 2, "F");
  doc.setTextColor(6, 78, 59);
  doc.setFontSize(10);
  y += 6;
  y = addWrappedText(doc, SUSTAINABILITY_ACHIEVEMENT_GAVEL_ATTESTATION, M + 4, y, maxW - 8, 4.5);
  y += 8;
  doc.setTextColor(40, 40, 50);

  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.text("Ironscribe (Agent 5) · Investor-grade ESG narrative · Ironframe GRC", M, pageH - 10);

  const buf = doc.output("arraybuffer") as ArrayBuffer;
  return new Uint8Array(buf);
}
