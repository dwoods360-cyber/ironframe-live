/**
 * PhishBot (Agent 10): Bernoulli hook model uses `vulnerabilityScore` in [0, 1] as success rate.
 * Hardened VIPs halve that effective rate during the roll.
 */

export function effectiveVulnerabilityForPhishSuccess(
  vulnerabilityScore: number,
  isHardened: boolean,
): number {
  const v = Math.max(0, Math.min(1, Number.isFinite(vulnerabilityScore) ? vulnerabilityScore : 0));
  return isHardened ? v * 0.5 : v;
}

/** @param rng returns uniform [0, 1); default `Math.random`. */
export function evaluatePhishbotHookSucceeded(
  effectiveVulnerability: number,
  rng: () => number = Math.random,
): boolean {
  const p = Math.max(0, Math.min(1, effectiveVulnerability));
  return rng() < p;
}
