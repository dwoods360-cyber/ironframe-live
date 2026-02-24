export type RiskLevel = 'CRITICAL' | 'ELEVATED' | 'ACCEPTABLE';

export function calculateRiskLevel(
  aleCents: bigint,
  thresholdCents: bigint
): RiskLevel {
  // Financial Guardrail
  if (aleCents < 0n || thresholdCents <= 0n) {
    throw new Error("Financial values must be positive integers.");
  }

  if (aleCents > thresholdCents) return 'CRITICAL';
  if (aleCents >= thresholdCents / 2n) return 'ELEVATED';

  return 'ACCEPTABLE';
}
