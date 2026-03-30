/**
 * GRC maintenance: Gemini / provider quota and rate-limit signals (Sprint 6.19).
 */

export function isGrcInfrastructureLimitMessage(text: string): boolean {
  const t = (text ?? "").toLowerCase();
  if (!t.trim()) return false;
  return (
    t.includes("quota exceeded") ||
    t.includes("rate-limits") ||
    t.includes("rate limits") ||
    t.includes("ratelimit") ||
    t.includes("rate limit") ||
    t.includes("resource exhausted") ||
    t.includes("resource_exhausted") ||
    /\b429\b/.test(t)
  );
}

/** Best-effort parse for "retry in N seconds" style copy from API errors. */
export function parseRetryAfterSecondsFromMessage(text: string): number | null {
  const s = text ?? "";
  const patterns: RegExp[] = [
    /retry\s+in\s+(\d+)\s*(?:seconds?|secs?|s)\b/i,
    /retry\s+after[:\s]+(\d+)\s*(?:seconds?|secs?|s)?/i,
    /(\d+)\s*seconds?\s*(?:remaining|until\s+retry)/i,
    /retry\s+delay[^{]*?(\d+)\s*s/i,
    /"retrydelay"\s*:\s*"(\d+)s"/i,
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n >= 0 && n < 86400) return n;
    }
  }
  return null;
}

export function joinErrorProbeParts(parts: Array<string | null | undefined>): string {
  return parts
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .join("\n");
}
