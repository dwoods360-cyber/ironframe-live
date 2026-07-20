import type { docs_v1 } from "googleapis";

import {
  parseGovernanceMarkdown,
  spansToPlainText,
} from "./markdown-parser";
import type {
  ContentBlock,
  InlineSpan,
  ManuscriptFrontmatter,
  ParsedMarkdownDocument,
} from "./types";

type Docs = docs_v1.Docs;

type ParagraphStyleRange = {
  start: number;
  end: number;
  namedStyleType: string;
  fontSizePt?: number;
  spaceAbovePt?: number;
  spaceBelowPt?: number;
};

type TextStyleRange = {
  start: number;
  end: number;
  bold?: boolean;
  italic?: boolean;
  fontSizePt?: number;
};

type DocsPayload = {
  text: string;
  paragraphStyles: ParagraphStyleRange[];
  textStyles: TextStyleRange[];
  tables: Array<{ startIndex: number; headers: string[]; rows: string[][] }>;
  pageBreaks: number[];
};

function headingNamedStyle(
  level: 1 | 2 | 3,
): "HEADING_1" | "HEADING_2" | "HEADING_3" {
  if (level === 1) return "HEADING_1";
  if (level === 2) return "HEADING_2";
  return "HEADING_3";
}

function humanizeStatus(raw: string): string {
  return raw
    .replace(/_/g, " ")
    .replace(/\bDRAFT\b/gi, "Draft")
    .replace(/\beditorial\b/gi, "Editorial")
    .replace(/\b1\.0-draft\b/gi, "1.0 Draft");
}

function humanizeVersion(raw: string): string {
  if (/^1\.0-draft$/i.test(raw.trim())) return "1.0 Draft";
  return raw;
}

function isBodyCoverDuplicate(block: ContentBlock): boolean {
  if (block.type === "title" || block.type === "subtitle") return true;
  if (block.type !== "paragraph") return false;
  const text = spansToPlainText(block.spans).trim();
  return (
    /^Governance Frame Research Paper\b/i.test(text) ||
    /^Version:/i.test(text) ||
    /^Status:/i.test(text) ||
    /^Classification:/i.test(text) ||
    /^\*\*Version:\*\*/i.test(text)
  );
}

function isTocHeading(block: ContentBlock): boolean {
  return (
    (block.type === "heading" || block.type === "title") &&
    /^Table of Contents$/i.test(spansToPlainText(block.spans).trim())
  );
}

/**
 * Build plain-text body and style ranges for a Google Docs write.
 */
export function buildDocsPayload(
  parsed: ParsedMarkdownDocument,
  options?: {
    includeCoverFromFrontmatter?: boolean;
    forcePageBreaksForManuscript?: boolean;
  },
): DocsPayload {
  if (options?.forcePageBreaksForManuscript || options?.includeCoverFromFrontmatter) {
    return buildManuscriptPayload(parsed);
  }
  return buildGenericPayload(parsed);
}

function createBuffer() {
  let text = "";
  const paragraphStyles: ParagraphStyleRange[] = [];
  const textStyles: TextStyleRange[] = [];
  const tables: Array<{ startIndex: number; headers: string[]; rows: string[][] }> =
    [];
  const pageBreaks: number[] = [];

  const pushParagraph = (
    spans: InlineSpan[],
    namedStyleType: string,
    opts?: {
      prefix?: string;
      suffix?: string;
      fontSizePt?: number;
      spaceAbovePt?: number;
      spaceBelowPt?: number;
    },
  ) => {
    const prefix = opts?.prefix ?? "";
    const suffix = opts?.suffix ?? "\n";
    const start = text.length;
    let cursor = start + prefix.length;
    for (const span of spans) {
      const spanStart = cursor;
      const spanEnd = cursor + span.text.length;
      if (span.bold || span.italic || opts?.fontSizePt) {
        textStyles.push({
          start: spanStart,
          end: spanEnd,
          bold: span.bold,
          italic: span.italic,
          fontSizePt: opts?.fontSizePt,
        });
      }
      cursor = spanEnd;
    }
    text += `${prefix}${spansToPlainText(spans)}${suffix}`;
    paragraphStyles.push({
      start,
      end: text.length,
      namedStyleType,
      fontSizePt: opts?.fontSizePt,
      spaceAbovePt: opts?.spaceAbovePt,
      spaceBelowPt: opts?.spaceBelowPt,
    });
  };

  const pushPageBreak = () => {
    // Record break at current end; do not insert blank spacer paragraphs
    // that would become empty pages.
    pageBreaks.push(text.length);
  };

  return {
    get text() {
      return text;
    },
    paragraphStyles,
    textStyles,
    tables,
    pageBreaks,
    pushParagraph,
    pushPageBreak,
    pushTableMarker(headers: string[], rows: string[][]) {
      const markerStart = text.length;
      text += "\n";
      tables.push({ startIndex: markerStart, headers, rows });
    },
    ensureTrailingNewline() {
      if (!text.endsWith("\n")) text += "\n";
    },
  };
}

function buildManuscriptPayload(parsed: ParsedMarkdownDocument): DocsPayload {
  const fm = parsed.frontmatter;
  const buf = createBuffer();
  const blocks = parsed.blocks.filter((b) => b.type !== "toc_placeholder");

  const title =
    typeof fm.title === "string" && fm.title.trim()
      ? fm.title.trim()
      : spansToPlainText(
          blocks.find((b) => b.type === "title")?.spans ?? [{ text: "Untitled" }],
        );
  const subtitle =
    typeof fm.subtitle === "string" && fm.subtitle.trim()
      ? fm.subtitle.trim()
      : spansToPlainText(
          blocks.find((b) => b.type === "subtitle")?.spans ?? [{ text: "" }],
        );

  // --- Cover page ---
  buf.pushParagraph([{ text: title, bold: true }], "TITLE", {
    fontSizePt: 26,
    spaceBelowPt: 6,
  });
  if (subtitle) {
    buf.pushParagraph([{ text: subtitle, italic: true }], "SUBTITLE", {
      fontSizePt: 14,
      spaceBelowPt: 18,
    });
  }
  buf.pushParagraph(
    [{ text: `Governance Frame Research Paper ${String(fm.researchId ?? "GF-2026-001")}` }],
    "NORMAL_TEXT",
    { fontSizePt: 12, spaceBelowPt: 10 },
  );
  buf.pushParagraph(
    [{ text: `Version: ${humanizeVersion(String(fm.version ?? ""))}` }],
    "NORMAL_TEXT",
    { fontSizePt: 11, spaceBelowPt: 2 },
  );
  buf.pushParagraph(
    [{ text: `Status: ${humanizeStatus(String(fm.status ?? ""))}` }],
    "NORMAL_TEXT",
    { fontSizePt: 11, spaceBelowPt: 2 },
  );
  buf.pushParagraph(
    [{ text: `Classification: ${String(fm.classification ?? "")}` }],
    "NORMAL_TEXT",
    { fontSizePt: 11, spaceBelowPt: 2 },
  );
  buf.pushParagraph(
    [{ text: `Publisher: ${String(fm.publisher ?? "Governance Frame Research")}` }],
    "NORMAL_TEXT",
    { fontSizePt: 11, spaceBelowPt: 12 },
  );
  buf.pushParagraph(
    [
      {
        text: `Canonical repository path: ${String(fm.canonicalRepositoryPath ?? "")}`,
        italic: true,
      },
    ],
    "NORMAL_TEXT",
    { fontSizePt: 9, spaceBelowPt: 4 },
  );

  buf.pushPageBreak();

  // --- Body (skip cover duplicates; keep TOC contiguous) ---
  let skippingCoverDupes = true;
  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i]!;

    if (skippingCoverDupes && isBodyCoverDuplicate(block)) {
      i += 1;
      continue;
    }
    skippingCoverDupes = false;

    // Drop generator-injected page breaks; manuscript layout owns pagination.
    if (block.type === "page_break") {
      i += 1;
      continue;
    }

    if (isTocHeading(block)) {
      buf.pushParagraph([{ text: "Table of Contents" }], "HEADING_1", {
        fontSizePt: 16,
        spaceAbovePt: 0,
        spaceBelowPt: 8,
      });
      i += 1;
      // Keep following ordered list on the same page with the heading.
      if (blocks[i]?.type === "ordered_list") {
        const list = blocks[i]!;
        if (list.type === "ordered_list") {
          list.items.forEach((item, idx) => {
            buf.pushParagraph(item, "NORMAL_TEXT", {
              prefix: `${idx + 1}. `,
              fontSizePt: 11,
              spaceBelowPt: 2,
            });
          });
          i += 1;
        }
      }
      buf.pushParagraph(
        [
          {
            text: "Refresh this table of contents in Google Docs after heading updates, if desired.",
            italic: true,
          },
        ],
        "NORMAL_TEXT",
        { fontSizePt: 10, spaceAbovePt: 8, spaceBelowPt: 4 },
      );
      buf.pushPageBreak();
      continue;
    }

    renderBlock(buf, block, {
      bodyFontPt: 11,
      h1FontPt: 16,
      h2FontPt: 13,
      h3FontPt: 12,
    });
    i += 1;
  }

  buf.ensureTrailingNewline();
  return {
    text: buf.text,
    paragraphStyles: buf.paragraphStyles,
    textStyles: buf.textStyles,
    tables: buf.tables,
    pageBreaks: buf.pageBreaks,
  };
}

function buildGenericPayload(parsed: ParsedMarkdownDocument): DocsPayload {
  const buf = createBuffer();
  for (const block of parsed.blocks) {
    renderBlock(buf, block, {
      bodyFontPt: 11,
      h1FontPt: 16,
      h2FontPt: 13,
      h3FontPt: 12,
    });
  }
  buf.ensureTrailingNewline();
  return {
    text: buf.text,
    paragraphStyles: buf.paragraphStyles,
    textStyles: buf.textStyles,
    tables: buf.tables,
    pageBreaks: buf.pageBreaks,
  };
}

function renderBlock(
  buf: ReturnType<typeof createBuffer>,
  block: ContentBlock,
  fonts: { bodyFontPt: number; h1FontPt: number; h2FontPt: number; h3FontPt: number },
): void {
  switch (block.type) {
    case "title":
      buf.pushParagraph(block.spans, "TITLE", { fontSizePt: 26 });
      break;
    case "subtitle":
      buf.pushParagraph(block.spans, "SUBTITLE", { fontSizePt: 14 });
      break;
    case "heading": {
      const named = headingNamedStyle(block.level);
      const fontSizePt =
        block.level === 1
          ? fonts.h1FontPt
          : block.level === 2
            ? fonts.h2FontPt
            : fonts.h3FontPt;
      buf.pushParagraph(block.spans, named, {
        fontSizePt,
        spaceAbovePt: block.level === 1 ? 14 : 10,
        spaceBelowPt: 6,
      });
      break;
    }
    case "paragraph":
      buf.pushParagraph(block.spans, "NORMAL_TEXT", {
        fontSizePt: fonts.bodyFontPt,
        spaceBelowPt: 8,
      });
      break;
    case "blockquote":
      buf.pushParagraph(block.spans, "NORMAL_TEXT", {
        prefix: "",
        fontSizePt: fonts.bodyFontPt,
        spaceBelowPt: 8,
      });
      break;
    case "unordered_list":
      for (const item of block.items) {
        buf.pushParagraph(item, "NORMAL_TEXT", {
          prefix: "• ",
          fontSizePt: fonts.bodyFontPt,
          spaceBelowPt: 2,
        });
      }
      break;
    case "ordered_list":
      block.items.forEach((item, idx) => {
        buf.pushParagraph(item, "NORMAL_TEXT", {
          prefix: `${idx + 1}. `,
          fontSizePt: fonts.bodyFontPt,
          spaceBelowPt: 2,
        });
      });
      break;
    case "toc_placeholder":
      buf.pushParagraph(
        [
          {
            text: "Table of Contents — refresh in Google Docs after heading updates",
            italic: true,
          },
        ],
        "NORMAL_TEXT",
        { fontSizePt: 10 },
      );
      break;
    case "page_break":
      buf.pushPageBreak();
      break;
    case "table":
      buf.pushTableMarker(block.headers, block.rows);
      break;
    default:
      break;
  }
}

export async function clearDocumentBody(docs: Docs, documentId: string): Promise<void> {
  const current = await docs.documents.get({ documentId });
  const endIndex = current.data.body?.content?.slice(-1)?.[0]?.endIndex;
  if (!endIndex || endIndex <= 2) return;
  try {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            deleteContentRange: {
              range: {
                startIndex: 1,
                endIndex: endIndex - 1,
              },
            },
          },
        ],
      },
    });
  } catch (err) {
    throw new Error(
      `Docs batch-update failure clearing document ${documentId}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

export async function writeParsedDocument(
  docs: Docs,
  documentId: string,
  markdown: string,
  sourceFile: string,
  options?: {
    includeCoverFromFrontmatter?: boolean;
    forcePageBreaksForManuscript?: boolean;
    append?: boolean;
    appendMarker?: string;
  },
): Promise<void> {
  const parsed = parseGovernanceMarkdown(markdown, sourceFile, {
    treatFirstH1AsTitle: true,
    treatFirstH2AsSubtitle: true,
  });

  if (options?.append) {
    const marker =
      options.appendMarker ??
      `\n\n— Sync append ${new Date().toISOString()} —\n\n`;
    const payload = buildDocsPayload(parsed, {
      includeCoverFromFrontmatter: false,
      forcePageBreaksForManuscript: false,
    });
    await insertTextAndStyles(docs, documentId, marker + payload.text, payload, true);
    return;
  }

  await clearDocumentBody(docs, documentId);
  const payload = buildDocsPayload(parsed, {
    includeCoverFromFrontmatter: options?.includeCoverFromFrontmatter,
    forcePageBreaksForManuscript: options?.forcePageBreaksForManuscript,
  });
  await insertTextAndStyles(docs, documentId, payload.text, payload, false);
}

/**
 * Critical ordering: insert text → apply styles → insert page breaks.
 * Page breaks shift indices; applying styles after breaks corrupts heading/body assignment.
 */
async function insertTextAndStyles(
  docs: Docs,
  documentId: string,
  text: string,
  payload: DocsPayload,
  append: boolean,
): Promise<void> {
  try {
    let insertAt = 1;
    if (append) {
      const current = await docs.documents.get({ documentId });
      const endIndex = current.data.body?.content?.slice(-1)?.[0]?.endIndex ?? 1;
      insertAt = Math.max(1, endIndex - 1);
    }

    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: insertAt },
              text,
            },
          },
        ],
      },
    });

    const styleRequests: docs_v1.Schema$Request[] = [];

    for (const style of payload.paragraphStyles) {
      if (style.end <= style.start) continue;
      const paragraphStyle: docs_v1.Schema$ParagraphStyle = {
        namedStyleType: style.namedStyleType,
      };
      const fields = ["namedStyleType"];
      if (style.spaceAbovePt != null) {
        paragraphStyle.spaceAbove = { magnitude: style.spaceAbovePt, unit: "PT" };
        fields.push("spaceAbove");
      }
      if (style.spaceBelowPt != null) {
        paragraphStyle.spaceBelow = { magnitude: style.spaceBelowPt, unit: "PT" };
        fields.push("spaceBelow");
      }
      styleRequests.push({
        updateParagraphStyle: {
          range: {
            startIndex: insertAt + style.start,
            endIndex: insertAt + style.end,
          },
          paragraphStyle,
          fields: fields.join(","),
        },
      });
    }

    for (const style of payload.textStyles) {
      if (style.end <= style.start) continue;
      const textStyle: docs_v1.Schema$TextStyle = {
        bold: Boolean(style.bold),
        italic: Boolean(style.italic),
      };
      const fields = ["bold", "italic"];
      if (style.fontSizePt != null) {
        textStyle.fontSize = { magnitude: style.fontSizePt, unit: "PT" };
        fields.push("fontSize");
      }
      styleRequests.push({
        updateTextStyle: {
          range: {
            startIndex: insertAt + style.start,
            endIndex: insertAt + style.end,
          },
          textStyle,
          fields: fields.join(","),
        },
      });
    }

    // Chunk style requests to stay under API limits.
    const chunkSize = 80;
    for (let i = 0; i < styleRequests.length; i += chunkSize) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: { requests: styleRequests.slice(i, i + chunkSize) },
      });
    }

    // Page breaks last, high → low, so earlier breaks do not invalidate later indices.
    const breaks = [...payload.pageBreaks].sort((a, b) => b - a);
    for (const breakAt of breaks) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [
            {
              insertPageBreak: {
                location: { index: insertAt + breakAt },
              },
            },
          ],
        },
      });
    }

    if (payload.tables.length > 0) {
      await insertTablesAtEnd(docs, documentId, payload.tables);
    }
  } catch (err) {
    throw new Error(
      `Docs batch-update failure for document ${documentId}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

async function insertTablesAtEnd(
  docs: Docs,
  documentId: string,
  tables: Array<{ headers: string[]; rows: string[][] }>,
): Promise<void> {
  for (const table of tables) {
    const current = await docs.documents.get({ documentId });
    const endIndex = current.data.body?.content?.slice(-1)?.[0]?.endIndex ?? 1;
    const insertIndex = Math.max(1, endIndex - 1);
    const rowCount = 1 + table.rows.length;
    const columnCount = Math.max(1, table.headers.length);

    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertTable: {
              rows: rowCount,
              columns: columnCount,
              location: { index: insertIndex },
            },
          },
        ],
      },
    });

    const withTable = await docs.documents.get({ documentId });
    const tableElement = [...(withTable.data.body?.content ?? [])]
      .reverse()
      .find((el) => el.table);
    if (!tableElement?.table?.tableRows || tableElement.startIndex == null) {
      throw new Error("Docs batch-update failure — inserted table not found.");
    }

    const cellValues: string[][] = [table.headers, ...table.rows];
    const cells: Array<{ index: number; text: string }> = [];
    tableElement.table.tableRows.forEach((row, rIdx) => {
      row.tableCells?.forEach((cell, cIdx) => {
        const value = cellValues[rIdx]?.[cIdx] ?? "";
        const cellStart = cell.startIndex;
        if (cellStart == null) return;
        cells.push({ index: cellStart + 1, text: value });
      });
    });

    const fillRequests: docs_v1.Schema$Request[] = [];
    for (const cell of cells.sort((a, b) => b.index - a.index)) {
      if (!cell.text) continue;
      fillRequests.push({
        insertText: {
          location: { index: cell.index },
          text: cell.text,
        },
      });
    }

    if (fillRequests.length > 0) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: { requests: fillRequests },
      });
    }
  }
}

export function parseSourceFile(
  markdown: string,
  sourceFile: string,
): ParsedMarkdownDocument {
  return parseGovernanceMarkdown(markdown, sourceFile);
}
