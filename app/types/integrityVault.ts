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
