/**
 * Persisted on `ThreatEvent.ingestionDetails.irontechLive` for Realtime + Active card streaming UI.
 */

export type IrontechLiveAttemptEntry = {
  attempt: number;
  max: number;
  error: string;
  at: string;
};

export type IrontechLivePayload = {
  streamSeq: number;
  lastTerminalLine: string;
  attempts: IrontechLiveAttemptEntry[];
  agentName?: string;
  streamedAt?: string;
};

export function parseIrontechLiveFromIngestion(
  raw: string | null | undefined,
): IrontechLivePayload | null {
  if (raw == null || !String(raw).trim()) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const live = o.irontechLive;
    if (live === null || typeof live !== "object" || Array.isArray(live)) return null;
    const L = live as Record<string, unknown>;
    const streamSeq = typeof L.streamSeq === "number" ? L.streamSeq : 0;
    const lastTerminalLine =
      typeof L.lastTerminalLine === "string" ? L.lastTerminalLine.trim() : "";
    if (streamSeq < 1 || !lastTerminalLine) return null;
    const attempts = Array.isArray(L.attempts)
      ? (L.attempts as IrontechLiveAttemptEntry[]).filter(
          (a) => a && typeof a.attempt === "number",
        )
      : [];
    return {
      streamSeq,
      lastTerminalLine,
      attempts,
      agentName: typeof L.agentName === "string" ? L.agentName : undefined,
      streamedAt: typeof L.streamedAt === "string" ? L.streamedAt : undefined,
    };
  } catch {
    return null;
  }
}
