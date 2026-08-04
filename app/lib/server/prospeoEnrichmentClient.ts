import "server-only";

/**
 * Prospeo enrichment client (HITL only — never auto-DISPATCH).
 * Auth: PROSPEO_API_KEY via X-KEY header.
 * Endpoint: POST https://api.prospeo.io/enrich-person
 */

const PROSPEO_ENRICH_PERSON_URL = "https://api.prospeo.io/enrich-person";

export type ProspeoPersonEnrichment = {
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  title: string | null;
  email: string | null;
  emailStatus: string | null;
  linkedinUrl: string | null;
  organizationName: string | null;
  freeEnrichment: boolean;
};

export type ProspeoEnrichSnapshot = {
  enrichedAt: string;
  domain: string;
  person: ProspeoPersonEnrichment | null;
  personMatched: boolean;
  appliedEmail: boolean;
  notes: string[];
};

function getProspeoApiKey(): string | null {
  const key = process.env.PROSPEO_API_KEY?.trim();
  return key || null;
}

export function isProspeoConfigured(): boolean {
  return Boolean(getProspeoApiKey());
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function extractEmail(person: Record<string, unknown>): {
  email: string | null;
  status: string | null;
} {
  const emailObj = person.email;
  if (typeof emailObj === "string") {
    return { email: asString(emailObj), status: null };
  }
  if (emailObj && typeof emailObj === "object" && !Array.isArray(emailObj)) {
    const rec = emailObj as Record<string, unknown>;
    return {
      email: asString(rec.email) ?? asString(rec.revealed),
      status: asString(rec.status),
    };
  }
  return { email: null, status: null };
}

export async function enrichPersonWithProspeo(input: {
  fullName: string;
  domain: string;
  companyName?: string | null;
  linkedinUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  onlyVerifiedEmail?: boolean;
}): Promise<
  | { ok: true; person: ProspeoPersonEnrichment | null; matched: boolean }
  | { ok: false; error: string; status: number }
> {
  const apiKey = getProspeoApiKey();
  if (!apiKey) {
    return { ok: false, error: "PROSPEO_API_KEY is not configured", status: 503 };
  }

  const fullName = input.fullName.trim();
  const domain = input.domain.trim().toLowerCase().replace(/^www\./, "");
  if (!fullName || !domain) {
    return { ok: false, error: "fullName and domain are required", status: 400 };
  }

  const data: Record<string, string> = {
    full_name: fullName,
    company_website: domain,
  };
  if (input.companyName?.trim()) data.company_name = input.companyName.trim();
  if (input.linkedinUrl?.trim()) data.linkedin_url = input.linkedinUrl.trim();
  if (input.firstName?.trim()) data.first_name = input.firstName.trim();
  if (input.lastName?.trim()) data.last_name = input.lastName.trim();

  try {
    const response = await fetch(PROSPEO_ENRICH_PERSON_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-KEY": apiKey,
      },
      body: JSON.stringify({
        only_verified_email: Boolean(input.onlyVerifiedEmail),
        enrich_mobile: false,
        data,
      }),
      signal: AbortSignal.timeout(45_000),
    });

    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const errorCode = asString(body.error_code);
      // Prospeo returns HTTP 400 NO_MATCH when the person is not in their DB —
      // treat as a soft miss (persistible) rather than an operator fault.
      if (errorCode === "NO_MATCH") {
        return { ok: true, person: null, matched: false };
      }
      const msg =
        asString(body.error) ||
        asString(body.message) ||
        errorCode ||
        `Prospeo API ${response.status}`;
      return { ok: false, error: msg, status: response.status };
    }

    const personRaw = body.person;
    if (!personRaw || typeof personRaw !== "object" || Array.isArray(personRaw)) {
      return { ok: true, person: null, matched: false };
    }

    const person = personRaw as Record<string, unknown>;
    const { email, status } = extractEmail(person);
    const company =
      person.company && typeof person.company === "object" && !Array.isArray(person.company)
        ? (person.company as Record<string, unknown>)
        : null;

    return {
      ok: true,
      matched: Boolean(email || asString(person.linkedin_url) || asString(person.current_job_title)),
      person: {
        firstName: asString(person.first_name),
        lastName: asString(person.last_name),
        fullName:
          asString(person.full_name) ||
          [asString(person.first_name), asString(person.last_name)].filter(Boolean).join(" ") ||
          fullName,
        title: asString(person.current_job_title),
        email,
        emailStatus: status,
        linkedinUrl: asString(person.linkedin_url),
        organizationName:
          asString(company?.name) || asString(person.current_company) || null,
        freeEnrichment: Boolean(body.free_enrichment),
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Prospeo request failed",
      status: 502,
    };
  }
}
