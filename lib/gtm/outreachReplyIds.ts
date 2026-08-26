export type OutreachReplyIntakeSource = "manual" | "resend" | "zoho_forward";

export const OUTREACH_REPLY_SOURCE_PREFIX = "outreach-reply:" as const;

function normalizeEmail(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^<|>$/g, "");
}

export function extractEmailAddress(raw: string): string {
  const s = String(raw || "").trim();
  const angle = /<([^>]+@[^>]+)>/.exec(s);
  if (angle?.[1]) return normalizeEmail(angle[1]);
  const bare = /([^\s<>]+@[^\s<>]+)/.exec(s);
  return bare?.[1] ? normalizeEmail(bare[1]) : normalizeEmail(s);
}

function sanitizeIdPart(raw: string): string {
  return raw.replace(/[^a-z0-9._@+-]+/gi, "_").slice(0, 120);
}

export function buildOutreachReplySourceRef(input: {
  fromEmail: string;
  messageId?: string | null;
  source: OutreachReplyIntakeSource;
}): string {
  const email = extractEmailAddress(input.fromEmail);
  const mid = String(input.messageId || "")
    .trim()
    .replace(/^<|>$/g, "");
  if (mid) {
    return `${OUTREACH_REPLY_SOURCE_PREFIX}${sanitizeIdPart(mid.toLowerCase())}`;
  }
  const day = new Date().toISOString().slice(0, 10);
  return `${OUTREACH_REPLY_SOURCE_PREFIX}${input.source}:${sanitizeIdPart(email)}:${day}`;
}
