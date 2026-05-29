import { describe, expect, it, vi } from "vitest";
import {
  getDefaultCarbonIntensityGco2ForTenant,
  tenantKeyFromElectricityMapZone,
} from "@/app/config/tenantCarbonZones";
import {
  FALLBACK_CARBON_INTENSITY,
  buildForensicFallbackQuote,
  jitterForensicCarbonIntensity,
} from "@/app/services/ironbloom/rateEngine";
import { isSimulationThreatForCsrdExport } from "@/app/lib/ironbloom/productionCarbonLedger";
import {
  computeMitigatedValueCentsFromIcp,
  fetchLiveCarbonIntensity,
  INTERNAL_CARBON_PRICE_CENTS_PER_TON,
  sealMitigatedValueCents,
} from "@/app/services/ironbloom/scoring";
import { executeGridcoreCarbonLedgerSync } from "@/app/services/ironbloom/gridcoreCarbonLedgerSync";
import { executeGridcoreRatePoll } from "@/src/services/ironbloom/gridcoreRatePoll";
import { readGridcoreCarbonLedgerState } from "@/app/lib/ironbloom/gridcoreCarbonLedgerState";
import { computeLedgerCarbonAleCents } from "@/app/utils/sustainabilityLedgerAle";

describe("ironbloom carbon telemetry", () => {
  it("maps electricity maps zone back to tenant for location defaults", () => {
    expect(tenantKeyFromElectricityMapZone("US-CO")).toBe("gridcore");
    expect(getDefaultCarbonIntensityGco2ForTenant("gridcore")).toBe(445);
  });

  it("computes mitigatedValueCents from ICP ($85/t) with BigInt precision", () => {
    expect(INTERNAL_CARBON_PRICE_CENTS_PER_TON).toBe(8500n);
    const cents = computeMitigatedValueCentsFromIcp(500n, 380n);
    expect(cents).toBe((500n * 380n * 8500n) / 1_000_000n);
    expect(cents).toBe(1615n);
  });

  it("seals mitigatedValueCents as non-negative BigInt with digest", () => {
    const sealed = sealMitigatedValueCents({
      mitigatedValueCents: 11500n,
      tenantKey: "medshield",
      unitsKwh: 2500,
      zone: "US-NEIS",
      carbonIntensityGco2PerKwh: 400,
    });
    expect(sealed.mitigatedValueCents).toBe(11500n);
    expect(sealed.sealDigest).toHaveLength(64);
  });

  it("jitter stays within ±2.5% of US-MN forensic anchor", () => {
    const min = FALLBACK_CARBON_INTENSITY * 0.975;
    const max = FALLBACK_CARBON_INTENSITY * 1.025;
    for (let i = 0; i < 40; i++) {
      const v = jitterForensicCarbonIntensity();
      expect(v).toBeGreaterThanOrEqual(min - 0.1);
      expect(v).toBeLessThanOrEqual(max + 0.1);
    }
  });

  it("buildForensicFallbackQuote tags FORENSIC_FALLBACK source", () => {
    const q = buildForensicFallbackQuote("US-MIDW-MISO");
    expect(q.source).toBe("FORENSIC_FALLBACK");
    expect(q.zone).toBe("US-MIDW-MISO");
    expect(q.carbonIntensityGco2PerKwh).toBeGreaterThan(0);
  });

  it("fetchLiveCarbonIntensity uses forensic fallback when API key is unset", async () => {
    const prior = process.env.ELECTRICITY_MAPS_API_KEY;
    vi.stubEnv("ELECTRICITY_MAPS_API_KEY", "");
    try {
      const q = await fetchLiveCarbonIntensity("US-MIDW-MISO", "medshield");
      expect(q.source).toBe("FORENSIC_FALLBACK");
      expect(q.carbonIntensityGco2PerKwh).toBeGreaterThanOrEqual(FALLBACK_CARBON_INTENSITY * 0.975);
      expect(q.carbonIntensityGco2PerKwh).toBeLessThanOrEqual(FALLBACK_CARBON_INTENSITY * 1.025);
      expect(q.transparencyLabel).toBe("[ESTIMATED: REGIONAL_AVG]");
    } finally {
      if (prior === undefined) {
        vi.unstubAllEnvs();
      } else {
        vi.stubEnv("ELECTRICITY_MAPS_API_KEY", prior);
      }
    }
  });

  it("computeLedgerCarbonAleCents uses ICP $85/t BigInt path", () => {
    const cents = computeLedgerCarbonAleCents([
      { energyConsumedKwh: "25000", carbonIntensityGrams: "412" },
    ]);
    expect(cents).toBe((25000n * 412n * 8500n) / 1_000_000n);
  });

  it("executeGridcoreRatePoll re-exports carbon ledger sync from src/services", async () => {
    expect(executeGridcoreRatePoll).toBe(executeGridcoreCarbonLedgerSync);
  });

  it("executeGridcoreCarbonLedgerSync writes roster zones under staging fallback", async () => {
    const prior = process.env.ELECTRICITY_MAPS_API_KEY;
    vi.stubEnv("ELECTRICITY_MAPS_API_KEY", "mock_staging_key");
    try {
      const result = await executeGridcoreCarbonLedgerSync();
      expect(result.status).toBe("GRIDCORE_LEDGER_SYNCHRONIZED");
      expect(result.recordsIngested).toBeGreaterThanOrEqual(3);
      expect(result.stagingFallback).toBe(true);
      const state = await readGridcoreCarbonLedgerState();
      expect(state.coefficients.length).toBeGreaterThanOrEqual(3);
      expect(state.coefficients.some((c) => c.zone === "US-CO")).toBe(true);
      expect(state.coefficients[0]?.telemetryFingerprint).toHaveLength(64);
    } finally {
      if (prior === undefined) vi.unstubAllEnvs();
      else vi.stubEnv("ELECTRICITY_MAPS_API_KEY", prior);
    }
  });

  it("excludes chaos simulation threats from CSRD production export", () => {
    expect(
      isSimulationThreatForCsrdExport({
        sourceAgent: "KIMBOT",
        ingestionDetails: JSON.stringify({ isChaosTest: true }),
      }),
    ).toBe(true);
    expect(
      isSimulationThreatForCsrdExport({
        sourceAgent: "IRONSIGHT",
        ingestionDetails: JSON.stringify({ source: "production" }),
      }),
    ).toBe(false);
  });
});
