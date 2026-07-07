const SCRIPT_RE = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const TAG_RE = /<[^>]+>/g;

/** Deterministic text sanitizer — no LLM security gate. */
export function stripHtml(raw: string): string {
  return raw.replace(SCRIPT_RE, '[STRIPPED]').replace(TAG_RE, ' ').replace(/\s+/g, ' ').trim();
}

export function sanitizeCompanyName(raw: string): string {
  return stripHtml(raw)
    .replace(/[^\w\s&.,'()\-—]/g, '')
    .trim()
    .slice(0, 255);
}

export function sanitizeTrigger(raw: string): string {
  return stripHtml(raw)
    .toUpperCase()
    .replace(/[^A-Z0-9_,| -]/g, '')
    .trim()
    .slice(0, 120);
}

export function sanitizeEmail(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const email = stripHtml(raw).toLowerCase().slice(0, 320);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
}

export function sanitizeDomain(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const domain = stripHtml(raw)
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .slice(0, 255);
  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(domain) ? domain : undefined;
}

export function truncateText(raw: string, maxLen: number): string {
  return stripHtml(raw).slice(0, maxLen);
}
