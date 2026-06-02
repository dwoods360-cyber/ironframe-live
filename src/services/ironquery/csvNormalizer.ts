import "server-only";

export type CsvScalar = string | bigint | number | boolean | null | undefined;
export type CsvRow = Record<string, CsvScalar>;

export type NormalizeCsvPayloadOptions = {
  /**
   * Explicit schema lock. When omitted, keys are resolved alphabetically across all rows.
   */
  columnOrder?: string[];
};

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function escapeCsvValue(value: string): string {
  const escaped = value.replace(/"/g, '""');
  if (/[",\n]/.test(escaped)) {
    return `"${escaped}"`;
  }
  return escaped;
}

function renderCsvScalar(column: string, value: CsvScalar): string {
  if (value == null) return "";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") {
    if (!Number.isInteger(value)) {
      throw new Error(`EPIC_16_CSV_FLOAT_BLOCKED: Non-integer value in column "${column}".`);
    }
    return value.toString();
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  return normalizeLineEndings(value);
}

function resolveColumnOrder(rows: CsvRow[], explicitOrder?: string[]): string[] {
  if (explicitOrder && explicitOrder.length > 0) {
    return explicitOrder.map((column) => column.trim()).filter(Boolean);
  }
  const columns = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      columns.add(key);
    }
  }
  return [...columns].sort((a, b) => a.localeCompare(b));
}

/**
 * Deterministic CSV normalizer:
 * - stable column order (explicit or alphabetical)
 * - LF-only line endings
 * - UTF-8 safe output without BOM
 * - integer-only numeric serialization (BigInt/integers only)
 */
export function normalizeCsvPayload(rows: CsvRow[], options: NormalizeCsvPayloadOptions = {}): string {
  const columnOrder = resolveColumnOrder(rows, options.columnOrder);
  const lines: string[] = [];
  lines.push(columnOrder.map((column) => escapeCsvValue(column)).join(","));

  for (const row of rows) {
    const values = columnOrder.map((column) => {
      const rendered = renderCsvScalar(column, row[column]);
      return escapeCsvValue(rendered);
    });
    lines.push(values.join(","));
  }

  return normalizeLineEndings(lines.join("\n"));
}
