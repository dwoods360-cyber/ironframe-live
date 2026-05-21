import { createHash } from "node:crypto";

export const IRONETHIC_INTEGRITY_SEAL_LABEL = "Ironethic Integrity Seal" as const;

/** Inputs hashed for a reproducible simulation audit ID (same data + salt → same hash). */
export type SimulationSignatureReportData = Record<string, string | number | boolean | null | undefined>;

export type SimulationSignatureResult = {
  /** Product branding for the integrity attestation line. */
  sealLabel: typeof IRONETHIC_INTEGRITY_SEAL_LABEL;
  /** Lowercase hex SHA-256 (salted) — display as the Audit ID / Integrity Seal hash. */
  auditIdHex: string;
};

const DEFAULT_SALT = "ironethic-integrity-seal-v2026.1";

function stableSerialize(data: SimulationSignatureReportData): string {
  const keys = Object.keys(data).sort();
  const ordered: Record<string, unknown> = {};
  for (const k of keys) {
    ordered[k] = data[k] ?? null;
  }
  return JSON.stringify(ordered);
}

/**
 * Salted SHA-256 over canonical report payload — unique Audit ID per simulation run inputs.
 * Set `IRONETHIC_SIMULATION_SIGNATURE_SALT` in production for a deployment-specific salt.
 */
export function generateSimulationSignature(reportData: SimulationSignatureReportData): SimulationSignatureResult {
  const salt = process.env.IRONETHIC_SIMULATION_SIGNATURE_SALT?.trim() || DEFAULT_SALT;
  const payload = stableSerialize(reportData);
  const auditIdHex = createHash("sha256").update(`${salt}|${payload}`, "utf8").digest("hex");

  return {
    sealLabel: IRONETHIC_INTEGRITY_SEAL_LABEL,
    auditIdHex,
  };
}
