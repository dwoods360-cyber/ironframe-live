import { ACTIVE_THREAT_VICTORY_LAP_MS } from "@/app/utils/activeThreatLifecycleBridge";
import type { RiskDeckCardItem } from "@/app/types/riskCard";
import type { RiskRegistryRecord } from "@/app/types/riskLifecycle";

/** RESOLVED rows linger on the active stack for this window (matches Active Risks victory lap). */
export const RISK_REGISTRY_RESOLVED_LINGER_MS = ACTIVE_THREAT_VICTORY_LAP_MS;

const REGISTRY_CARD_ID_PREFIX = "registry-";

/** Operational deck cards only — never HTML input placeholders. */
export function isLegitimateRegistryRecord(row: RiskRegistryRecord): boolean {
  const id = row.id?.trim();
  if (!id || id.length < 8) return false;
  return true;
}

export function registryDeckCardId(recordId: string): string {
  return `${REGISTRY_CARD_ID_PREFIX}${recordId.trim()}`;
}

export function isLegitimateRegistryDeckCard(
  card: RiskDeckCardItem,
  record: RiskRegistryRecord,
): boolean {
  if (!isLegitimateRegistryRecord(record)) return false;
  return card.id === registryDeckCardId(record.id);
}

/** ISO instant when the row entered RESOLVED (server: `updatedAt` on transition). */
export function resolvedAtForRegistryRecord(record: RiskRegistryRecord): string | null {
  if (record.lifecycleStatus !== "RESOLVED") return null;
  const explicit = record.resolvedAt?.trim();
  if (explicit) return explicit;
  const updated = record.updatedAt?.trim();
  if (updated) return updated;
  const created = record.createdAt?.trim();
  return created || null;
}

/**
 * Safety net: stamp a stable `resolvedAt` when the row is RESOLVED but the server omitted it.
 * Prevents eternal stickiness (blocked purge) and zero-linger flicker.
 */
export function ensureResolvedAtStamped(record: RiskRegistryRecord): RiskRegistryRecord {
  if (record.lifecycleStatus !== "RESOLVED") return record;
  if (record.resolvedAt?.trim()) return record;
  const fallback = record.updatedAt?.trim() || record.createdAt?.trim() || new Date().toISOString();
  return { ...record, resolvedAt: fallback };
}

export function isWithinResolvedLingerWindow(
  resolvedAtIso: string | null | undefined,
  nowMs = Date.now(),
  windowMs = RISK_REGISTRY_RESOLVED_LINGER_MS,
): boolean {
  const iso = resolvedAtIso?.trim();
  if (!iso) return false;
  const resolvedMs = Date.parse(iso);
  if (!Number.isFinite(resolvedMs)) return false;
  const elapsed = nowMs - resolvedMs;
  return elapsed >= 0 && elapsed < windowMs;
}

export function isActiveStackEligible(
  record: RiskRegistryRecord,
  nowMs = Date.now(),
): boolean {
  if (!isLegitimateRegistryRecord(record)) return false;
  if (record.lifecycleStatus === "ACTIVE") return true;
  if (record.lifecycleStatus === "RESOLVED") {
    const stamped = ensureResolvedAtStamped(record);
    const anchor = resolvedAtForRegistryRecord(stamped) ?? new Date(nowMs).toISOString();
    return isWithinResolvedLingerWindow(anchor, nowMs);
  }
  return false;
}
