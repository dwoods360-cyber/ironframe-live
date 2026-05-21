import { parseChaosScenarioFromIngestion } from "@/app/utils/forensicAttestation";
import { systemIntegrityDrillFromTitle } from "@/app/utils/riskCardEnrichment";

/**
 * GRC Chaos: mandatory “Discovery” window (product: **3–4s**, here **4000ms**) before a shadow-plane Chaos row
 * is eligible for the Active board or ACK→`CONFIRMED`. Pipeline / Attack Velocity shows the card during this interval.
 */
export const CHAOS_DISCOVERY_HOLD_MS = 4000;

/** L4 — dwell on Attack Velocity before server drill promotes to Active (~1s). */
export const REMOTE_SUPPORT_ATTACK_VELOCITY_MS = 1000;

/**
 * L4 — keep the card on Attack Velocity through drill + handoff (hold + fast stages), even when status is `MITIGATED`.
 */
export const REMOTE_SUPPORT_L4_PIPELINE_VISIBLE_MS =
  REMOTE_SUPPORT_ATTACK_VELOCITY_MS + 600;

export function chaosDiscoveryEligibleBefore(): Date {
  return new Date(Date.now() - CHAOS_DISCOVERY_HOLD_MS);
}

export function isChaosThreatIdentifiedPipelineRow(t: {
  threatStatus?: string;
  ingestionDetails?: string;
  industry?: string;
}): boolean {
  const st = (t.threatStatus ?? "").trim().toUpperCase();
  if (st && st !== "IDENTIFIED") return false;
  if ((t.industry ?? "").trim().toUpperCase() === "CHAOSLAB") return true;
  const raw = (t.ingestionDetails ?? "").trim();
  if (!raw) return false;
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    if (j.isChaosTest === true) return true;
    if (j.incident_type === "CHAOS") return true;
    if (j.category === "INFRASTRUCTURE") return true;
    if (typeof j.entityType === "string" && String(j.entityType).toUpperCase().includes("CHAOS")) return true;
  } catch {
    return /chaos_drill|ischaostest|"isChaosTest":\s*true/i.test(raw);
  }
  return false;
}

/** True while the Chaos row is still in the Risk Ingestion / Attack Velocity discovery window. */
export function isChaosInDiscoveryWindow(t: {
  threatStatus?: string;
  ingestionDetails?: string;
  industry?: string;
  createdAt?: string;
}): boolean {
  if (!isChaosThreatIdentifiedPipelineRow(t)) return false;
  const raw = (t.createdAt ?? "").trim();
  if (!raw) return false;
  const created = Date.parse(raw);
  if (Number.isNaN(created)) return false;
  return Date.now() - created < CHAOS_DISCOVERY_HOLD_MS;
}

/** Normalize DB `ingestionDetails` (string or JSON) for chaos classification helpers. */
export function chaosIngestionDetailsToPipelineString(d: unknown): string {
  if (d == null) return "";
  if (typeof d === "string") return d;
  try {
    return JSON.stringify(d);
  } catch {
    return "";
  }
}

/**
 * While a Chaos Levels 1–5 style row is still in the discovery window, forbid promotion to `CONFIRMED`
 * (ingest / acknowledge). Keeps the row on Risk Velocity for {@link CHAOS_DISCOVERY_HOLD_MS} (3–4s product window).
 */
export function isRemoteSupportChaosThreat(t: {
  ingestionDetails?: string | null;
}): boolean {
  return parseChaosScenarioFromIngestion(t.ingestionDetails ?? null) === "REMOTE_SUPPORT";
}

function threatCreatedMs(createdAt?: string): number | null {
  const raw = (createdAt ?? "").trim();
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

/** L4 Attack Velocity lane — time-based so MITIGATED (post-drill) does not flash off early. */
export function isInRemoteSupportAttackVelocityWindow(t: {
  threatStatus?: string;
  ingestionDetails?: string | null;
  industry?: string;
  createdAt?: string;
}): boolean {
  if (!isRemoteSupportChaosThreat(t)) return false;
  const st = (t.threatStatus ?? "").trim().toUpperCase();
  if (st === "RESOLVED" || st === "CLOSED_ARCHIVED") return false;
  const created = threatCreatedMs(t.createdAt);
  if (created == null) return false;
  return Date.now() - created < REMOTE_SUPPORT_L4_PIPELINE_VISIBLE_MS;
}

const CHAOS_DRILL_ENTITY_TYPE = "CHAOS_DRILL";

/**
 * Irontech Levels 1–5 dropdown drills (`entityType: CHAOS_DRILL`).
 * Simulation Bots A–C omit this (see `suppressChaosDrillEntityType` in `injectChaosThreatAction`).
 */
/** Control Room Simulation Bots A–C (`systemIntegrityDrillId` / no `CHAOS_DRILL` entity). */
export function isSystemIntegrityDrillThreat(t: {
  ingestionDetails?: string | null;
}): boolean {
  const raw = (t.ingestionDetails ?? "").trim();
  if (!raw) return false;
  try {
    const j = JSON.parse(raw) as {
      systemIntegrityDrillId?: unknown;
      chaosScenarioDisplayLabel?: unknown;
    };
    if (typeof j.systemIntegrityDrillId === "string" && j.systemIntegrityDrillId.trim()) {
      return true;
    }
    const label =
      typeof j.chaosScenarioDisplayLabel === "string" ? j.chaosScenarioDisplayLabel : "";
    if (systemIntegrityDrillFromTitle(label)) return true;
  } catch {
    if (/systemIntegrityDrillId/i.test(raw)) return true;
    if (/System Integrity Drill/i.test(raw) && /ATTBOT|KIMBOT|GRCBOT/i.test(raw)) return true;
  }
  return isChaosMarkedThreat(t) && !isIrontechChaosDrillEntity(t);
}

export function isIrontechChaosDrillEntity(t: {
  ingestionDetails?: string | null;
}): boolean {
  const raw = (t.ingestionDetails ?? "").trim();
  if (!raw) return false;
  try {
    const j = JSON.parse(raw) as { entityType?: unknown; chaosDrillEntityType?: unknown };
    return (
      j.entityType === CHAOS_DRILL_ENTITY_TYPE ||
      j.chaosDrillEntityType === CHAOS_DRILL_ENTITY_TYPE
    );
  } catch {
    return /"entityType"\s*:\s*"CHAOS_DRILL"|"chaosDrillEntityType"\s*:\s*"CHAOS_DRILL"/i.test(
      raw,
    );
  }
}

/** True when ingestion/industry marks an Irontech Chaos Levels 1–5 style drill row. */
export function isChaosMarkedThreat(t: {
  threatStatus?: string;
  ingestionDetails?: string | null;
  industry?: string;
}): boolean {
  if ((t.industry ?? "").trim().toUpperCase() === "CHAOSLAB") return true;
  const raw = (t.ingestionDetails ?? "").trim();
  if (!raw) return false;
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    if (j.isChaosTest === true) return true;
    if (j.incident_type === "CHAOS") return true;
    if (j.category === "INFRASTRUCTURE") return true;
    if (typeof j.entityType === "string" && String(j.entityType).toUpperCase().includes("CHAOS")) {
      return true;
    }
  } catch {
    return /chaos_drill|ischaostest|"isChaosTest":\s*true/i.test(raw);
  }
  return false;
}

/**
 * Attack Velocity may only show Chaos during the brief IDENTIFIED discovery window.
 * MITIGATED/CONFIRMED/RESOLVED chaos belongs on Active Risks (or terminal purge), not the pipeline lane.
 */
export function belongsOnAttackVelocityPipeline(t: {
  threatStatus?: string;
  ingestionDetails?: string | null;
  industry?: string;
  createdAt?: string;
}): boolean {
  const scoped = {
    threatStatus: t.threatStatus,
    industry: t.industry,
    createdAt: t.createdAt,
    ingestionDetails: t.ingestionDetails ?? undefined,
  };
  if (!isChaosMarkedThreat(scoped)) return true;
  /** Simulation Bots A–C — normal Attack Velocity until claim/ack (not Irontech discovery/L4 windows). */
  if (isSystemIntegrityDrillThreat(scoped)) return true;
  if (!isIrontechChaosDrillEntity(scoped)) return true;
  if (isRemoteSupportChaosThreat(scoped)) return isInRemoteSupportAttackVelocityWindow(scoped);
  return isChaosInDiscoveryWindow(scoped);
}

export function chaosAcknowledgeBlockedByDiscoveryHold(params: {
  status: string;
  ingestionDetails: unknown;
  industry?: string | null;
  createdAt: Date;
}): { blocked: true; retryAfterMs: number } | { blocked: false } {
  const ingestionStr =
    chaosIngestionDetailsToPipelineString(params.ingestionDetails ?? undefined) ?? undefined;
  const threatLike = {
    threatStatus: params.status,
    ingestionDetails: ingestionStr,
    industry: params.industry ?? undefined,
    createdAt: params.createdAt.toISOString(),
  };
  if (!isChaosInDiscoveryWindow(threatLike)) return { blocked: false };
  const elapsed = Date.now() - params.createdAt.getTime();
  return { blocked: true, retryAfterMs: Math.max(1, CHAOS_DISCOVERY_HOLD_MS - elapsed) };
}
