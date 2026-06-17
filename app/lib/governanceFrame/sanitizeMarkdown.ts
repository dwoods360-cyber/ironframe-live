const SCRIPT_BLOCK = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const IFRAME_BLOCK = /<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi;
const OBJECT_BLOCK = /<object\b[^>]*>[\s\S]*?<\/object>/gi;
const EMBED_BLOCK = /<embed\b[^>]*\/?>/gi;
const INLINE_EVENT_HANDLER = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JAVASCRIPT_URI = /javascript:/gi;

/**
 * Defense-in-depth: strip executable HTML before react-markdown compilation.
 * react-markdown does not enable raw HTML by default; this guards compromised drafts.
 */
export function stripDangerousMarkdown(source: string): string {
  return source
    .replace(SCRIPT_BLOCK, "")
    .replace(IFRAME_BLOCK, "")
    .replace(OBJECT_BLOCK, "")
    .replace(EMBED_BLOCK, "")
    .replace(INLINE_EVENT_HANDLER, "")
    .replace(JAVASCRIPT_URI, "");
}

/** Block dangerous URL schemes in markdown links/images. */
export function sanitizeMarkdownUrl(url: string): string {
  const trimmed = url.trim();
  if (/^(javascript|vbscript|data):/i.test(trimmed)) return "";
  return trimmed;
}

export const DISALLOWED_MARKDOWN_ELEMENTS = [
  "script",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "style",
  "link",
  "meta",
] as const;
