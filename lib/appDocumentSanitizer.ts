/**
 * Stored-content XSS mitigation at the documentation rendering boundary.
 * ReactMarkdown does not parse raw HTML without rehype-raw; this strips obvious injection vectors first.
 */
export function sanitizeAppDocumentContent(raw: string): string {
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/\bon\w+\s*=/gi, "data-blocked=");
}
