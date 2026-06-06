import { describe, expect, it } from "vitest";
import {
  buildFinancialIntegrityLedgerRows,
  encodeFinancialIntegrityLedgerCsv,
  formatCentsAsUsdDecimalString,
} from "@/app/utils/financialIntegrityLedgerCsv";

describe("formatCentsAsUsdDecimalString", () => {
  it("maps raw BigInt cents to USD decimal strings without float math", () => {
    expect(formatCentsAsUsdDecimalString(10_000_000n)).toBe("100000.00");
    expect(formatCentsAsUsdDecimalString(100n)).toBe("1.00");
    expect(formatCentsAsUsdDecimalString(5n)).toBe("0.05");
    expect(formatCentsAsUsdDecimalString(-250n)).toBe("-2.50");
  });
});

describe("encodeFinancialIntegrityLedgerCsv", () => {
  it("emits whole-integer cents and derived USD columns", () => {
    const rows = buildFinancialIntegrityLedgerRows({
      tenantScoped: true,
      carrierKey: "GENERIC",
      framework: "SOC2",
      premiumCents: 5_000_000n,
      incentive: {
        baseFrameworkDiscountBps: 1000,
        continuousMonitoringBps: 1200,
        forensicsBps: 500,
        totalDiscountBps: 2700,
        totalEstimatedSavings_cents: 135_000n,
      },
      isSimulationMode: true,
      complianceVelocity: 1.25,
      totalValueMitigatedYtdCents: "10000000",
      projectedInsuranceSavingsCents: "135000",
      generatedAtUtc: "2026-06-02T12:00:00.000Z",
    });

    const csv = encodeFinancialIntegrityLedgerCsv(rows);
    expect(csv).toContain("amount_cents,amount_usd");
    expect(csv).toContain("annual_premium,USD_CENTS,5000000,50000.00");
    expect(csv).toContain("value_mitigated,USD_CENTS,10000000,100000.00");
    expect(csv).toContain("framework_discount,BPS,,,1000");
  });
});
