/**
 * Single-line JSON for server operational logs (parseable in CI / log drains).
 */
export function logStructuredEvent(
  scope: string,
  event: string,
  data?: Record<string, unknown>,
  level: "info" | "warn" | "error" = "info",
): void {
  const line = JSON.stringify({
    scope,
    event,
    ts: new Date().toISOString(),
    ...data,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}
