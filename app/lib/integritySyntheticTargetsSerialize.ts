import type { IntegrityHubSyntheticTarget } from "@/app/types/integrityVault";

type SyntheticEmployeeHubRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  clearanceLevel: number;
  vulnerabilityScore: number;
  monetaryValue: bigint;
  totalLossIncurred: bigint;
  lastAttackedAt: Date | null;
  isHardened: boolean;
  isBreached?: boolean;
  status?: "PROTECTED" | "BREACHED";
};

export function toIntegrityHubSyntheticTarget(row: SyntheticEmployeeHubRow): IntegrityHubSyntheticTarget {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    clearanceLevel: row.clearanceLevel,
    vulnerabilityScore: row.vulnerabilityScore,
    monetaryValueCents: row.monetaryValue.toString(),
    totalLossIncurredCents: row.totalLossIncurred.toString(),
    lastAttackedAt: row.lastAttackedAt?.toISOString() ?? null,
    isHardened: row.isHardened,
    isBreached:
      typeof row.isBreached === "boolean"
        ? row.isBreached
        : row.lastAttackedAt != null || row.totalLossIncurred > 0n,
    status:
      row.status ??
      (row.lastAttackedAt != null || row.totalLossIncurred > 0n
        ? "BREACHED"
        : "PROTECTED"),
  };
}
