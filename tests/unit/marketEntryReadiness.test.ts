import { describe, expect, it, vi, beforeEach } from "vitest";

const { marketProspectFindMany, tenantBillingFindUnique } = vi.hoisted(() => ({
  marketProspectFindMany: vi.fn(),
  tenantBillingFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    marketProspect: { findMany: marketProspectFindMany },
    tenantBilling: { findUnique: tenantBillingFindUnique },
  },
}));

vi.mock("@/app/lib/board/goldenPathLedger", () => ({
  readGoldenPathLedgerSync: () => ({
    version: 1 as const,
    goldenPathConsecutivePasses: 0,
    activeRun: {
      runId: "run2",
      lastExecutedStop: "STOP_3_ALE_COMMITTED" as const,
      operator: "Dereck",
    },
    completedRuns: [],
  }),
}));

import { buildMarketEntryReadiness } from "@/app/lib/board/marketEntryReadiness";

describe("buildMarketEntryReadiness", () => {
  beforeEach(() => {
    marketProspectFindMany.mockReset();
    tenantBillingFindUnique.mockReset();
  });

  it("merges ledger state with live billing blockers and prospect count", async () => {
    tenantBillingFindUnique.mockResolvedValue({
      id: "bill-1",
      tenantSlug: "run2",
      stripeCustomerId: "cus_test",
      status: "PENDING",
      updatedAt: new Date(),
    });
    marketProspectFindMany.mockResolvedValue([
      {
        companyName: "First Interstate BancSystem, Inc.",
        domain: "fibk.com",
        employeeCount: 3376,
        region: "United States",
      },
      {
        companyName: "Synthetic",
        domain: "united-states-ledger.io",
        employeeCount: 24,
        region: "United States",
      },
    ]);

    const readiness = await buildMarketEntryReadiness({ tenantSlug: "run2" });

    expect(readiness.goldenPathConsecutivePasses).toBe(0);
    expect(readiness.currentRunId).toBe("run2");
    expect(readiness.lastExecutedStop).toBe("STOP_3_ALE_COMMITTED");
    expect(readiness.gateBlockers).toContain("BILLING_STATUS_PENDING");
    expect(readiness.gateBlockers).toContain("GOLDEN_PATH_NOT_CERTIFIED");
    expect(readiness.gateBlockers).toContain("EXPORT_ENTITLEMENT_BLOCKED");
    expect(readiness.activeScopeFreeze).toBe(true);
    expect(readiness.ingestedLiveProspectsCount).toBe(1);
    expect(readiness.registrationPosture).toBe("sales-assisted-pilot");
  });
});
