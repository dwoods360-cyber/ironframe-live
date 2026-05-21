import { describe, it, expect } from "vitest";
import {
  millionsNumberToCents,
  computeTotalCurrentRiskCentsRaw,
  getTotalCurrentRiskCentsString,
} from "@/app/utils/riskStoreBigIntMath";

/** Deterministic PRNG for 100-scenario drift checks (Mulberry32). */
function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomMillions(rng: () => number): number {
  const sign = rng() < 0.05 ? -1 : 1;
  const whole = Math.floor(rng() * 5000);
  const fracDigits = Math.floor(rng() * 1e8);
  return sign * (whole + fracDigits / 1e8);
}

function manualTotalCentsString(
  accepted: Record<string, number>,
  dashboard: Record<string, number>,
  riskOffset: number,
): string {
  let sum = 0n;
  for (const v of Object.values(accepted)) sum += millionsNumberToCents(v);
  for (const v of Object.values(dashboard)) sum += millionsNumberToCents(v);
  sum -= millionsNumberToCents(riskOffset);
  const clamped = sum > 0n ? sum : 0n;
  return clamped.toString();
}

describe("riskStore BigInt totals (zero drift)", () => {
  it("matches hand-summed cents on 100 random liability scenarios", () => {
    for (let trial = 0; trial < 100; trial++) {
      const rng = mulberry32(0xdecaf000 + trial);
      const accepted: Record<string, number> = {};
      const dashboard: Record<string, number> = {};
      const nAcc = 1 + Math.floor(rng() * 8);
      const nDash = Math.floor(rng() * 6);
      for (let i = 0; i < nAcc; i++) accepted[`t${i}`] = randomMillions(rng);
      for (let j = 0; j < nDash; j++) dashboard[`d${j}`] = randomMillions(rng);
      const offset = randomMillions(rng);

      const fromUtil = getTotalCurrentRiskCentsString(accepted, dashboard, offset);
      const manual = manualTotalCentsString(accepted, dashboard, offset);
      const drift = BigInt(fromUtil) - BigInt(manual);
      expect(drift, `trial ${trial}`).toBe(0n);
    }
  });

  it("raw total minus manual components has zero rounding error", () => {
    const accepted = { a: 12.34000001, b: 0.00000007 };
    const dashboard = { x: 1.1 };
    const offset = 0.00000003;
    const raw = computeTotalCurrentRiskCentsRaw(accepted, dashboard, offset);
    const piece =
      millionsNumberToCents(12.34000001) +
      millionsNumberToCents(0.00000007) +
      millionsNumberToCents(1.1) -
      millionsNumberToCents(0.00000003);
    expect(raw - piece).toBe(0n);
  });

  it("clamps negative totals to zero cents string", () => {
    expect(getTotalCurrentRiskCentsString({}, {}, 999)).toBe("0");
    expect(
      getTotalCurrentRiskCentsString({ a: 0.001 }, { b: 0.001 }, 1_000_000),
    ).toBe("0");
  });

  it("treats non-finite inputs as zero cents contribution", () => {
    expect(millionsNumberToCents(Number.NaN)).toBe(0n);
    expect(millionsNumberToCents(Number.POSITIVE_INFINITY)).toBe(0n);
    const s = getTotalCurrentRiskCentsString({ x: Number.NaN }, { y: 2.5 }, Number.NaN);
    expect(s).toBe(manualTotalCentsString({ x: Number.NaN }, { y: 2.5 }, Number.NaN));
  });
});
