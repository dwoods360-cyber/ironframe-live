const THREAT_SOURCE_LABELS: Record<string, string> = {
  C2SR: "Command & Control Security Risk",
};

export function toThreatSourceLabel(source: string | null | undefined): string {
  const raw = (source ?? "").trim();
  if (!raw) return "Unknown Source";
  const key = raw.toUpperCase();
  return THREAT_SOURCE_LABELS[key] ?? raw;
}
