/** Irontech (Agent 12) — typed agent failures for Tier-1 decoupling / blast-radius routing. */

export class AgentDependencyError extends Error {
  override readonly name = "AgentDependencyError";
  constructor(
    message: string,
    public readonly agentNode: string,
  ) {
    super(message);
  }
}

export class AgentTimeoutError extends Error {
  override readonly name = "AgentTimeoutError";
  constructor(
    message: string,
    public readonly agentNode: string,
  ) {
    super(message);
  }
}

const DEPENDENCY_RE = /dependency|unavailable|503|502|429|stale|electricity|maps|fetch failed|network|econnrefused/i;
const TIMEOUT_RE = /timeout|timed out|aborted|etimedout|deadline/i;

export function isDependencyOrTimeoutError(e: unknown): boolean {
  if (e instanceof AgentDependencyError || e instanceof AgentTimeoutError) return true;
  if (!(e instanceof Error)) return false;
  const m = `${e.name} ${e.message}`;
  return DEPENDENCY_RE.test(m) || TIMEOUT_RE.test(m);
}

export function extractFailedAgentNodeFromLogs(logs: string[] | undefined): string | null {
  if (!logs?.length) return null;
  for (let i = logs.length - 1; i >= 0; i--) {
    const line = logs[i] ?? "";
    const m = line.match(/IRONTECH_TIER1:BLOCK_AND_BYPASS:([a-z0-9_-]+)/i);
    if (m?.[1]) return m[1].toLowerCase();
    const d = line.match(/DEPENDENCY_ERROR:([a-z0-9_-]+):/i);
    if (d?.[1]) return d[1].toLowerCase();
  }
  return null;
}
