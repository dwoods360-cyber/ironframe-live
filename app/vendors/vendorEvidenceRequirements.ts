import type { Industry, VendorType } from "@/app/vendors/schema";
import type { VendorTypeRequirements } from "@/app/store/systemConfigStore";

/** Industries available in manual vendor ingestion (aligned with tenant / simulation sectors). */
export const VENDOR_INDUSTRY_OPTIONS: readonly Industry[] = [
  "Healthcare",
  "Finance",
  "Energy",
  "Technology",
  "Defense",
] as const;

/** Industry-specific evidence supplements (merged with vendor-type baseline). */
export const INDUSTRY_EVIDENCE_SUPPLEMENTS: Record<Industry, string[]> = {
  Healthcare: ["HIPAA BAA", "HITECH attestation"],
  Finance: ["PCI DSS AOC", "SOX ITGC summary"],
  Energy: ["NERC CIP evidence pack", "OT segmentation attestation"],
  Technology: ["SBOM / supply-chain disclosure", "Pen test summary"],
  Defense: ["CMMC SSP excerpt", "DFARS 7012 flow-down"],
};

export function resolveRequiredVendorEvidence(input: {
  vendorType: VendorType;
  industry: Industry;
  vendorTypeRequirements: VendorTypeRequirements;
}): string[] {
  const typeBaseline = input.vendorTypeRequirements[input.vendorType] ?? ["SOC2"];
  const industrySupplement = INDUSTRY_EVIDENCE_SUPPLEMENTS[input.industry] ?? [];
  return Array.from(new Set([...typeBaseline, ...industrySupplement]));
}

export function tenantEntityLabelFromSlug(slug: string | null | undefined): string {
  const normalized = slug?.trim().toLowerCase();
  if (!normalized) return "CORPORATE";
  if (normalized === "medshield") return "MEDSHIELD";
  if (normalized === "vaultbank") return "VAULTBANK";
  if (normalized === "gridcore") return "GRIDCORE";
  return normalized.toUpperCase();
}

const SESSION_PREFIX = "ironframe-vendor-ingest:";

export function loadSessionIngestedVendors(tenantSlug: string | null): import("@/app/vendors/schema").VendorRecord[] {
  if (typeof window === "undefined") return [];
  const key = `${SESSION_PREFIX}${tenantSlug ?? "apex"}`;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as import("@/app/vendors/schema").VendorRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSessionIngestedVendors(
  tenantSlug: string | null,
  vendors: import("@/app/vendors/schema").VendorRecord[],
): void {
  if (typeof window === "undefined") return;
  const key = `${SESSION_PREFIX}${tenantSlug ?? "apex"}`;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(vendors));
  } catch {
    // ignore quota errors in pilot surfaces
  }
}
