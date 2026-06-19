export interface GRCPlaybookTier {
  name: string;
  targetALE: string;
  complianceFrameworks: string[];
  coreValueProposition: string;
}

/**
 * Deterministic B2B Sales Playbook Manifest
 * Aligned perfectly with Ironboard's immutable risk tiering and baselines.
 */
export const GRC_SALES_PLAYBOOK: Record<string, GRCPlaybookTier> = {
  Gridcore: {
    name: "Gridcore Alignment Track",
    targetALE: "4.7M Protected Units",
    complianceFrameworks: ["SOC2", "ISO27001"],
    coreValueProposition:
      "Automated perimeter isolation and continuous token rotation for mid-market utility and infrastructure operators. Eliminates manual control mapping drift.",
  },
  Vaultbank: {
    name: "Vaultbank Financial Track",
    targetALE: "5.9M Protected Units",
    complianceFrameworks: ["PCI-DSS v4.0", "SOC2 Type II", "Sovereign Encryption Metrics"],
    coreValueProposition:
      "Strict BigInt financial calculation verification layer. Guarantees mutation-tested mathematical isolation to eliminate cross-tenant ledger bleed.",
  },
  Medshield: {
    name: "Medshield Enterprise Track",
    targetALE: "11.1M Protected Units",
    complianceFrameworks: ["HIPAA Security Rule", "HITRUST CSF", "GDPR Data Sovereignty"],
    coreValueProposition:
      "Maximal air-gapped data ingestion pipelines with mandatory DMZ sanitization layers (Irongate Agent 14 shielding). Tailored for high-throughput healthcare ecosystems.",
  },
};
