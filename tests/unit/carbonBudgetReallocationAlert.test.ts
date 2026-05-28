import { describe, expect, it, vi } from "vitest";
import { DEFAULT_MONTHLY_CARBON_BUDGET_THRESHOLD_CENTS } from "@/app/config/ironbloomCarbonBudget";
import { runCarbonBudgetReallocationAlertIfDue } from "@/app/services/ironbloom/carbonBudgetReallocationAlert";

vi.mock("@/app/lib/ironbloom/productionCarbonLedger", () => ({
  aggregateMonthlyProductionMitigatedValueCents: vi.fn(),
}));

vi.mock("@/lib/auditLogLoose", () => ({
  auditLogCreateLoose: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    cronJobArtifact: {
      findMany: vi.fn(async () => []),
      create: vi.fn(async () => ({ id: "artifact-1" })),
    },
  },
}));

import { aggregateMonthlyProductionMitigatedValueCents } from "@/app/lib/ironbloom/productionCarbonLedger";

describe("carbon budget reallocation alert", () => {
  it("skips when not UTC day 1 without force", async () => {
    const result = await runCarbonBudgetReallocationAlertIfDue({
      asOf: new Date("2026-05-15T09:00:00.000Z"),
    });
    expect(result.ok).toBe(true);
    if (result.ok && result.skipped) {
      expect(result.reason).toContain("day 1");
    }
  });

  it("alerts when monthly mitigated cents exceed threshold on day 1", async () => {
    vi.mocked(aggregateMonthlyProductionMitigatedValueCents).mockResolvedValue(
      DEFAULT_MONTHLY_CARBON_BUDGET_THRESHOLD_CENTS + 100n,
    );

    const result = await runCarbonBudgetReallocationAlertIfDue({
      force: true,
      asOf: new Date("2026-06-01T09:00:00.000Z"),
    });

    expect(result.ok).toBe(true);
    if (result.ok && !result.skipped) {
      expect(result.alerted).toBe(true);
      expect(result.monthKey).toBe("2026-06");
    }
  });

  it("skips when mitigated cents are within threshold", async () => {
    vi.mocked(aggregateMonthlyProductionMitigatedValueCents).mockResolvedValue(1000n);

    const result = await runCarbonBudgetReallocationAlertIfDue({
      force: true,
      asOf: new Date("2026-06-01T09:00:00.000Z"),
    });

    expect(result.ok).toBe(true);
    if (result.ok && result.skipped) {
      expect(result.reason).toContain("within threshold");
    }
  });
});
