/**
 * Parse Microsoft Teams / Graph call transcript VTT (or plain transcript text)
 * into a single rolling buffer suitable for workflow-review live analysis.
 */

export function parseTeamsTranscriptVtt(raw: string): string {
  const text = String(raw ?? "").replace(/^\uFEFF/, "");
  if (!text.trim()) return "";

  const lines = text.split(/\r?\n/);
  const spoken: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^WEBVTT/i.test(trimmed)) continue;
    if (/^NOTE\b/i.test(trimmed)) continue;
    if (/^\d+$/.test(trimmed)) continue;
    if (/^\d{2}:\d{2}:\d{2}[.,]\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}/.test(trimmed)) continue;
    if (/^Kind:/i.test(trimmed) || /^Language:/i.test(trimmed)) continue;

    // Speaker labels: "Jane Doe:" or "<v Jane Doe>"
    const withoutVTag = trimmed.replace(/^<v\s+[^>]+>/i, "").replace(/<\/v>/gi, "");
    const withoutSpeaker = withoutVTag.replace(/^[^:]{1,80}:\s+/, "");
    const cleaned = withoutSpeaker
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned) spoken.push(cleaned);
  }

  return spoken.join(" ").replace(/\s+/g, " ").trim();
}

/** Return only the suffix of `next` that is new relative to `previous` (for poll deltas). */
export function transcriptDelta(previous: string, next: string): string {
  const prev = previous.trim();
  const nxt = next.trim();
  if (!nxt) return "";
  if (!prev) return nxt;
  if (nxt.startsWith(prev)) return nxt.slice(prev.length).trim();
  // Graph sometimes rewrites earlier cues; fall back to full text if overlap is weak.
  const overlap = Math.min(prev.length, 240);
  const tail = prev.slice(-overlap);
  const idx = nxt.indexOf(tail);
  if (idx >= 0) return nxt.slice(idx + tail.length).trim();
  return nxt;
}
