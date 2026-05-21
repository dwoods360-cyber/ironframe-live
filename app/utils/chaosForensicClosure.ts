import { ACTIVE_THREAT_VICTORY_LAP_MS } from "@/app/utils/activeThreatLifecycleBridge";
import { parseIngestionDetailsForMerge } from "@/app/utils/ingestionDetailsMerge";

/** ISO instant when Irontech chaos forensic gavel closed the row (`chaosDrillResolutionAt`). */
export function parseChaosDrillResolutionAt(
  ingestionDetails?: string | null,
): string | null {
  const raw = ingestionDetails?.trim();
  if (!raw) return null;
  try {
    const j = parseIngestionDetailsForMerge(raw);
    const at = j.chaosDrillResolutionAt;
    return typeof at === "string" && at.trim() ? at.trim() : null;
  } catch {
    return null;
  }
}

export function isChaosForensicClosureLingerActive(
  ingestionDetails?: string | null,
  nowMs = Date.now(),
  windowMs = ACTIVE_THREAT_VICTORY_LAP_MS,
): boolean {
  const at = parseChaosDrillResolutionAt(ingestionDetails);
  if (!at) return false;
  const resolvedMs = Date.parse(at);
  if (!Number.isFinite(resolvedMs)) return false;
  const elapsed = nowMs - resolvedMs;
  return elapsed >= 0 && elapsed < windowMs;
}

export function isChaosForensicGavelClosed(
  ingestionDetails?: string | null,
): boolean {
  return parseChaosDrillResolutionAt(ingestionDetails) != null;
}
