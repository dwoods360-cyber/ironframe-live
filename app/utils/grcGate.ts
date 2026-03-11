/**
 * Iteration 2.1: $10M GRC Ingestion Gate (Backlog Item 2).
 * Shared validation: threats with financial impact >= $10M require 50+ character justification.
 */
const GRC_THRESHOLD_CENTS = 1000000000n;

export function grcGatePass(scoreCents: number | bigint, justification: string): boolean {
  const cents = BigInt(scoreCents);
  if (cents < GRC_THRESHOLD_CENTS) return true;
  return (justification ?? '').trim().length >= 50;
}

export function getGrcThresholdCents(): bigint {
  return GRC_THRESHOLD_CENTS;
}
