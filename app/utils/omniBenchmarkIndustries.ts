/**
 * Strategic Intel Industry Profile + omni seed keys (exact casing/spacing).
 * Order: high-stakes geopolitical sectors first, then commercial cohort.
 */
export const targetIndustries = [
  "Defense",
  "Federal Government",
  "Aerospace",
  "State & Local",
  "Public Sector",
  "Healthcare",
  "Finance",
  "Technology",
] as const;

export const OMNI_BENCHMARK_INDUSTRIES = targetIndustries;

export type OmniBenchmarkIndustry = (typeof targetIndustries)[number];
