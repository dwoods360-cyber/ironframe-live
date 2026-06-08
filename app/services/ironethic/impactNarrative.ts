import { anonymizeForPublicExport } from "@/src/services/ironscribe/publicFormatter";

/**
 * Ironethic (Agent 18) — qualitative impact copy from quantified TSV (deterministic templates, privacy-safe).
 */
export function draftIronethicImpactStatement(input: {
  avoidedMetricTons: number;
  societalValueCents: bigint;
}): string {
  const tons = Math.max(0, input.avoidedMetricTons);
  const forestAcresEquiv = (tons * 1.15).toFixed(1);
  const communities = Math.max(1, Math.min(24, Math.ceil(tons / 85)));
  const usd = (Number(input.societalValueCents) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return anonymizeForPublicExport(
    `Ironethic synthesis: modeled non-market benefits align with roughly ${forestAcresEquiv} acres of mature U.S. forest ` +
      `CO₂ conservation equivalency and measurable relief for an estimated ${communities} host communities when grid stress is relieved. ` +
      `Consolidated societal footprint of this window: $${usd} TSV (operational + regulatory + EPA SCC layer).`,
  );
}
