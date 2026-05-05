/**
 * Benchmark / trend charts key off `Tenant.industry`. Empty/null defaults to Healthcare so series never 404 silently.
 */
export function resolveTenantIndustryForBenchmarks(industry: string | null | undefined): string {
  const v = (industry ?? "Healthcare").trim();
  return v || "Healthcare";
}
