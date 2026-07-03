import { describe, expect, it } from "vitest";

import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import {
  computeIronbloomCarbonTrace,
  FUEL_DENSITY_GCO2_PER_LITER,
  INVALID_IRONBLOOM_METRIC_HOURS_OR_MONETARY_ONLY,
  InvalidIronbloomMetricError,
  IRONBLOOM_PHYSICAL_UNIT,
  parseUtilityTelemetryDrop,
  validateIronbloomIngress,
} from "@/lib/sustainability/ironbloom";

describe("ironbloom core", () => {
  it("rejects purely financial variables with INVALID_IRONBLOOM_METRIC_HOURS_OR_MONETARY_ONLY", () => {
    expect(() =>
      validateIronbloomIngress({
        expenseUsd: 50_000,
        monetaryValue: 12_500,
        usdCents: 9_999,
      }),
    ).toThrow(InvalidIronbloomMetricError);

    try {
      validateIronbloomIngress({ mitigatedValueCents: 1_000_000, currency: "USD" });
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidIronbloomMetricError);
      expect((error as InvalidIronbloomMetricError).code).toBe(
        INVALID_IRONBLOOM_METRIC_HOURS_OR_MONETARY_ONLY,
      );
    }
  });

  it("serializes a verified carbon trace for 5000 kWh with tenant-bound grid intensity", () => {
    const tenantId = TENANT_UUIDS.gridcore;
    const trace = computeIronbloomCarbonTrace({
      tenantId,
      tenantKey: "gridcore",
      body: { assetId: "grid-substation-a", kwh: 5000 },
    });

    expect(trace.tenantId).toBe(tenantId);
    expect(trace.physicalUnit).toBe(IRONBLOOM_PHYSICAL_UNIT.KWH);
    expect(trace.physicalQuantity).toBe(5000);
    expect(trace.gridIntensityGco2PerKwh).toBe(445);
    expect(trace.carbonGramsCo2e).toBe(2_225_000n);
    expect(trace.source).toBe("regional_grid");

    const parsed = JSON.parse(trace.serializedTrace) as {
      tenantId: string;
      carbonGramsCo2e: string;
      physicalQuantity: number;
    };
    expect(parsed.tenantId).toBe(tenantId);
    expect(parsed.carbonGramsCo2e).toBe("2225000");
    expect(parsed.physicalQuantity).toBe(5000);
  });

  it("parses utility telemetry text drops into physical units", () => {
    const rows = parseUtilityTelemetryDrop("meter: 5000 kWh\nfleet: 45 km\nfuel: 120 L diesel");
    expect(rows).toEqual([
      { quantity: 5000, unit: "kWh" },
      { quantity: 45, unit: "km" },
      { quantity: 120, unit: "L", fuelCategory: "diesel" },
    ]);
  });

  it("converts liters using fuel density coefficients", () => {
    const tenantId = TENANT_UUIDS.defense;
    const trace = computeIronbloomCarbonTrace({
      tenantId,
      body: { liters: 10, fuelCategory: "diesel" },
    });

    expect(trace.physicalUnit).toBe(IRONBLOOM_PHYSICAL_UNIT.LITERS);
    expect(trace.carbonGramsCo2e).toBe(BigInt(10 * FUEL_DENSITY_GCO2_PER_LITER.diesel));
    expect(trace.source).toBe("fuel_density");
  });
});
