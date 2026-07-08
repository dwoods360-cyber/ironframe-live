export const EPIC_12_THREAT_EVENT_WORM_VIOLATION_MESSAGE =
  "CRITICAL COMPLIANCE VIOLATION: ThreatEvent log records are protected by immutable WORM storage rules under DORA Pillar 5. Deletion or modification is strictly barred.";

const BLOCKED_THREAT_EVENT_ACTIONS = new Set([
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "upsert",
]);

/** True when ThreatEvent mutations must fail closed (Epic 12 / DORA Pillar 5). */
export function threatEventWormGuardActive(): boolean {
  if (process.env.IRONFRAME_WORM_THREAT_EVENT_BYPASS === "1") {
    return false;
  }
  if (process.env.IRONFRAME_WORM_THREAT_EVENT_ENFORCED === "1") {
    return true;
  }
  const wormLockRaw = process.env.EVIDENCE_WORM_OBJECT_LOCK?.trim().toLowerCase();
  const wormEnforcementEnabled =
    wormLockRaw !== "0" && wormLockRaw !== "false" && wormLockRaw !== "off";
  const strictWormStorage =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1" ||
    process.env.EVIDENCE_WORM_STRICT === "1";
  return wormEnforcementEnabled && strictWormStorage;
}

export function isBlockedThreatEventWormAction(action: string): boolean {
  return BLOCKED_THREAT_EVENT_ACTIONS.has(action);
}

/** Immutable audit label for the single gateway that may mutate ThreatEvent rows under WORM. */
export function buildWormAuditedBypassLabel(
  threatId: string,
  eventType: string,
  detail?: string,
): string {
  const suffix = detail?.trim() ? ` — ${detail.trim()}` : "";
  return `[WORM AUDITED BYPASS] ThreatEvent ${threatId} via ${eventType}${suffix}`;
}
