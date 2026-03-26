/**
 * Ironlock — Zero-Trust heuristic scan for payloads entering the DMZ ingress path.
 */

const INJECTION_PATTERNS: Array<{ regex: RegExp; label: string }> = [
  { regex: /<script\b/i, label: "<script>" },
  { regex: /javascript\s*:/i, label: "javascript:" },
  { regex: /DROP\s+TABLE\b/i, label: "DROP TABLE" },
  { regex: /DELETE\s+FROM\b/i, label: "DELETE FROM" },
  { regex: /UNION\s+SELECT\b/i, label: "UNION SELECT" },
];

export function scanPayload(payload: string): { isMalicious: boolean; reason: string | null } {
  const s = String(payload ?? "");
  for (const { regex, label } of INJECTION_PATTERNS) {
    if (regex.test(s)) {
      return { isMalicious: true, reason: `Matched pattern: ${label}` };
    }
  }
  return { isMalicious: false, reason: null };
}
