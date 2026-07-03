/** Stable unique ids for vendor monitoring / quarantine alerts (Strict Mode safe). */
export function createMonitoringAlertId(prefix: string, seed?: string): string {
  const base = seed?.trim() ? `${prefix}-${seed.trim()}` : prefix;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${base}-${crypto.randomUUID()}`;
  }
  return `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
