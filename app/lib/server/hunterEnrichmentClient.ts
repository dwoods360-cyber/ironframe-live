import "server-only";

/**
 * Hunter.io enrichment client (HITL only — never auto-DISPATCH).
 * Auth: HUNTER_API_KEY query param (Email Finder).
 * Docs: https://hunter.io/api-documentation/v2#email-finder
 *
 * Gatekeeper: only treat verification.status === "valid" as Email PASS material.
 * accept_all / unknown / webmail / disposable stay non-promote auto-apply.
 */

const HUNTER_EMAIL_FINDER_URL = "https://api.hunter.io/v2/email-finder";

export type HunterPersonEnrichment = {
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  title: string | null;
  email: string | null;
  emailStatus: string | null;
  score: number | null;
  linkedinUrl: string | null;
  organizationName: string | null;
};

export type HunterEnrichSnapshot = {
  enrichedAt: string;
  domain: string;
  person: HunterPersonEnrichment | null;
  personMatched: boolean;
  appliedEmail: boolean;
  notes: string[];
};

function getHunterApiKey(): string | null {
  const key = process.env.HUNTER_API_KEY?.trim();
  if (!key || key === "[SENSITIVE]") return null;
  return key;
}

export function isHunterConfigured(): boolean {
  return Boolean(getHunterApiKey());
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

/** Extract LinkedIn vanity handle from a full profile URL when possible. */
export function linkedinHandleFromUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const m = url.trim().match(/linkedin\.com\/in\/([^/?#]+)/i);
  if (!m?.[1]) return null;
  try {
    return decodeURIComponent(m[1]).replace(/\/+$/, "") || null;
  } catch {
    return m[1].replace(/\/+$/, "") || null;
  }
}

export function isHunterEmailPromoteReady(status: string | null | undefined): boolean {
  return String(status ?? "")
    .trim()
    .toLowerCase() === "valid";
}

export async function enrichPersonWithHunter(input: {
  domain: string;
  companyName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  linkedinUrl?: string | null;
}): Promise<
  | { ok: true; person: HunterPersonEnrichment | null; matched: boolean }
  | { ok: false; error: string; status: number }
> {
  const apiKey = getHunterApiKey();
  if (!apiKey) {
    return { ok: false, error: "HUNTER_API_KEY is not configured", status: 503 };
  }

  const domain = input.domain.trim().toLowerCase().replace(/^www\./, "");
  const firstName = input.firstName?.trim() || null;
  const lastName = input.lastName?.trim() || null;
  const fullName = input.fullName?.trim() || null;
  const linkedinHandle = linkedinHandleFromUrl(input.linkedinUrl);

  if (!domain && !input.companyName?.trim() && !linkedinHandle) {
    return {
      ok: false,
      error: "domain, company, or LinkedIn URL is required for Hunter",
      status: 400,
    };
  }
  if (!linkedinHandle && !fullName && !(firstName && lastName)) {
    return {
      ok: false,
      error: "first+last name, full name, or LinkedIn URL is required for Hunter",
      status: 400,
    };
  }

  const params = new URLSearchParams();
  params.set("api_key", apiKey);
  if (domain) params.set("domain", domain);
  if (input.companyName?.trim()) params.set("company", input.companyName.trim());
  if (firstName) params.set("first_name", firstName);
  if (lastName) params.set("last_name", lastName);
  if (fullName && !(firstName && lastName)) params.set("full_name", fullName);
  if (linkedinHandle) params.set("linkedin_handle", linkedinHandle);

  try {
    const response = await fetch(`${HUNTER_EMAIL_FINDER_URL}?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(45_000),
    });

    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const errors = Array.isArray(body.errors) ? body.errors : null;
      const firstErr =
        errors && errors[0] && typeof errors[0] === "object"
          ? asString((errors[0] as Record<string, unknown>).details) ||
            asString((errors[0] as Record<string, unknown>).id)
          : null;
      const msg =
        firstErr ||
        asString(body.message) ||
        asString(body.error) ||
        `Hunter API ${response.status}`;
      // Soft miss — no charge when not found
      if (response.status === 404 || /not.?found|no.?result/i.test(msg)) {
        return { ok: true, person: null, matched: false };
      }
      return { ok: false, error: msg, status: response.status };
    }

    const data =
      body.data && typeof body.data === "object" && !Array.isArray(body.data)
        ? (body.data as Record<string, unknown>)
        : null;
    if (!data) {
      return { ok: true, person: null, matched: false };
    }

    const email = asString(data.email);
    const verification =
      data.verification && typeof data.verification === "object" && !Array.isArray(data.verification)
        ? (data.verification as Record<string, unknown>)
        : null;
    const emailStatus = asString(verification?.status);
    const first = asString(data.first_name) || firstName;
    const last = asString(data.last_name) || lastName;

    return {
      ok: true,
      matched: Boolean(email),
      person: email
        ? {
            firstName: first,
            lastName: last,
            fullName:
              [first, last].filter(Boolean).join(" ") || fullName || null,
            title: asString(data.position),
            email,
            emailStatus,
            score: asNumber(data.score),
            linkedinUrl: asString(data.linkedin_url) || input.linkedinUrl?.trim() || null,
            organizationName: asString(data.company) || input.companyName?.trim() || null,
          }
        : null,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Hunter request failed",
      status: 502,
    };
  }
}
