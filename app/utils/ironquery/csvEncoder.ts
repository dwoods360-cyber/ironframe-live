import type { TenantKey } from "@/app/utils/tenantIsolation";

export type IronqueryAnalystCsvRow = {
  tenantId: string;
  tenantKey: TenantKey;
  aleBaselineCents: bigint;
  rateUsdPerUnit: number;
  unitType: "kWh";
  source: string;
  jurisdiction: string;
  polledAt: string;
  generatedAt: string;
};

const CSV_HEADERS = [
  "tenantId",
  "tenantKey",
  "aleBaselineCents",
  "rateUsdPerUnit",
  "unitType",
  "source",
  "jurisdiction",
  "polledAt",
  "generatedAt",
] as const;

function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }
  return value;
}

function validateCsvRow(row: IronqueryAnalystCsvRow): void {
  if (row.unitType !== "kWh") {
    throw new Error("IRONQUERY_EXPORT_NON_PHYSICAL_UNIT");
  }
  if (!Number.isFinite(row.rateUsdPerUnit) || row.rateUsdPerUnit <= 0) {
    throw new Error("IRONQUERY_EXPORT_INVALID_RATE");
  }
}

export function encodeIronqueryAnalystCsv(rows: readonly IronqueryAnalystCsvRow[]): string {
  const lines = [CSV_HEADERS.join(",")];
  for (const row of rows) {
    validateCsvRow(row);
    const cells = [
      row.tenantId,
      row.tenantKey,
      row.aleBaselineCents.toString(),
      String(row.rateUsdPerUnit),
      row.unitType,
      row.source,
      row.jurisdiction,
      row.polledAt,
      row.generatedAt,
    ];
    lines.push(cells.map(escapeCsvCell).join(","));
  }
  return `${lines.join("\n")}\n`;
}
