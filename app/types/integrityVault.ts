export type WorkforceLkgStatus = "LKG_VERIFIED" | "NO_MANIFEST_ENTRY" | "VAULT_UNREACHABLE";

export type LkgWorkforceRow = {
  name: string;
  sha256: string | null;
  status: WorkforceLkgStatus;
};

export type IntegrityVaultSnapshot = {
  ok: boolean;
  manifestPath: string;
  checkpointRoot: string;
  error?: string;
  verifiedAt: string | null;
  agents: LkgWorkforceRow[];
};

/** Shadow-directory personas for Integrity Hub Tier 3 (not production users). */
export type IntegrityHubSyntheticTarget = {
  id: string;
  name: string;
  email: string;
  role: string;
  clearanceLevel: number;
  vulnerabilityScore: number;
  /** USD cents as decimal string (BigInt-safe over the wire). */
  monetaryValueCents: string;
  totalLossIncurredCents: string;
  lastAttackedAt: string | null;
  /** Level-5 VIP lab hardening (PhishBot halved vulnerability on hook rolls). */
  isHardened: boolean;
  /** Shadow-plane compromise marker for row-level restore controls. */
  isBreached: boolean;
  /** Persona runtime security state in the shadow plane. */
  status: "PROTECTED" | "BREACHED";
};

/** InfilBot (09) / PhishBot (10) armed state from open non-RESOLVED simulator threats (DB truth). */
export type IntegrityHubShadowArmState = {
  infiltrBotSimActive: boolean;
  phishBotSimActive: boolean;
};
