import "server-only";

import dns from "node:dns/promises";

/**
 * Research-time mailbox hygiene (tiers 1–2 only).
 * Format + MX prove routability risk reduction — not ownership or deliverability.
 * Do not use SMTP RCPT or confirmation sends for cold Ironleads research.
 */

const EMAIL_RE =
  /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

const DOMAIN_MX_CACHE = new Map<string, { at: number; hosts: string[] | null; error: string | null }>();
const MX_CACHE_TTL_MS = 15 * 60 * 1000;

export type MailboxHygieneResult = {
  email: string;
  /** Passed format + at least one MX (or A/AAAA fallback when MX empty is not allowed — we require MX). */
  ok: boolean;
  formatOk: boolean;
  /** true = MX present; false = none; null = DNS lookup failed */
  mxOk: boolean | null;
  mxHosts: string[];
  reason: string;
  checkedAt: string;
};

export function normalizeEmailAddress(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateEmailFormat(raw: string): boolean {
  const email = normalizeEmailAddress(raw);
  if (!email || email.length > 254) return false;
  if (email.includes("..") || email.includes(" ") || email.startsWith(".") || email.includes("@.")) {
    return false;
  }
  return EMAIL_RE.test(email);
}

async function lookupMxHosts(domain: string): Promise<{ hosts: string[]; error: string | null }> {
  const key = domain.toLowerCase();
  const cached = DOMAIN_MX_CACHE.get(key);
  if (cached && Date.now() - cached.at < MX_CACHE_TTL_MS) {
    return { hosts: cached.hosts ?? [], error: cached.error };
  }

  try {
    const records = await dns.resolveMx(key);
    const hosts = [...records]
      .sort((a, b) => a.priority - b.priority)
      .map((r) => r.exchange)
      .filter(Boolean);
    DOMAIN_MX_CACHE.set(key, { at: Date.now(), hosts, error: null });
    return { hosts, error: null };
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err ? String((err as { code?: string }).code) : "";
    // ENODATA / ENOTFOUND → no MX; other codes → unknown
    if (code === "ENODATA" || code === "ENOTFOUND" || code === "ENAME_NOT_FOUND") {
      DOMAIN_MX_CACHE.set(key, { at: Date.now(), hosts: [], error: null });
      return { hosts: [], error: null };
    }
    const message = err instanceof Error ? err.message : "DNS MX lookup failed";
    DOMAIN_MX_CACHE.set(key, { at: Date.now(), hosts: null, error: message });
    return { hosts: [], error: message };
  }
}

/** Clear MX cache (unit tests). */
export function clearMailboxHygieneCache(): void {
  DOMAIN_MX_CACHE.clear();
}

export async function checkMailboxHygiene(raw: string): Promise<MailboxHygieneResult> {
  const checkedAt = new Date().toISOString();
  const email = normalizeEmailAddress(raw);
  const formatOk = validateEmailFormat(email);

  if (!formatOk) {
    return {
      email,
      ok: false,
      formatOk: false,
      mxOk: null,
      mxHosts: [],
      reason: "format_invalid",
      checkedAt,
    };
  }

  const domain = email.split("@")[1] ?? "";
  const { hosts, error } = await lookupMxHosts(domain);

  if (error) {
    return {
      email,
      ok: false,
      formatOk: true,
      mxOk: null,
      mxHosts: [],
      reason: "mx_lookup_failed",
      checkedAt,
    };
  }

  if (hosts.length === 0) {
    return {
      email,
      ok: false,
      formatOk: true,
      mxOk: false,
      mxHosts: [],
      reason: "mx_missing",
      checkedAt,
    };
  }

  return {
    email,
    ok: true,
    formatOk: true,
    mxOk: true,
    mxHosts: hosts.slice(0, 5),
    reason: "mx_ok",
    checkedAt,
  };
}

export async function checkMailboxHygieneMany(
  emails: readonly string[],
): Promise<Map<string, MailboxHygieneResult>> {
  const unique = [...new Set(emails.map(normalizeEmailAddress).filter(Boolean))];
  const out = new Map<string, MailboxHygieneResult>();
  // Domain-level cache makes sequential lookups cheap; keep concurrency modest.
  const concurrency = 4;
  for (let i = 0; i < unique.length; i += concurrency) {
    const chunk = unique.slice(i, i + concurrency);
    const results = await Promise.all(chunk.map((email) => checkMailboxHygiene(email)));
    for (const row of results) out.set(row.email, row);
  }
  return out;
}

export function mailboxHygieneLabel(result: MailboxHygieneResult | null | undefined): string {
  if (!result) return "unchecked";
  if (result.reason === "format_invalid") return "format_invalid";
  if (result.reason === "mx_missing") return "mx_missing";
  if (result.reason === "mx_lookup_failed") return "mx_unknown";
  if (result.reason === "mx_ok") return "mx_ok";
  return result.reason;
}
