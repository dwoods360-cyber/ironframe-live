/**
 * Single source of truth for GRC report categories and compliance frameworks.
 * IDs are stable keys for Zustand (`activeFrameworkIds`) and routing.
 */

export type GrcCategoryId =
  | "HEALTHCARE"
  | "FINANCIAL"
  | "ENERGY"
  | "GLOBAL_PRIVACY"
  | "CLOUD_TECH"
  | "DEFENSE_PUBLIC";

export type GrcFrameworkItem = {
  /** Unique across all categories — use with `useRiskStore` `toggleFramework`. */
  id: string;
  label: string;
  href: string;
};

export type GrcFrameworkCategory = {
  id: GrcCategoryId;
  /** Short heading (uppercase) for section titles */
  title: string;
  frameworks: readonly GrcFrameworkItem[];
};

export const GRC_FRAMEWORK_CATEGORIES: readonly GrcFrameworkCategory[] = [
  {
    id: "HEALTHCARE",
    title: "HEALTHCARE",
    frameworks: [
      { id: "HEALTHCARE:hipaa", label: "HIPAA", href: "/reports/hipaa-audit" },
      { id: "HEALTHCARE:patient-data-access", label: "Patient Data Access", href: "/reports/patient-data-access" },
      { id: "HEALTHCARE:hitech-security", label: "HITECH Security", href: "/reports/hitech-security" },
      { id: "HEALTHCARE:ehr-integrity", label: "EHR Integrity", href: "/reports/ehr-integrity" },
    ],
  },
  {
    id: "FINANCIAL",
    title: "FINANCIAL",
    frameworks: [
      { id: "FINANCIAL:pci-dss-level-1", label: "PCI-DSS Level 1", href: "/reports/pci-dss-level-1" },
      { id: "FINANCIAL:swift-connectivity", label: "SWIFT Connectivity", href: "/reports/swift-connectivity" },
      { id: "FINANCIAL:sox-controls", label: "SOX Controls", href: "/reports/sox-controls" },
      { id: "FINANCIAL:aml-trace", label: "AML Trace", href: "/reports/aml-trace" },
      { id: "FINANCIAL:dora-eu-resilience", label: "DORA (EU Resilience)", href: "/reports/dora-eu-resilience" },
    ],
  },
  {
    id: "ENERGY",
    title: "ENERGY",
    frameworks: [
      { id: "ENERGY:nerc-cip-asset-list", label: "NERC CIP Asset List", href: "/reports/nerc-cip-asset-list" },
      { id: "ENERGY:scada-traffic", label: "SCADA Traffic", href: "/reports/scada-traffic" },
      { id: "ENERGY:fema-resilience", label: "FEMA Resilience", href: "/reports/fema-resilience" },
      { id: "ENERGY:gridex-vii", label: "GridEx VII", href: "/reports/gridex-vii" },
    ],
  },
  {
    id: "GLOBAL_PRIVACY",
    title: "GLOBAL PRIVACY",
    frameworks: [
      { id: "GLOBAL_PRIVACY:gdpr-eu", label: "GDPR (EU)", href: "/reports/gdpr-eu" },
      { id: "GLOBAL_PRIVACY:iso-iec-27001", label: "ISO/IEC 27001", href: "/reports/iso-iec-27001" },
      { id: "GLOBAL_PRIVACY:ccpa-cpra", label: "CCPA / CPRA", href: "/reports/ccpa-cpra" },
      { id: "GLOBAL_PRIVACY:csrd-sustainability", label: "CSRD (Sustainability)", href: "/reports/csrd-sustainability" },
    ],
  },
  {
    id: "CLOUD_TECH",
    title: "CLOUD & TECH",
    frameworks: [
      { id: "CLOUD_TECH:soc2-type-ii", label: "SOC 2 Type II", href: "/reports/soc2-type-ii" },
      { id: "CLOUD_TECH:fedramp", label: "FedRAMP", href: "/reports/fedramp" },
      { id: "CLOUD_TECH:nist-csf-2", label: "NIST CSF 2.0", href: "/reports/nist-csf-2" },
    ],
  },
  {
    id: "DEFENSE_PUBLIC",
    title: "DEFENSE & PUBLIC",
    frameworks: [
      { id: "DEFENSE_PUBLIC:cmmc-2", label: "CMMC 2.0", href: "/reports/cmmc-2" },
      { id: "DEFENSE_PUBLIC:nist-800-53", label: "NIST 800-53", href: "/reports/nist-800-53" },
      { id: "DEFENSE_PUBLIC:itar-controls", label: "ITAR Controls", href: "/reports/itar-controls" },
    ],
  },
] as const;

/** All valid `GrcFrameworkItem.id` values (for tests / validation). */
export const ALL_GRC_FRAMEWORK_IDS: readonly string[] = GRC_FRAMEWORK_CATEGORIES.flatMap((c) =>
  c.frameworks.map((f) => f.id),
);
