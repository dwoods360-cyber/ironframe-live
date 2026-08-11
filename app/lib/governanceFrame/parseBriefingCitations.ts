export type BriefingCitation = {
  index: number;
  label: string;
  locator: string;
  retrievedAt: string | null;
  note: string | null;
};

const URL_LINE = /^(https?:\/\/\S+|`[^`]+`)$/i;

/**
 * Parse Section V bullets.
 *
 * Supported forms (publishing serves the writing):
 * - **[1] Label** — `locator` · retrieved 2026-06-17 · optional note
 * - **[1] Label** — https://example.com/path
 * - **Label** | locator | 2026-06-17
 * - 1. **[1] Label** — https://example.com/path  (numbered lists)
 * - 1. **Label:** https://example.com/path
 * - multi-line research citations:
 *   * **[1] Label**
 *     https://example.com/path
 *     Optional descriptive note
 */
export function parseBriefingCitations(sectionBody: string): BriefingCitation[] {
  const citations: BriefingCitation[] = [];
  let autoIndex = 0;
  const lines = sectionBody.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]?.trim() ?? "";
    // Accept markdown bullets (-/*/+) and numbered lists (1. / 1)).
    if (!/^([-*+]|\d+[.)])\s+/.test(line)) continue;
    const content = line.replace(/^([-*+]|\d+[.)])\s+/, "").trim();
    if (!content) continue;

    const indexedBacktick = content.match(
      /^\*\*\[(\d+)\]\s*(.+?)\*\*\s*[—–-]\s*`([^`]+)`(?:\s*·\s*retrieved\s+([^\s·]+))?(?:\s*·\s*(.+))?$/i,
    );
    if (indexedBacktick) {
      citations.push({
        index: Number(indexedBacktick[1]),
        label: indexedBacktick[2].trim(),
        locator: indexedBacktick[3].trim(),
        retrievedAt: indexedBacktick[4]?.trim() ?? null,
        note: indexedBacktick[5]?.trim() ?? null,
      });
      continue;
    }

    const indexedInline = content.match(
      /^\*\*\[(\d+)\]\s*(.+?)\*\*\s*[—–-]\s*(.+?)(?:\s*·\s*retrieved\s+([^\s·]+))?(?:\s*·\s*(.+))?$/i,
    );
    if (indexedInline) {
      citations.push({
        index: Number(indexedInline[1]),
        label: indexedInline[2].trim(),
        locator: indexedInline[3].trim(),
        retrievedAt: indexedInline[4]?.trim() ?? null,
        note: indexedInline[5]?.trim() ?? null,
      });
      continue;
    }

    const piped = content.match(/^\*\*(.+?)\*\*\s*\|\s*([^|]+)\|\s*([^|]+)(?:\|\s*(.+))?$/);
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

    const simple = content.match(/^\*\*(.+?)\*\*\s*[—–:-]\s*(.+)$/);
    if (simple) {
      autoIndex += 1;
      citations.push({
        index: autoIndex,
        label: simple[1].trim().replace(/:$/, ""),
        locator: simple[2].trim().replace(/^<|>$/g, ""),
        retrievedAt: null,
        note: null,
      });
      continue;
    }

    // "Label: https://..." or "Label — https://..." without bold wrapper.
    const plainLabeled = content.match(
      /^(.+?)\s*[—–:-]\s*(https?:\/\/\S+|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^)]+)\))$/i,
    );
    if (plainLabeled) {
      autoIndex += 1;
      const locator =
        plainLabeled[3]?.trim() ||
        plainLabeled[2].replace(/^`|`$/g, "").replace(/^\[([^\]]+)\]\((.+)\)$/, "$2").trim();
      citations.push({
        index: autoIndex,
        label: plainLabeled[1].replace(/\*\*/g, "").trim(),
        locator,
        retrievedAt: null,
        note: null,
      });
      continue;
    }

    // Multi-line research form: bullet label, then URL / note on following lines.
    const headingOnly = content.match(/^\*\*\[(\d+)\]\s*(.+?)\*\*\s*$/);
    if (!headingOnly) {
      // Last-resort: any https locator on the line.
      const urlOnly = content.match(/(https?:\/\/[^\s)>\]]+)/i);
      if (urlOnly) {
        autoIndex += 1;
        citations.push({
          index: autoIndex,
          label: content.replace(urlOnly[1], "").replace(/\*\*/g, "").trim() || `Source ${autoIndex}`,
          locator: urlOnly[1],
          retrievedAt: null,
          note: null,
        });
      }
      continue;
    }

    let locator = "";
    const noteParts: string[] = [];
    let j = i + 1;
    for (; j < lines.length; j += 1) {
      const next = lines[j] ?? "";
      const trimmed = next.trim();
      if (!trimmed) {
        if (locator) break;
        continue;
      }
      if (/^([-*+]|\d+[.)])\s+/.test(trimmed) || /^#{2,3}\s+/.test(trimmed)) break;

      const urlMatch = trimmed.match(URL_LINE);
      if (urlMatch && !locator) {
        locator = urlMatch[1].replace(/^`|`$/g, "").trim();
        continue;
      }
      if (locator) {
        noteParts.push(trimmed);
      }
    }
    i = j - 1;

    if (!locator) continue;

    citations.push({
      index: Number(headingOnly[1]),
      label: headingOnly[2].trim(),
      locator,
      retrievedAt: null,
      note: noteParts.length ? noteParts.join(" ") : null,
    });
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
