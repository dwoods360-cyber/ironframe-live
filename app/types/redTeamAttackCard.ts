export type AttackCardSeverity = "low" | "medium" | "high";

/** Pre-sanitized attack row — produced by ingress/service only, never fetched inside the card. */
export interface AttackCardProps {
  id: string;
  timestamp: string;
  vector: string;
  payload: string;
  severity: AttackCardSeverity;
}
