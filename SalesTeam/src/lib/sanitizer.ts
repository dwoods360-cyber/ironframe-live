export function sanitizeText(raw: unknown, maxLen: number): string {
  return String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[STRIPPED]')
    .trim()
    .slice(0, maxLen);
}

export function sanitizeEmail(raw: unknown): string | undefined {
  const email = sanitizeText(raw, 320).toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return undefined;
  return email;
}
