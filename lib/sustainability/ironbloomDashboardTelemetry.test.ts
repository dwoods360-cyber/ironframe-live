import { describe, expect, it } from "vitest";

import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import {
  buildCarbonTraceFromStream,
  energyKwhForLedgerZone,
  mitigatedValueCentsFromCarbonTrace,
  parseThreatIngestionTelemetry,
} from "@/lib/sustainability/ironbloomDashboardTelemetry";
import { IRONBLOOM_PHYSICAL_UNIT } from "@/lib/sustainability/ironbloom";

describe("ironbloomDashboardTelemetry", () => {
  it("parses threat ingestionDetails JSON into a regional grid trace", () => {
    const trace = buildCarbonTraceFromStream({
      tenantId: TENANT_UUIDS.gridcore,
      tenantKey: "gridcore",
      body: parseThreatIngestionTelemetry(JSON.stringify({ kwh: 1200, zone: "US-CO" })),
    });
    expect(trace).not.toBeNull();
    expect(trace!.physicalUnit).toBe(IRONBLOOM_PHYSICAL_UNIT.KWH);
    expect(trace!.physicalQuantity).toBe(1200);
    expect(trace!.gridIntensityGco2PerKwh).toBe(445);
    expect(trace!.carbonGramsCo2e).toBe(534_000n);
  });

  it("returns null when ingestion has no physical units", () => {
    expect(
      buildCarbonTraceFromStream({
        tenantId: TENANT_UUIDS.medshield,
        tenantKey: "medshield",
        body: { expenseUsd: 50_000 },
      }),
    ).toBeNull();
  });

  it("assigns tenant aggregate kWh only to the matching electricity maps zone", () => {
    expect(
      energyKwhForLedgerZone({
        zone: "US-CO",
        tenantKey: "gridcore",
        aggregateKwhAverted: 5000n,
      }),
    ).toBe(5000n);
    expect(
      energyKwhForLedgerZone({
        zone: "US-NEIS",
        tenantKey: "gridcore",
        aggregateKwhAverted: 5000n,
      }),
    ).toBe(0n);
  });

  it("computes mitigated cents from normalized carbon trace via ICP", () => {
    const trace = buildCarbonTraceFromStream({
      tenantId: TENANT_UUIDS.gridcore,
      tenantKey: "gridcore",
      body: { kwh: 500 },
    });
    expect(trace).not.toBeNull();
    const cents = mitigatedValueCentsFromCarbonTrace(trace!);
    expect(cents).toBe((500n * 445n * 8500n) / 1_000_000n);
  });
});
