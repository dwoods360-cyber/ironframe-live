/**
 * GRC Gold — forensic chain of custody (Agent 5 → 6 → 13) parsed from `ingestionDetails` JSON.
 */

export type ForensicCustodyStep = {
  agentId: number;
  phase: string;
  signedAt: string;
};

/** Sentinel in `parseForensicCustodyFromIngestion` — Human Product Owner dissent resolution / seal. */
export const FORENSIC_CUSTODY_PRODUCT_OWNER_AGENT_ID = 99;

type ForensicPathJson = {
  forensicPath?: {
    agent5?: { agentId: number; phase: string; signedAt: string };
    agent6?: { agentId: number; phase: string; signedAt: string };
    agent13?: { agentId: number; phase: string; signedAt: string };
  };
  dissentResolution?: {
    resolvedAt?: string;
    productOwnerProfileName?: string;
    shadowDissentActive?: boolean;
    verificationMethod?: string;
  };
};

export function parseForensicCustodyFromIngestion(
  ingestionDetails: string | null | undefined,
): ForensicCustodyStep[] | undefined {
  const raw = ingestionDetails?.trim();
  if (!raw) return undefined;
  try {
    const j = JSON.parse(raw) as ForensicPathJson;
    const fp = j?.forensicPath;
    if (!fp) return undefined;
    const steps: ForensicCustodyStep[] = [];
    if (fp.agent5?.signedAt) {
      steps.push({
        agentId: fp.agent5.agentId ?? 5,
        phase: fp.agent5.phase ?? "Ingestion",
        signedAt: fp.agent5.signedAt,
      });
    }
    if (fp.agent6?.signedAt) {
      steps.push({
        agentId: fp.agent6.agentId ?? 6,
        phase: fp.agent6.phase ?? "Elevation",
        signedAt: fp.agent6.signedAt,
      });
    }
    if (fp.agent13?.signedAt) {
      steps.push({
        agentId: fp.agent13.agentId ?? 13,
        phase: fp.agent13.phase ?? "Shredding",
        signedAt: fp.agent13.signedAt,
      });
    }
    const dr = j?.dissentResolution;
    if (dr?.resolvedAt) {
      const po = typeof dr.productOwnerProfileName === "string" ? dr.productOwnerProfileName.trim() : "";
      const dissent = dr.shadowDissentActive === true;
      steps.push({
        agentId: FORENSIC_CUSTODY_PRODUCT_OWNER_AGENT_ID,
        phase: dissent
          ? `Dissent resolution — Product Owner override & forensic seal${po ? ` (${po})` : ""}`
          : `Governance seal — Product Owner attestation${po ? ` (${po})` : ""}`,
        signedAt: dr.resolvedAt,
      });
    }
    return steps.length > 0 ? steps : undefined;
  } catch {
    return undefined;
  }
}
