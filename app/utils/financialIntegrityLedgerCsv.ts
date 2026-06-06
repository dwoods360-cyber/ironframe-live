/**
 * Feature 8 — Whole-Integer Financial Integrity Ledger Matrix (CSV export).
 * Monetary values stay as BigInt cents in storage; USD display uses integer/string split only.
 */

export type FinancialIntegrityLedgerRow = {
  metric_key: string;
  unit: "USD_CENTS" | "BPS" | "CTL_PER_HR" | "TEXT";
  amount_cents: bigint | null;
  bps_value: number | null;
  text_value: string | null;
  carrier_key: string | null;
  framework: string | null;
};

const CSV_COLUMNS = [
  "metric_key",
  "unit",
  "amount_cents",
  "amount_usd",
  "bps_value",
  "text_value",
  "carrier_key",
  "framework",
] as const;

function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }
  return value;
}

/** BigInt cents → decimal USD string without floating-point (e.g. 10000000 → "100000.00"). */
export function formatCentsAsUsdDecimalString(cents: bigint): string {
  const neg = cents < 0n;
  const abs = neg ? -cents : cents;
  const dollars = abs / 100n;
  const frac = abs % 100n;
  const fracStr = frac < 10n ? `0${frac}` : `${frac}`;
  return `${neg ? "-" : ""}${dollars.toString()}.${fracStr}`;
}

function parseCentsInput(raw: string | null | undefined): bigint {
  if (raw == null) return 0n;
  const trimmed = String(raw).trim().replace(/,/g, "");
  if (!trimmed || !/^-?\d+$/.test(trimmed)) return 0n;
  try {
    return BigInt(trimmed);
  } catch {
    return 0n;
  }
}

function renderBps(value: number | null): string {
  if (value == null) return "";
  if (!Number.isInteger(value)) {
    throw new Error("FIN_LEDGER_CSV_FLOAT_BLOCKED: bps_value must be a whole integer.");
  }
  return String(value);
}

export function encodeFinancialIntegrityLedgerCsv(rows: readonly FinancialIntegrityLedgerRow[]): string {
  const lines: string[] = [CSV_COLUMNS.join(",")];

  for (const row of rows) {
    const cents = row.amount_cents;
    const centsCell = cents == null ? "" : cents.toString();
    const usdCell = cents == null ? "" : formatCentsAsUsdDecimalString(cents);
    const cells = [
      row.metric_key,
      row.unit,
      centsCell,
      usdCell,
      renderBps(row.bps_value),
      row.text_value ?? "",
      row.carrier_key ?? "",
      row.framework ?? "",
    ].map((cell) => escapeCsvCell(cell));
    lines.push(cells.join(","));
  }

  return `${lines.join("\n")}\n`;
}

export type BuildFinancialIntegrityLedgerInput = {
  tenantScoped: boolean;
  carrierKey: string;
  framework: string;
  premiumCents: bigint;
  incentive: {
    baseFrameworkDiscountBps: number;
    continuousMonitoringBps: number;
    forensicsBps: number;
    totalDiscountBps: number;
    totalEstimatedSavings_cents: bigint;
  };
  isSimulationMode: boolean;
  complianceVelocity: number | null;
  totalValueMitigatedYtdCents?: string | null;
  carbonMitigatedValueCents?: string | null;
  projectedInsuranceSavingsCents?: string | null;
  generatedAtUtc?: string;
};

export function buildFinancialIntegrityLedgerRows(
  input: BuildFinancialIntegrityLedgerInput,
): FinancialIntegrityLedgerRow[] {
  const framework = input.framework;
  const carrier = input.carrierKey;
  const frozen = !input.tenantScoped;

  const premiumCents = frozen ? 0n : input.premiumCents;
  const savingsCents = frozen ? 0n : input.incentive.totalEstimatedSavings_cents;
  const mitigatedCents = frozen
    ? 0n
    : parseCentsInput(
        input.isSimulationMode
          ? input.totalValueMitigatedYtdCents
          : input.carbonMitigatedValueCents,
      );
  const dashboardSavingsCents = frozen ? 0n : parseCentsInput(input.projectedInsuranceSavingsCents);

  const velocityText =
    input.complianceVelocity != null && Number.isFinite(input.complianceVelocity)
      ? input.complianceVelocity.toFixed(2)
      : null;

  const rows: FinancialIntegrityLedgerRow[] = [
    {
      metric_key: "annual_premium",
      unit: "USD_CENTS",
      amount_cents: premiumCents,
      bps_value: null,
      text_value: null,
      carrier_key: carrier,
      framework,
    },
    {
      metric_key: "projected_renewal_savings",
      unit: "USD_CENTS",
      amount_cents: savingsCents,
      bps_value: null,
      text_value: null,
      carrier_key: carrier,
      framework,
    },
    {
      metric_key: "dashboard_projected_insurance_savings",
      unit: "USD_CENTS",
      amount_cents: dashboardSavingsCents,
      bps_value: null,
      text_value: null,
      carrier_key: carrier,
      framework,
    },
    {
      metric_key: "value_mitigated",
      unit: "USD_CENTS",
      amount_cents: mitigatedCents,
      bps_value: null,
      text_value: input.isSimulationMode ? "simulation_ytd" : "production_carbon_ledger",
      carrier_key: carrier,
      framework,
    },
    {
      metric_key: "framework_discount",
      unit: "BPS",
      amount_cents: null,
      bps_value: frozen ? 0 : input.incentive.baseFrameworkDiscountBps,
      text_value: null,
      carrier_key: carrier,
      framework,
    },
    {
      metric_key: "continuous_monitoring_discount",
      unit: "BPS",
      amount_cents: null,
      bps_value: frozen ? 0 : input.incentive.continuousMonitoringBps,
      text_value: null,
      carrier_key: carrier,
      framework,
    },
    {
      metric_key: "forensics_discount",
      unit: "BPS",
      amount_cents: null,
      bps_value: frozen ? 0 : input.incentive.forensicsBps,
      text_value: null,
      carrier_key: carrier,
      framework,
    },
    {
      metric_key: "total_discount",
      unit: "BPS",
      amount_cents: null,
      bps_value: frozen ? 0 : input.incentive.totalDiscountBps,
      text_value: null,
      carrier_key: carrier,
      framework,
    },
  ];

  if (velocityText != null) {
    rows.push({
      metric_key: "compliance_velocity",
      unit: "CTL_PER_HR",
      amount_cents: null,
      bps_value: null,
      text_value: velocityText,
      carrier_key: carrier,
      framework,
    });
  }

  rows.push({
    metric_key: "export_generated_at",
    unit: "TEXT",
    amount_cents: null,
    bps_value: null,
    text_value: input.generatedAtUtc ?? new Date().toISOString(),
    carrier_key: carrier,
    framework,
  });

  return rows;
}

export function downloadFinancialIntegrityLedgerCsv(
  input: BuildFinancialIntegrityLedgerInput,
  filenamePrefix = "financial-integrity-ledger",
): void {
  const rows = buildFinancialIntegrityLedgerRows(input);
  const csv = encodeFinancialIntegrityLedgerCsv(rows);
  const stamp = (input.generatedAtUtc ?? new Date().toISOString()).slice(0, 10);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filenamePrefix}-${stamp}.csv`;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
