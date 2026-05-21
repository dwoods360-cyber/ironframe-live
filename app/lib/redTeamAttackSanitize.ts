import type { AttackDeckCardItem } from "@/app/types/attackRiskCard";
import type { AttackCardProps, AttackCardSeverity } from "@/app/types/redTeamAttackCard";

const PAYLOAD_MAX = 500;

export function trimAttackPayload(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, PAYLOAD_MAX);
}

export function severityFromKimbotLabel(
  label?: string | null,
  score?: number,
): AttackCardSeverity {
  const normalized = (label ?? "").trim().toUpperCase();
  if (normalized === "CRITICAL" || (typeof score === "number" && score >= 80)) return "high";
  if (normalized === "HIGH" || (typeof score === "number" && score >= 50)) return "high";
  if (normalized === "MEDIUM" || (typeof score === "number" && score >= 25)) return "medium";
  return "low";
}

/** Map deck store row → dumb card props (service-layer sanitization). */
export function sanitizeAttackDeckItem(item: AttackDeckCardItem): AttackCardProps {
  const severity: AttackCardSeverity =
    item.phase === "FAILED"
      ? "high"
      : item.phase === "PROCESSING"
        ? "medium"
        : item.processedData.payloadDetails.toUpperCase().includes("CRITICAL")
          ? "high"
          : "medium";

  return {
    id: item.id,
    timestamp: item.registeredAt,
    vector: item.processedData.attackVector.trim().slice(0, 200),
    payload: trimAttackPayload(
      `${item.processedData.payloadDetails} · ${item.processedData.targetAsset} · ${item.processedData.agentId}`,
    ),
    severity,
  };
}
