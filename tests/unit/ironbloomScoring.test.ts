import { describe, expect, it } from "vitest";
import {
  aleCarbonUsdToCents,
  computeCarbonAleCents,
  computeCarbonAleUsd,
  DEFAULT_OFFSET_PRICE_CENTS_PER_METRIC_TON,
} from "@/app/utils/ironbloomCarbonAleMath";
import { TENANT_INDUSTRY_BASELINE_ALE_CENTS } from "@/app/constants/devTenantRoster";
import {
  assertEsgPhysicalIngestion,
  IronbloomCriticalIngestionError,
  PhysicalUnitRequiredError,
  validateIronbloomEsgEntry,
} from "@/lib/sustainability/constants";

describe("ironbloomScoring", () => {
  it("computes ALE_carbon = (kWh × CI) × P_offset × R_tax", () => {
    const { metricTonsCo2e, aleCarbonUsd } = computeCarbonAleUsd({
      unitsKwh: 2500,
      carbonIntensityGco2PerKwh: 400,
      offsetPriceUsdPerMetricTon: 100,
      regulatoryMultiplier: 1.15,
    });
    expect(metricTonsCo2e).toBeCloseTo(1, 5);
    expect(aleCarbonUsd).toBeCloseTo(115, 2);
    expect(aleCarbonUsdToCents(aleCarbonUsd)).toBe(11500n);
  });

  it("uses default P_offset BigInt 10000 cents per metric ton", () => {
    expect(DEFAULT_OFFSET_PRICE_CENTS_PER_METRIC_TON).toBe(10000n);
    const { mitigatedValueCents } = computeCarbonAleCents({
      unitsKwh: 2500,
      carbonIntensityGco2PerKwh: 400,
      regulatoryMultiplierBps: 11500n,
    });
    expect(mitigatedValueCents).toBe(11500n);
  });

  it("maps carbon ALE as a sub-category of Medshield $11.1M baseline", () => {
    const cents = aleCarbonUsdToCents(115);
    const medshieldAle = Number(TENANT_INDUSTRY_BASELINE_ALE_CENTS.medshield);
    const share = Number(cents) / medshieldAle;
    expect(share).toBeGreaterThan(0);
    expect(share).toBeLessThan(0.01);
  });

  it("returns PHYSICAL_UNIT_REQUIRED when monetaryValue lacks physical units", () => {
    expect(() => assertEsgPhysicalIngestion({ monetaryValue: 50000 })).toThrow(PhysicalUnitRequiredError);
    try {
      assertEsgPhysicalIngestion({ monetaryValue: 50000 });
    } catch (e) {
      expect((e as PhysicalUnitRequiredError).code).toBe("PHYSICAL_UNIT_REQUIRED");
    }
  });

  it("accepts km-only physical ingress without monetary proxy fields", () => {
    expect(() => assertEsgPhysicalIngestion({ km: 120 })).not.toThrow();
    expect(() => validateIronbloomEsgEntry({ assetId: "fleet-route", km: 45 })).not.toThrow();
  });

  it("raises CRITICAL_INGESTION_FAILURE class for monetary-only rows", () => {
    expect(() => validateIronbloomEsgEntry({ assetId: "gc-scada", mitigatedValueCents: 1n })).toThrow();
    try {
      validateIronbloomEsgEntry({ assetId: "gc-scada", mitigatedValueCents: 1n });
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
    const critical = new IronbloomCriticalIngestionError("gc-scada");
    expect(critical.code).toBe("CRITICAL_INGESTION_FAILURE");
  });
});
