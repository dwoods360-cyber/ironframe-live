/** Matches `> [HH:MM:SS]` or `> [H:MM:SS]` prefixes already stamped on stream lines. */
const TIMESTAMP_PREFIX = /^>\s*\[\d{1,2}:\d{2}:\d{2}/;

/**
 * Normalizes a resilience / agent line for the Live Intelligence Stream terminal.
 * Prepends a mono-spaced timestamp when the line does not already carry one.
 */
export function formatIntelStreamLine(line: string, at?: Date): string {
  const trimmed = line.trim();
  if (!trimmed) return trimmed;
  if (TIMESTAMP_PREFIX.test(trimmed)) return trimmed;

  const ts = (at ?? new Date()).toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  if (trimmed.startsWith(">")) {
    return `> [${ts}] ${trimmed.slice(1).trimStart()}`;
  }
  return `> [${ts}] ${trimmed}`;
}

/** Canonical `[AGENT-XX:CODENAME]` operational line for client-side ingress. */
export function formatAgentIntelLine(
  agentId: string,
  agentCodename: string,
  description: string,
  at?: Date,
): string {
  const ts = (at ?? new Date()).toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `> [${ts}] [${agentId}:${agentCodename}] ${description}`;
}
