import { stripFrontmatter } from "@/app/lib/governanceFrame/briefingDraftValidation";

export { stripFrontmatter };

export function parseFrontmatterField(markdown: string, key: string): string | null {
  const match = markdown.match(new RegExp(`^${key}:\\s*(.+)$`, "im"));
  if (!match?.[1]) return null;
  return match[1].trim().replace(/^["']|["']$/g, "");
}

export function parseTitleFromMarkdown(markdown: string, fallback: string): string {
  const fromFront = parseFrontmatterField(markdown, "title");
  if (fromFront) return fromFront;
  const h1 = markdown.match(/^#\s+(.+)$/m);
  if (h1?.[1]) return h1[1].trim();
  return fallback;
}

/**
 * Manuscript / ops date for Publishing Desk ordering (newest first).
 * Prefer YAML `date:`, then leading YYYY-MM-DD in the queue filename.
 */
export function parseManuscriptDateFromMarkdown(
  markdown: string,
  filename?: string,
): string | null {
  const fromFront = parseFrontmatterField(markdown, "date");
  if (fromFront) {
    const iso = fromFront.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso?.[1]) return iso[1];
  }
  const fromName = filename?.match(/^(\d{4}-\d{2}-\d{2})/);
  return fromName?.[1] ?? null;
}

/** Body copy for reader — no frontmatter or duplicate title heading. */
export function briefingBodyMarkdown(markdown: string, title: string): string {
  let body = stripFrontmatter(markdown);
  const h1 = body.match(/^#\s+(.+)$/m);
  if (h1?.[1]?.trim() === title.trim()) {
    body = body.replace(/^#\s+.+$/m, "").trimStart();
  }
  return body;
}

export function extractExecutiveSummary(markdown: string): string | null {
  const body = stripFrontmatter(markdown);
  const blockquote = body.match(/^>\s*\**Executive Summary:\**\s*(.+)$/im);
  if (blockquote?.[1]) return blockquote[1].trim();
  const genericQuote = body.match(/^>\s+(.+)$/m);
  return genericQuote?.[1]?.trim() ?? null;
}
