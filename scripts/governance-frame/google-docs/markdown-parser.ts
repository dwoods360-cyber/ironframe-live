import matter from "gray-matter";

import type {
  ContentBlock,
  HeadingLevel,
  InlineSpan,
  ManuscriptFrontmatter,
  ParsedMarkdownDocument,
  UnsupportedMarkdownIssue,
} from "./types";

const PAGE_BREAK =
  /^(?:<!--\s*pagebreak\s*-->|\\newpage|\{\{page-break\}\})$/i;
const TOC_MARKER =
  /^(?:<!--\s*toc\s*-->|\[\[TOC\]\]|Table of Contents\s*[—-]\s*refresh)/i;

function parseInline(text: string, file: string, line: number, unsupported: UnsupportedMarkdownIssue[]): InlineSpan[] {
  // Images are unsupported content loss if present.
  if (/!\[[^\]]*\]\([^)]+\)/.test(text)) {
    unsupported.push({
      file,
      line,
      detail: "Markdown images are not supported for Google Docs sync.",
    });
  }

  // Convert links to "label (url)" rather than dropping them.
  let working = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");

  // Strip residual raw HTML tags (except we already handled pagebreak).
  if (/<[a-zA-Z/!][^>]*>/.test(working) && !PAGE_BREAK.test(working.trim())) {
    unsupported.push({
      file,
      line,
      detail: `Unsupported HTML in line: ${working.trim().slice(0, 80)}`,
    });
    working = working.replace(/<[^>]+>/g, "");
  }

  const spans: InlineSpan[] = [];
  const tokenRe = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(working)) !== null) {
    if (match.index > last) {
      spans.push({ text: working.slice(last, match.index) });
    }
    const token = match[0];
    if (token.startsWith("***") && token.endsWith("***")) {
      spans.push({ text: token.slice(3, -3), bold: true, italic: true });
    } else if (token.startsWith("**") && token.endsWith("**")) {
      spans.push({ text: token.slice(2, -2), bold: true });
    } else if (
      (token.startsWith("*") && token.endsWith("*")) ||
      (token.startsWith("_") && token.endsWith("_"))
    ) {
      spans.push({ text: token.slice(1, -1), italic: true });
    } else if (token.startsWith("`") && token.endsWith("`")) {
      unsupported.push({
        file,
        line,
        detail: "Inline code is not styled in Docs sync; rendered as plain text.",
      });
      spans.push({ text: token.slice(1, -1) });
    }
    last = match.index + token.length;
  }
  if (last < working.length) {
    spans.push({ text: working.slice(last) });
  }
  if (spans.length === 0) {
    spans.push({ text: "" });
  }
  return spans;
}

function parseTable(
  lines: string[],
  start: number,
  file: string,
  unsupported: UnsupportedMarkdownIssue[],
): { block: ContentBlock; nextIndex: number } | null {
  const headerLine = lines[start]?.trim() ?? "";
  const separator = lines[start + 1]?.trim() ?? "";
  const isSeparator =
    /^\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?$/.test(separator) ||
    /^\|?[\s|:-]+$/.test(separator);
  if (!headerLine.includes("|") || !isSeparator) {
    return null;
  }

  const splitRow = (row: string) =>
    row
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());

  const headers = splitRow(headerLine);
  const rows: string[][] = [];
  let i = start + 2;
  while (i < lines.length) {
    const line = lines[i]?.trim() ?? "";
    if (!line.includes("|") || PAGE_BREAK.test(line) || line.startsWith("#")) break;
    if (/^```/.test(line)) {
      unsupported.push({
        file,
        line: i + 1,
        detail: "Fenced code blocks are not supported inside or after tables.",
      });
      break;
    }
    rows.push(splitRow(line));
    i += 1;
  }

  return {
    block: {
      type: "table",
      headers,
      rows,
      line: start + 1,
    },
    nextIndex: i,
  };
}

/**
 * Parse Governance Frame Markdown into structured blocks for Google Docs formatting.
 * YAML frontmatter is never emitted as body text.
 */
export function parseGovernanceMarkdown(
  markdown: string,
  file: string,
  options?: { treatFirstH1AsTitle?: boolean; treatFirstH2AsSubtitle?: boolean },
): ParsedMarkdownDocument {
  const unsupported: UnsupportedMarkdownIssue[] = [];
  let frontmatter: ManuscriptFrontmatter = {};
  let body = markdown;

  try {
    const parsed = matter(markdown);
    frontmatter = (parsed.data ?? {}) as ManuscriptFrontmatter;
    body = parsed.content;
  } catch (err) {
    throw new Error(
      `Malformed frontmatter in ${file}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blocks: ContentBlock[] = [];
  let i = 0;
  let sawTitle = false;
  let sawSubtitle = false;
  let unorderedBuffer: { items: InlineSpan[][]; line: number } | null = null;
  let orderedBuffer: { items: InlineSpan[][]; line: number } | null = null;

  const flushLists = () => {
    if (unorderedBuffer) {
      blocks.push({
        type: "unordered_list",
        items: unorderedBuffer.items,
        line: unorderedBuffer.line,
      });
      unorderedBuffer = null;
    }
    if (orderedBuffer) {
      blocks.push({
        type: "ordered_list",
        items: orderedBuffer.items,
        line: orderedBuffer.line,
      });
      orderedBuffer = null;
    }
  };

  while (i < lines.length) {
    const raw = lines[i] ?? "";
    const line = raw.trimEnd();
    const trimmed = line.trim();
    const lineNo = i + 1;

    if (!trimmed) {
      flushLists();
      i += 1;
      continue;
    }

    if (/^```/.test(trimmed)) {
      flushLists();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test((lines[i] ?? "").trim())) {
        codeLines.push(lines[i] ?? "");
        i += 1;
      }
      if (i < lines.length) i += 1; // closing fence
      unsupported.push({
        file,
        line: lineNo,
        detail:
          "Fenced code block rendered as plain monospace paragraphs (no language styling).",
      });
      const codeText = codeLines.join("\n").trimEnd();
      if (codeText) {
        blocks.push({
          type: "paragraph",
          spans: [{ text: codeText }],
          line: lineNo,
        });
      }
      continue;
    }

    if (PAGE_BREAK.test(trimmed)) {
      flushLists();
      blocks.push({ type: "page_break", line: lineNo });
      i += 1;
      continue;
    }

    if (TOC_MARKER.test(trimmed)) {
      flushLists();
      blocks.push({ type: "toc_placeholder", line: lineNo });
      i += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushLists();
      const level = heading[1].length as HeadingLevel;
      const text = heading[2].trim();
      const spans = parseInline(text, file, lineNo, unsupported);
      if (
        options?.treatFirstH1AsTitle !== false &&
        level === 1 &&
        !sawTitle &&
        blocks.every((b) => b.type !== "heading")
      ) {
        blocks.push({ type: "title", spans, line: lineNo });
        sawTitle = true;
      } else if (
        options?.treatFirstH2AsSubtitle !== false &&
        level === 2 &&
        sawTitle &&
        !sawSubtitle &&
        blocks.filter((b) => b.type === "heading" || b.type === "paragraph").length === 0
      ) {
        // Only treat immediate subtitle-style H2 after title (no prior body headings).
        const onlyTitleSoFar = blocks.every(
          (b) =>
            b.type === "title" ||
            b.type === "subtitle" ||
            b.type === "page_break" ||
            b.type === "toc_placeholder",
        );
        if (onlyTitleSoFar) {
          blocks.push({ type: "subtitle", spans, line: lineNo });
          sawSubtitle = true;
        } else {
          blocks.push({ type: "heading", level, spans, line: lineNo });
        }
      } else {
        blocks.push({ type: "heading", level, spans, line: lineNo });
      }
      i += 1;
      continue;
    }

    const table = parseTable(lines, i, file, unsupported);
    if (table) {
      flushLists();
      blocks.push(table.block);
      i = table.nextIndex;
      continue;
    }

    const unordered = trimmed.match(/^[-*+]\s+(.+)$/);
    if (unordered) {
      if (orderedBuffer) flushLists();
      if (!unorderedBuffer) unorderedBuffer = { items: [], line: lineNo };
      unorderedBuffer.items.push(parseInline(unordered[1], file, lineNo, unsupported));
      i += 1;
      continue;
    }

    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      if (unorderedBuffer) flushLists();
      if (!orderedBuffer) orderedBuffer = { items: [], line: lineNo };
      orderedBuffer.items.push(parseInline(ordered[1], file, lineNo, unsupported));
      i += 1;
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushLists();
      const quoteText = trimmed.replace(/^>\s?/, "");
      blocks.push({
        type: "blockquote",
        spans: parseInline(quoteText, file, lineNo, unsupported),
        line: lineNo,
      });
      i += 1;
      continue;
    }

    if (/^\|/.test(trimmed) && !table) {
      unsupported.push({
        file,
        line: lineNo,
        detail: "Malformed Markdown table row (missing separator).",
      });
      i += 1;
      continue;
    }

    flushLists();

    // Metadata-style field lines and Markdown hard breaks (two trailing spaces)
    // must remain separate paragraphs — never join into one crowded line.
    const isFieldLine = (s: string) =>
      /^\*\*(Version|Status|Classification|Publisher|Research ID):\*\*/i.test(s) ||
      /^(Version|Status|Classification|Publisher|Research ID):/i.test(s);
    const hardBreak = / {2}$/.test(line);

    if (isFieldLine(trimmed) || hardBreak) {
      blocks.push({
        type: "paragraph",
        spans: parseInline(trimmed, file, lineNo, unsupported),
        line: lineNo,
      });
      i += 1;
      continue;
    }

    // Collect paragraph until blank line
    const paraLines: string[] = [trimmed];
    i += 1;
    while (i < lines.length) {
      const rawNext = lines[i] ?? "";
      const next = rawNext.trim();
      if (!next) break;
      if (
        next.startsWith("#") ||
        next.startsWith(">") ||
        /^[-*+]\s+/.test(next) ||
        /^\d+\.\s+/.test(next) ||
        PAGE_BREAK.test(next) ||
        /^```/.test(next) ||
        isFieldLine(next) ||
        / {2}$/.test(rawNext) ||
        (next.includes("|") && /^\|?[\s:-|]+\|?$/.test((lines[i + 1] ?? "").trim()))
      ) {
        break;
      }
      paraLines.push(next);
      i += 1;
    }
    blocks.push({
      type: "paragraph",
      spans: parseInline(paraLines.join(" "), file, lineNo, unsupported),
      line: lineNo,
    });
  }

  flushLists();

  // Hard failures that would cause content loss
  const fatal = unsupported.filter((u) =>
    /images are not supported|Malformed Markdown table/.test(u.detail),
  );
  if (fatal.length > 0) {
    const msg = fatal.map((u) => `${u.file}:${u.line} — ${u.detail}`).join("\n");
    throw new Error(`Unsupported Markdown would cause content loss:\n${msg}`);
  }

  return { frontmatter, blocks, unsupported };
}

export function spansToPlainText(spans: InlineSpan[]): string {
  return spans.map((s) => s.text).join("");
}
