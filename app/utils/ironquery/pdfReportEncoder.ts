import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { resolveTenantLocationForExport } from "@/app/config/tenantUtilityLocation";
import { formatCentsToAccountingUSD } from "@/app/utils/formatCentsToUSD";
import type { IronqueryAnalystCsvRow } from "@/app/utils/ironquery/csvEncoder";
import { encodeIronqueryAnalystCsv } from "@/app/utils/ironquery/csvEncoder";

const MARGIN_MM = 14;
const PAGE_W_MM = 210;
const HEAD_SLATE: [number, number, number] = [15, 23, 42];
const IRONQUERY_BRAND: [number, number, number] = [30, 58, 138];

const ALLOWED_PHYSICAL_UNITS = new Set<"kWh" | "L" | "km">(["kWh", "L", "km"]);

function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function assertPhysicalUnitForPdf(unitType: string): asserts unitType is "kWh" {
  if (unitType !== "kWh") {
    throw new Error("IRONQUERY_EXPORT_NON_PHYSICAL_UNIT");
  }
  if (!ALLOWED_PHYSICAL_UNITS.has(unitType)) {
    throw new Error("IRONQUERY_EXPORT_NON_PHYSICAL_UNIT");
  }
}

function validateRowsViaCsvContract(rows: readonly IronqueryAnalystCsvRow[]): void {
  encodeIronqueryAnalystCsv(rows);
}

/**
 * Server-side Ironquery analyst pack PDF (binary stream / Uint8Array for HTTP attachment).
 * Financial fields use BigInt cents end-to-end; PDF text uses `.toString()` on cents before layout.
 */
export async function buildIronqueryAnalystPdf(
  rows: readonly IronqueryAnalystCsvRow[],
): Promise<Uint8Array> {
  if (rows.length === 0) {
    throw new Error("IRONQUERY_EXPORT_PDF_EMPTY");
  }

  validateRowsViaCsvContract(rows);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const maxW = PAGE_W_MM - MARGIN_MM * 2;
  let y = 18;

  const primary = rows[0];
  assertPhysicalUnitForPdf(primary.unitType);
  const location = resolveTenantLocationForExport(primary.tenantKey);

  doc.setProperties({
    title: "Ironquery Analyst Pack Export",
    subject: "GRC analyst compliance export",
    keywords: "Ironquery,Ironbloom,ALE,kWh,TAS",
  });

  doc.setFontSize(16);
  doc.setTextColor(...IRONQUERY_BRAND);
  doc.text("Ironquery Analyst Pack", MARGIN_MM, y);
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 70);
  y = addWrappedText(
    doc,
    `Generated: ${primary.generatedAt} · Tenant: ${primary.tenantKey} · Jurisdiction: ${primary.jurisdiction}`,
    MARGIN_MM,
    y,
    maxW,
    4,
  );
  y += 6;
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(11);
  doc.text("Geographic utility context (tenantUtilityLocation)", MARGIN_MM, y);
  y += 6;
  doc.setFontSize(10);
  y = addWrappedText(
    doc,
    `Country: ${location.country} (${location.countryCode}) · ZIP: ${location.zipCode}`,
    MARGIN_MM,
    y,
    maxW,
    5,
  );
  y += 8;

  doc.setFontSize(11);
  doc.text("Financial integrity — ALE baseline (integer cents)", MARGIN_MM, y);
  y += 6;

  const assetTableBody = rows.map((row) => {
    assertPhysicalUnitForPdf(row.unitType);
    const aleCentsText = row.aleBaselineCents.toString();
    const aleUsd = formatCentsToAccountingUSD(row.aleBaselineCents);
    return [
      row.tenantKey,
      row.tenantId,
      aleCentsText,
      aleUsd,
      String(row.rateUsdPerUnit),
      row.unitType,
      row.source,
      row.polledAt,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [
      [
        "Tenant",
        "Tenant UUID",
        "ALE baseline (cents)",
        "ALE baseline (USD)",
        "Utility rate",
        "Physical unit",
        "Rate source",
        "Polled at",
      ],
    ],
    body: assetTableBody,
    margin: { left: MARGIN_MM, right: MARGIN_MM },
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: HEAD_SLATE,
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      2: { font: "courier", fontStyle: "normal" },
    },
  });

  const docWithTable = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  y = (docWithTable.lastAutoTable?.finalY ?? y) + 10;

  doc.setFontSize(9);
  doc.setTextColor(80, 80, 90);
  addWrappedText(
    doc,
    "Ironbloom sustainability binding: utility exposure is expressed only in physical units (kWh). " +
      "ALE values are sourced from immutable BigInt cent integers; no floating-point storage is used in the export contract.",
    MARGIN_MM,
    y,
    maxW,
    4,
  );

  const arrayBuffer = doc.output("arraybuffer");
  return new Uint8Array(arrayBuffer);
}
