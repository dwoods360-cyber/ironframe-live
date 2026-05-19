/** Regulatory vault document registry (storage/regulatory-vault + optional Google Drive env). */
export type RegulatoryVaultDocId = "nist_sp_800_137" | "iso_27001_annex_a";

export type RegulatoryVaultDocMeta = {
  id: RegulatoryVaultDocId;
  title: string;
  relativePath: string;
  framework: "NIST" | "ISO";
  envDriveUrlKey?: string;
};

export const REGULATORY_VAULT_DOCS: readonly RegulatoryVaultDocMeta[] = [
  {
    id: "nist_sp_800_137",
    title: "NIST SP 800-137 — ISCM",
    relativePath: "storage/regulatory-vault/nist-sp-800-137.md",
    framework: "NIST",
    envDriveUrlKey: "REGULATORY_VAULT_NIST_800_137_URL",
  },
  {
    id: "iso_27001_annex_a",
    title: "ISO/IEC 27001:2022 Annex A (excerpt)",
    relativePath: "storage/regulatory-vault/iso-27001-annex-a.md",
    framework: "ISO",
    envDriveUrlKey: "REGULATORY_VAULT_ISO_27001_URL",
  },
] as const;

export type NistIsmSectionMapping = {
  nistSectionId: string;
  nistTitle: string;
  nistRequirement: string;
  tasDirectiveIds: string[];
  tasSection: string;
  tasAnchorId: string;
};

/** NIST SP 800-137 Chapter 3/4 → TAS.md directive cross-walk. */
export const NIST_800_137_TAS_MAPPINGS: readonly NistIsmSectionMapping[] = [
  {
    nistSectionId: "3.1",
    nistTitle: "ISCM Strategy",
    nistRequirement: "Define metrics, monitoring frequency, and escalation paths aligned to risk tolerance.",
    tasDirectiveIds: ["ironwave", "ironsight"],
    tasSection: "2",
    tasAnchorId: "agent-2",
  },
  {
    nistSectionId: "3.2",
    nistTitle: "ISCM Program Implementation",
    nistRequirement: "Continuously monitor systems; analyze data; respond via remediation and incident handling.",
    tasDirectiveIds: ["ironlock", "ironwatch", "ironsight"],
    tasSection: "5",
    tasAnchorId: "agent-6",
  },
  {
    nistSectionId: "3.3",
    nistTitle: "ISCM Reporting",
    nistRequirement: "Report security status to officials on a defined cadence with actionable monitoring data.",
    tasDirectiveIds: ["ironcast", "irontally"],
    tasSection: "4.2",
    tasAnchorId: "agent-7",
  },
  {
    nistSectionId: "3.4",
    nistTitle: "ISCM Review and Update",
    nistRequirement: "Review and update ISCM strategy at least annually or upon significant change.",
    tasDirectiveIds: ["irontally", "irontech"],
    tasSection: "4.3",
    tasAnchorId: "tas-irontech-self-healing",
  },
  {
    nistSectionId: "4",
    nistTitle: "ISCM Technical Components",
    nistRequirement: "Asset, vulnerability, configuration, malware, network, IAM, and security event monitoring.",
    tasDirectiveIds: ["irongate", "ironlock", "rls", "ironsight"],
    tasSection: "3",
    tasAnchorId: "tas-dmz-air-gap",
  },
];
