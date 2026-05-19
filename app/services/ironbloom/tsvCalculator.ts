import "server-only";

/**
 * U.S. EPA 2026 Social Cost of Carbon — interim benchmark used in this engine ($190.00 / metric ton CO₂e → cents).
 * PDV and forensic seals cite this as the non-market damage valuation anchor.
 */
export const SOCIAL_COST_OF_CARBON_CENTS = 19000n;

export type SocietalValueBreakdown = {
  sccComponentCents: bigint;
  societalValueCents: bigint;
};

export function computeSccComponentCents(avoidedMetricTons: number): bigint {
  if (!Number.isFinite(avoidedMetricTons) || avoidedMetricTons <= 0) return 0n;
  return BigInt(Math.round(avoidedMetricTons * Number(SOCIAL_COST_OF_CARBON_CENTS)));
}

/**
 * TSV = (avoided tonnes × SCC cents/ton) + internalRoiCents (operational + regulatory VMAT composite).
 */
export function computeTotalSocietalValueCents(
  avoidedMetricTons: number,
  internalRoiCents: bigint,
): SocietalValueBreakdown {
  const sccComponentCents = computeSccComponentCents(avoidedMetricTons);
  return {
    sccComponentCents,
    societalValueCents: sccComponentCents + internalRoiCents,
  };
}
