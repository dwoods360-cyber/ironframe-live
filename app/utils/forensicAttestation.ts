import { CHAOS_DIRECTIVE } from "@/app/config/chaosShadowAudit";

/** GRC forensic gate — neutralize / concurrence / resolution justification (product: 50 chars). */
export const FORENSIC_ATTESTATION_MIN = 50;

const SYSTEM_GRC_ACK_DIRECTIVE = CHAOS_DIRECTIVE.FINAL_GRC_ACK;

export function meetsForensicAttestation(text: string | null | undefined): boolean {
  return meetsForensicAttestationWithMin(text, FORENSIC_ATTESTATION_MIN);
}

export function meetsForensicAttestationWithMin(
  text: string | null | undefined,
  minChars: number,
): boolean {
  return (text ?? "").trim().length >= Math.max(1, minChars);
}

export function allThreatsMeetForensicAttestation(
  threatIds: string[],
  draftsByThreatId: Record<string, string | undefined>,
): boolean {
  return threatIds.every((id) => meetsForensicAttestation(draftsByThreatId[id]));
}

/** Chaos shadow drill: operator concurrence via GRC ack / observer gate (unblocks 4s board purge). */
export function chaosDrillOperatorConcurrenceSatisfied(
  ingestionDetails?: string | null,
): boolean {
  const raw = (ingestionDetails ?? "").trim();
  if (!raw) return false;
  try {
    const j = JSON.parse(raw) as {
      chaosGrcAckPersistedAt?: unknown;
      chaosObserverConcurrenceVerifiedAt?: unknown;
      chaosAssigneeHandoffHistory?: Array<{ phase?: string; directiveId?: string }>;
    };
    if (j.chaosGrcAckPersistedAt != null && String(j.chaosGrcAckPersistedAt).trim()) {
      return true;
    }
    if (
      j.chaosObserverConcurrenceVerifiedAt != null &&
      String(j.chaosObserverConcurrenceVerifiedAt).trim()
    ) {
      return true;
    }
    const hand = j.chaosAssigneeHandoffHistory;
    if (
      Array.isArray(hand) &&
      hand.some(
        (h) =>
          h?.phase === "FINAL_GRC_ACKNOWLEDGEMENT" ||
          h?.directiveId === SYSTEM_GRC_ACK_DIRECTIVE ||
          (typeof h?.directiveId === "string" &&
            h.directiveId.includes("SYSTEM_GRC_ACK")),
      )
    ) {
      return true;
    }
  } catch {
    if (
      /FINAL_GRC_ACKNOWLEDGEMENT|chaosGrcAckPersistedAt|SYSTEM_GRC_ACK_PROMOTE_ACTIVE_RISKS/i.test(
        raw,
      )
    ) {
      return true;
    }
  }
  return false;
}

/** Parse `chaosScenario` from persisted ingestion JSON (Irontech Levels 1–5). */
export function parseChaosScenarioFromIngestion(
  ingestionDetails?: string | null,
): string | null {
  const raw = (ingestionDetails ?? "").trim();
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as { chaosScenario?: unknown };
    const v = typeof j.chaosScenario === "string" ? j.chaosScenario.trim().toUpperCase() : "";
    return v || null;
  } catch {
    const m = /"chaosScenario"\s*:\s*"([^"]+)"/i.exec(raw);
    return m?.[1]?.trim().toUpperCase() ?? null;
  }
}

/** Chaos L4 — row halted for Tier-3 JIT before `resumeIsolatedRemoteSupportDrill`. */
export function isRemoteSupportAwaitingJitGrant(
  threatStatus: string | null | undefined,
  ingestionDetails: string | null | undefined,
): boolean {
  if (parseChaosScenarioFromIngestion(ingestionDetails) !== "REMOTE_SUPPORT") return false;
  const st = (threatStatus ?? "").trim().toUpperCase();
  if (st === "PENDING_REMOTE_INTERVENTION") return true;
  if (st !== "MITIGATED") return false;
  const raw = ingestionDetails?.trim();
  if (!raw) return false;
  try {
    const j = JSON.parse(raw) as { remoteSupportJitAwaitingGrant?: unknown };
    return j.remoteSupportJitAwaitingGrant === true;
  } catch {
    return /"remoteSupportJitAwaitingGrant"\s*:\s*true/i.test(raw);
  }
}

/** Scenario 4: remote JIT / sidecar handshake completed (unblocks victory-lap seat release). */
export function chaosRemoteSupportHandshakeSatisfied(
  ingestionDetails?: string | null,
): boolean {
  const raw = (ingestionDetails ?? "").trim();
  if (!raw) return false;
  try {
    const j = JSON.parse(raw) as {
      sidecarTornDownAt?: unknown;
      remoteSupportJitAwaitingGrant?: unknown;
      chaosRemoteAccessGrantedAt?: unknown;
    };
    if (j.sidecarTornDownAt != null && String(j.sidecarTornDownAt).trim()) return true;
    if (j.chaosRemoteAccessGrantedAt != null && String(j.chaosRemoteAccessGrantedAt).trim()) {
      return true;
    }
    if (j.remoteSupportJitAwaitingGrant === false) return true;
  } catch {
    if (/sidecarTornDownAt|chaosRemoteAccessGrantedAt|remoteSupportJitAwaitingGrant":\s*false/i.test(raw)) {
      return true;
    }
  }
  return false;
}

/**
 * Enterprise Risk Posture seat release after RESOLVED.
 * Chaos 1/2/3/5: never block — autonomous closure releases after 4s victory lap.
 * Chaos 4 (REMOTE_SUPPORT): hold until remote handshake or GRC concurrence.
 */
export function chaosVictoryLapPurgeBlocked(
  ingestionDetails?: string | null,
  threat?: { isRemoteAccessAuthorized?: boolean | null },
): boolean {
  const scenario = parseChaosScenarioFromIngestion(ingestionDetails);
  if (scenario !== "REMOTE_SUPPORT") return false;
  if (threat?.isRemoteAccessAuthorized) return false;
  if (chaosRemoteSupportHandshakeSatisfied(ingestionDetails)) return false;
  if (chaosDrillOperatorConcurrenceSatisfied(ingestionDetails)) return false;
  return true;
}

/** True when persisted resolution narrative indicates Irontech / agent autonomous closure (human concurrence still required). */
export function inferAutonomousAgentResolution(ingestionDetails?: string | null): boolean {
  const raw = (ingestionDetails ?? "").trim();
  if (!raw) return false;
  try {
    const j = JSON.parse(raw) as { resolutionJustification?: unknown };
    const rj = typeof j.resolutionJustification === "string" ? j.resolutionJustification.trim() : "";
    const autonomous =
      rj.startsWith("[IRONTECH AUTONOMOUS RECOVERY]") ||
      rj.startsWith("[SIDECAR DRILL COMPLETE]") ||
      /\[IRONTECH AUTONOMOUS RECOVERY\]/i.test(rj);
    return autonomous && !chaosDrillOperatorConcurrenceSatisfied(ingestionDetails);
  } catch {
    if (/IRONTECH AUTONOMOUS|\[SIDECAR DRILL COMPLETE\]/i.test(raw)) {
      return !chaosDrillOperatorConcurrenceSatisfied(raw);
    }
    return false;
  }
}

/** @deprecated Use {@link chaosVictoryLapPurgeBlocked} — only Chaos 4 blocks seat release. */
export function chaosAutonomousPurgeBlockedForHumanConcurrence(
  ingestionDetails?: string | null,
  threat?: { isRemoteAccessAuthorized?: boolean | null },
): boolean {
  return chaosVictoryLapPurgeBlocked(ingestionDetails, threat);
}

export type WorkNoteLike = { text?: string; user?: string };

/** User_00 forensic concurrence: operator-attributed note ≥50 chars (matches session / canonical assignee labels). */
export function hasUser00ForensicConcurrence(notes: readonly WorkNoteLike[] | undefined): boolean {
  if (!notes?.length) return false;
  return notes.some((n) => {
    const len = (n.text ?? "").trim().length;
    if (len < FORENSIC_ATTESTATION_MIN) return false;
    const u = (n.user ?? "").trim().toLowerCase();
    return u === "user_00";
  });
}
