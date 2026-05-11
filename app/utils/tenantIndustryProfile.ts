/**
 * Maps `Tenant.industry` codes (seed / DB) → Industry Profile dropdown labels (Strategic Intel).
 */
export function tenantIndustryCodeToProfileLabel(industry: string | null | undefined): string {
  const u = (industry ?? "").trim().toUpperCase();
  switch (u) {
    case "DEFENSE":
      return "Defense";
    case "FEDERAL_GOVERNMENT":
      return "Federal Government";
    case "AEROSPACE":
      return "Aerospace";
    case "STATE_LOCAL":
      return "State & Local";
    case "PUBLIC_SECTOR":
      return "Public Sector";
    case "HEALTHCARE":
      return "Healthcare";
    case "FINANCE":
      return "Finance";
    case "TECHNOLOGY":
      return "Technology";
    case "MANUFACTURING":
      return "Manufacturing";
    case "RETAIL":
      return "Retail";
    case "INFRASTRUCTURE":
    case "ENERGY":
      return "Infrastructure";
    default:
      return "Healthcare";
  }
}
