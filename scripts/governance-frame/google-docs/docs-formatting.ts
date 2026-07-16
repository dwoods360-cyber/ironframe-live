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

function headingNamedStyle(
  level: 1 | 2 | 3,
): "HEADING_1" | "HEADING_2" | "HEADING_3" {
  if (level === 1) return "HEADING_1";
  if (level === 2) return "HEADING_2";
  return "HEADING_3";
}

function appendSpans(spans: InlineSpan[]): string {
  return spansToPlainText(spans);
}

/**
 * Build plain-text body and style ranges for a Google Docs batchUpdate.
 * Insertion uses end-of-segment index 1 (after the implicit empty paragraph).
 */
export function buildDocsPayload(
  parsed: ParsedMarkdownDocument,
  options?: {
    includeCoverFromFrontmatter?: boolean;
    forcePageBreaksForManuscript?: boolean;
  },
): {
  text: string;
  paragraphStyles: Array<{
    start: number;
    end: number;
    namedStyleType: string;
  }>;
  textStyles: Array<{ start: number; end: number; bold?: boolean; italic?: boolean }>;
  tables: Array<{ startIndex: number; headers: string[]; rows: string[][] }>;
  pageBreaks: number[];
} {
  const fm = parsed.frontmatter;
  const blocks = [...parsed.blocks];

  if (options?.forcePageBreaksForManuscript) {
    injectManuscriptPageBreaks(blocks, fm);
  }

  let text = "";
  const paragraphStyles: Array<{
    start: number;
    end: number;
    namedStyleType: string;
  }> = [];
  const textStyles: Array<{
    start: number;
    end: number;
    bold?: boolean;
    italic?: boolean;
  }> = [];
  const tables: Array<{ startIndex: number; headers: string[]; rows: string[][] }> =
    [];
  const pageBreaks: number[] = [];

  const pushParagraph = (
    spans: InlineSpan[],
    namedStyleType: string,
    prefix = "",
    suffix = "\n",
  ) => {
    const start = text.length;
    const plain = `${prefix}${appendSpans(spans)}`;
    // Track inline styles relative to absolute indices in final string.
    let cursor = start + prefix.length;
    for (const span of spans) {
      const spanStart = cursor;
      const spanEnd = cursor + span.text.length;
      if (span.bold || span.italic) {
        textStyles.push({
          start: spanStart,
          end: spanEnd,
          bold: span.bold,
          italic: span.italic,
        });
      }
      cursor = spanEnd;
    }
    text += plain + suffix;
    const end = text.length;
    paragraphStyles.push({ start, end, namedStyleType });
  };

  if (options?.includeCoverFromFrontmatter) {
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

    pushParagraph([{ text: title, bold: true }], "TITLE");
    if (subtitle) {
      pushParagraph([{ text: subtitle, italic: true }], "SUBTITLE");
    }
    pushParagraph(
      [{ text: `Research ID: ${String(fm.researchId ?? "GF-2026-001")}` }],
      "NORMAL_TEXT",
    );
    pushParagraph(
      [{ text: `Version: ${String(fm.version ?? "")}` }],
      "NORMAL_TEXT",
    );
    pushParagraph(
      [{ text: `Status: ${String(fm.status ?? "")}` }],
      "NORMAL_TEXT",
    );
    pushParagraph(
      [{ text: `Classification: ${String(fm.classification ?? "")}` }],
      "NORMAL_TEXT",
    );
    pushParagraph(
      [{ text: `Publisher: ${String(fm.publisher ?? "Governance Frame Research")}` }],
      "NORMAL_TEXT",
    );
    pushParagraph(
      [
        {
          text: `Canonical repository path: ${String(
            fm.canonicalRepositoryPath ?? "",
          )}`,
        },
      ],
      "NORMAL_TEXT",
    );
    pushParagraph(
      [{ text: "Internal metadata — Governance Frame collaborative editorial copy." }],
      "NORMAL_TEXT",
    );
    pageBreaks.push(text.length);
    text += "\n";

    // Skip duplicate title/subtitle blocks from body when cover was built from FM.
    // Keep other content.
  }

  let skipLeadingTitle = Boolean(options?.includeCoverFromFrontmatter);
  let skipLeadingSubtitle = Boolean(options?.includeCoverFromFrontmatter);

  for (const block of blocks) {
    if (block.type === "title" && skipLeadingTitle) {
      skipLeadingTitle = false;
      continue;
    }
    if (block.type === "subtitle" && skipLeadingSubtitle) {
      skipLeadingSubtitle = false;
      continue;
    }

    switch (block.type) {
      case "title":
        pushParagraph(block.spans, "TITLE");
        break;
      case "subtitle":
        pushParagraph(block.spans, "SUBTITLE");
        break;
      case "heading":
        pushParagraph(block.spans, headingNamedStyle(block.level));
        break;
      case "paragraph":
        pushParagraph(block.spans, "NORMAL_TEXT");
        break;
      case "blockquote":
        pushParagraph(block.spans, "NORMAL_TEXT", "> ");
        break;
      case "unordered_list":
        for (const item of block.items) {
          pushParagraph(item, "NORMAL_TEXT", "• ");
        }
        break;
      case "ordered_list":
        block.items.forEach((item, idx) => {
          pushParagraph(item, "NORMAL_TEXT", `${idx + 1}. `);
        });
        break;
      case "toc_placeholder":
        pushParagraph(
          [
            {
              text: "Table of Contents — refresh in Google Docs after heading updates",
              italic: true,
            },
          ],
          "NORMAL_TEXT",
        );
        break;
      case "page_break":
        pageBreaks.push(text.length);
        text += "\n";
        break;
      case "table": {
        // Placeholder paragraph; table inserted at this index via insertTable.
        const markerStart = text.length;
        text += "\n";
        tables.push({
          startIndex: markerStart,
          headers: block.headers,
          rows: block.rows,
        });
        break;
      }
      default:
        break;
    }
  }

  if (!text.endsWith("\n")) {
    text += "\n";
  }

  return { text, paragraphStyles, textStyles, tables, pageBreaks };
}

function injectManuscriptPageBreaks(
  blocks: ContentBlock[],
  fm: ManuscriptFrontmatter,
): void {
  // Ensure TOC placeholder after cover (caller adds cover separately).
  const hasToc = blocks.some((b) => b.type === "toc_placeholder");
  if (!hasToc) {
    // Insert after title/subtitle cluster
    let insertAt = 0;
    while (
      insertAt < blocks.length &&
      (blocks[insertAt]?.type === "title" || blocks[insertAt]?.type === "subtitle")
    ) {
      insertAt += 1;
    }
    blocks.splice(
      insertAt,
      0,
      { type: "page_break", line: 0 },
      { type: "toc_placeholder", line: 0 },
      { type: "page_break", line: 0 },
    );
  }

  const ensureBreakBeforeHeading = (matcher: RegExp) => {
    const idx = blocks.findIndex(
      (b) =>
        b.type === "heading" &&
        spansToPlainText(b.spans).trim().match(matcher),
    );
    if (idx > 0 && blocks[idx - 1]?.type !== "page_break") {
      blocks.splice(idx, 0, { type: "page_break", line: 0 });
    }
  };

  ensureBreakBeforeHeading(/^#?\s*8\.?\s*References|^References$/i);
  ensureBreakBeforeHeading(/^#?\s*9\.?\s*Appendices|^Appendices$/i);

  // Also match manuscript scaffold headings "# References" / "# Appendices"
  void fm;
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
    const text = marker + payload.text;
    await insertTextAndStyles(docs, documentId, text, payload, true);
    return;
  }

  await clearDocumentBody(docs, documentId);
  const payload = buildDocsPayload(parsed, {
    includeCoverFromFrontmatter: options?.includeCoverFromFrontmatter,
    forcePageBreaksForManuscript: options?.forcePageBreaksForManuscript,
  });
  await insertTextAndStyles(docs, documentId, payload.text, payload, false);
}

async function insertTextAndStyles(
  docs: Docs,
  documentId: string,
  text: string,
  payload: ReturnType<typeof buildDocsPayload>,
  append: boolean,
): Promise<void> {
  try {
    let insertAt = 1;
    if (append) {
      const current = await docs.documents.get({ documentId });
      const endIndex = current.data.body?.content?.slice(-1)?.[0]?.endIndex ?? 1;
      insertAt = Math.max(1, endIndex - 1);
    }

    const requests: docs_v1.Schema$Request[] = [
      {
        insertText: {
          location: { index: insertAt },
          text,
        },
      },
    ];

    // Page breaks (from highest index to lowest after insert — apply after text insert using absolute indices)
    for (const breakAt of [...payload.pageBreaks].sort((a, b) => b - a)) {
      requests.push({
        insertPageBreak: {
          location: { index: insertAt + breakAt },
        },
      });
    }

    for (const style of payload.paragraphStyles) {
      if (style.end <= style.start) continue;
      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: insertAt + style.start,
            endIndex: insertAt + style.end,
          },
          paragraphStyle: {
            namedStyleType: style.namedStyleType,
          },
          fields: "namedStyleType",
        },
      });
    }

    for (const style of payload.textStyles) {
      if (style.end <= style.start) continue;
      requests.push({
        updateTextStyle: {
          range: {
            startIndex: insertAt + style.start,
            endIndex: insertAt + style.end,
          },
          textStyle: {
            bold: Boolean(style.bold),
            italic: Boolean(style.italic),
          },
          fields: "bold,italic",
        },
      });
    }

    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests },
    });

    // Tables: insert after body text. Indices shift after page breaks — re-read doc and append tables at end.
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

    // Populate cells: fetch structure and write cell text from end to start.
    const withTable = await docs.documents.get({ documentId });
    const tableElement = [...(withTable.data.body?.content ?? [])]
      .reverse()
      .find((el) => el.table);
    if (!tableElement?.table?.tableRows || tableElement.startIndex == null) {
      throw new Error("Docs batch-update failure — inserted table not found.");
    }

    const cellValues: string[][] = [table.headers, ...table.rows];
    const fillRequests: docs_v1.Schema$Request[] = [];

    // Collect cell content start indices (write reverse to preserve indices).
    const cells: Array<{ index: number; text: string }> = [];
    tableElement.table.tableRows.forEach((row, rIdx) => {
      row.tableCells?.forEach((cell, cIdx) => {
        const value = cellValues[rIdx]?.[cIdx] ?? "";
        const cellStart = cell.startIndex;
        if (cellStart == null) return;
        // Content typically starts at cellStart + 1
        cells.push({ index: cellStart + 1, text: value });
      });
    });

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
