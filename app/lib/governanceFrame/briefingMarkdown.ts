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
