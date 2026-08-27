/**
 * Academic lab estimated-exposure math — whole integer cents only.
 * ARO is expressed as milli-occurrences per year (1000 = 1.0/yr) to avoid floats.
 */

export type ExposureBoundsInput = {
  sleMinCents: bigint;
  sleMaxCents: bigint;
  /** Annual rate of occurrence × 1000 (e.g. 250 = 0.25/yr). */
  aroMinMilli: bigint;
  aroMaxMilli: bigint;
};

export type ExposureBoundsResult = {
  estimatedExposureMinCents: bigint;
  estimatedExposureMaxCents: bigint;
  formula: "estimated_exposure_cents = floor(SLE_cents × ARO_milli / 1000)";
  claimHygiene: "estimated_exposure";
};

/** Integer-only SLE × ARO → whole cents (floor toward zero for positive inputs). */
export function estimatedExposureCents(sleCents: bigint, aroMilli: bigint): bigint {
  if (sleCents < 0n || aroMilli < 0n) {
    throw new Error("SLE and ARO must be non-negative whole integers");
  }
  return (sleCents * aroMilli) / 1000n;
}

export function computeExposureBounds(input: ExposureBoundsInput): ExposureBoundsResult {
  if (input.sleMinCents > input.sleMaxCents) {
    throw new Error("SLE min must be ≤ SLE max");
  }
  if (input.aroMinMilli > input.aroMaxMilli) {
    throw new Error("ARO min must be ≤ ARO max");
  }
  return {
    estimatedExposureMinCents: estimatedExposureCents(input.sleMinCents, input.aroMinMilli),
    estimatedExposureMaxCents: estimatedExposureCents(input.sleMaxCents, input.aroMaxMilli),
    formula: "estimated_exposure_cents = floor(SLE_cents × ARO_milli / 1000)",
    claimHygiene: "estimated_exposure",
  };
}

/** Demo float theater — same inputs via Number (may drift); never used for pass. */
export function floatTheaterExposureDollars(
  sleMinCents: number,
  sleMaxCents: number,
  aroMin: number,
  aroMax: number,
): { lowDollars: number; highDollars: number } {
  return {
    lowDollars: (sleMinCents / 100) * aroMin,
    highDollars: (sleMaxCents / 100) * aroMax,
  };
}
