export type BriefingCitation = {
  index: number;
  label: string;
  locator: string;
  retrievedAt: string | null;
  note: string | null;
};

/**
 * Parse Section V bullets:
 * - **[1] Label** — `locator` · retrieved 2026-06-17 · optional note
 * - **Label** | locator | 2026-06-17
 */
export function parseBriefingCitations(sectionBody: string): BriefingCitation[] {
  const citations: BriefingCitation[] = [];
  let autoIndex = 0;

  for (const rawLine of sectionBody.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("-")) continue;

    const indexed = line.match(
      /^-\s+\*\*\[(\d+)\]\s*(.+?)\*\*\s*[—–-]\s*`([^`]+)`(?:\s*·\s*retrieved\s+([^\s·]+))?(?:\s*·\s*(.+))?$/i,
    );
    if (indexed) {
      citations.push({
        index: Number(indexed[1]),
        label: indexed[2].trim(),
        locator: indexed[3].trim(),
        retrievedAt: indexed[4]?.trim() ?? null,
        note: indexed[5]?.trim() ?? null,
      });
      continue;
    }

    const piped = line.match(/^-\s+\*\*(.+?)\*\*\s*\|\s*([^|]+)\|\s*([^|]+)(?:\|\s*(.+))?$/);
    if (piped) {
      autoIndex += 1;
      citations.push({
        index: autoIndex,
        label: piped[1].trim(),
        locator: piped[2].trim(),
        retrievedAt: piped[3].trim(),
        note: piped[4]?.trim() ?? null,
      });
      continue;
    }

    const simple = line.match(/^-\s+\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/);
    if (simple) {
      autoIndex += 1;
      citations.push({
        index: autoIndex,
        label: simple[1].trim(),
        locator: simple[2].trim(),
        retrievedAt: null,
        note: null,
      });
    }
  }

  return citations.sort((a, b) => a.index - b.index);
}

export function formatBriefingCitationLine(citation: BriefingCitation): string {
  const retrieved = citation.retrievedAt ? ` · retrieved ${citation.retrievedAt}` : "";
  const note = citation.note ? ` · ${citation.note}` : "";
  return `- **[${citation.index}] ${citation.label}** — \`${citation.locator}\`${retrieved}${note}`;
}

export function renderBriefingCitationsMarkdown(citations: BriefingCitation[]): string {
  if (!citations.length) return "";
  const lines = citations.map(formatBriefingCitationLine);
  return `### V. Sources & Citations\n\n${lines.join("\n")}\n`;
}
