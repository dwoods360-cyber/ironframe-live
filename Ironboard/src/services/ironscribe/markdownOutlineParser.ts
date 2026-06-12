import type { DocsMatrixCategory, IronscribeParsedDocument } from '../../types/boardKnowledge.js';
import { ironscribeParsedDocumentSchema } from '../../types/boardKnowledge.js';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
const HEADING_RE = /^(#{2,4})\s+(.+)$/gm;
const OUTLINE_ITEM_RE = /^\d+\.\s+(.+)$/;

export type IronscribeParseInput = {
  relativePath: string;
  docCategory: DocsMatrixCategory;
  rawMarkdown: string;
  parsedAt?: string;
};

function parseFrontmatter(raw: string): { metadata: Record<string, string>; body: string } {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    return { metadata: {}, body: raw.trim() };
  }

  const metadata: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':');
    if (colon <= 0) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (key) metadata[key] = value;
  }

  return { metadata, body: match[2].trim() };
}

function extractTitle(body: string, metadata: Record<string, string>, fileName: string): string {
  const h1 = body.match(/^#\s+(.+)$/m);
  if (h1?.[1]) return h1[1].trim();
  if (metadata['Document Type']) return metadata['Document Type'].trim();
  return fileName.replace(/\.md$/i, '').replace(/[-_]/g, ' ');
}

function splitSections(body: string): IronscribeParsedDocument['sections'] {
  const headings: Array<{ heading: string; level: number; lineStart: number; contentStart: number }> = [];
  let match: RegExpExecArray | null;
  HEADING_RE.lastIndex = 0;

  while ((match = HEADING_RE.exec(body)) !== null) {
    headings.push({
      heading: match[2].trim(),
      level: match[1].length,
      lineStart: match.index,
      contentStart: match.index + match[0].length,
    });
  }

  if (!headings.length) {
    return [
      {
        heading: 'Document Body',
        level: 2,
        body,
        outlineItems: [],
      },
    ];
  }

  return headings.map((section, index) => {
    const contentEnd =
      index + 1 < headings.length ? headings[index + 1].lineStart : body.length;
    const slice = body.slice(section.contentStart, contentEnd).trim();
    const outlineItems: IronscribeParsedDocument['sections'][number]['outlineItems'] = [];
    for (const line of slice.split('\n')) {
      const item = line.trim().match(OUTLINE_ITEM_RE);
      if (item?.[1]) {
        outlineItems.push({ index: outlineItems.length + 1, text: item[1].trim() });
      }
    }
    return {
      heading: section.heading,
      level: section.level,
      body: slice,
      outlineItems,
    };
  });
}

function buildDocumentId(relativePath: string): string {
  return relativePath.replace(/\\/g, '/').toLowerCase();
}

/** Agent 05 (Ironscribe): strip YAML metadata headers and structure markdown outlines. */
export function parseIronscribeMarkdownDocument(input: IronscribeParseInput): IronscribeParsedDocument {
  const { metadata, body } = parseFrontmatter(input.rawMarkdown);
  const normalizedPath = input.relativePath.replace(/\\/g, '/');
  const fileName = normalizedPath.split('/').pop() ?? normalizedPath;
  const title = extractTitle(body, metadata, fileName);
  const sections = splitSections(body);
  const outlineFlat = sections.flatMap(section =>
    section.outlineItems.length
      ? section.outlineItems.map(item => item.text)
      : section.body
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('- ') || line.startsWith('* '))
          .map(line => line.replace(/^[-*]\s+/, '')),
  );

  const parsed: IronscribeParsedDocument = {
    documentId: buildDocumentId(normalizedPath),
    title,
    relativePath: normalizedPath,
    docCategory: input.docCategory,
    fileName,
    metadata,
    sections,
    bodyMarkdown: body,
    outlineFlat,
    parsedBy: 'Ironscribe-Agent-05',
    parsedAt: input.parsedAt ?? new Date().toISOString(),
  };

  return ironscribeParsedDocumentSchema.parse(parsed);
}
