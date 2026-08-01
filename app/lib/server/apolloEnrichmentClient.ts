import "server-only";

/**
 * Apollo.io enrichment client (HITL only — never auto-DISPATCH).
 * Auth: APOLLO_API_KEY via x-api-key header.
 * Docs: https://docs.apollo.io/docs/enrich-people-data
 */

const APOLLO_API_BASE = "https://api.apollo.io/api/v1";

export type ApolloOrgEnrichment = {
  name: string | null;
  domain: string | null;
  websiteUrl: string | null;
  phone: string | null;
  industry: string | null;
  estimatedNumEmployees: number | null;
  shortDescription: string | null;
  linkedinUrl: string | null;
};

export type ApolloPersonEnrichment = {
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  title: string | null;
  email: string | null;
  emailStatus: string | null;
  linkedinUrl: string | null;
  organizationName: string | null;
};

export type ApolloEnrichSnapshot = {
  enrichedAt: string;
  domain: string;
  organization: ApolloOrgEnrichment | null;
  person: ApolloPersonEnrichment | null;
  personMatched: boolean;
  appliedEmail: boolean;
  appliedPhone: boolean;
  notes: string[];
};

function getApolloApiKey(): string | null {
  const key = process.env.APOLLO_API_KEY?.trim();
  return key || null;
}

export function isApolloConfigured(): boolean {
  return Boolean(getApolloApiKey());
}

async function apolloFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  const apiKey = getApolloApiKey();
  if (!apiKey) {
    return { ok: false, error: "APOLLO_API_KEY is not configured", status: 503 };
  }

  try {
    const response = await fetch(`${APOLLO_API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "x-api-key": apiKey,
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(25_000),
    });
    const body = (await response.json().catch(() => ({}))) as T & {
      error?: string;
      message?: string;
    };
    if (!response.ok) {
      const msg =
        (typeof body.error === "string" && body.error) ||
        (typeof body.message === "string" && body.message) ||
        `Apollo API ${response.status}`;
      return { ok: false, error: msg, status: response.status };
    }
    return { ok: true, data: body };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Apollo request failed",
      status: 502,
    };
  }
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function enrichOrganizationByDomain(
  domain: string,
): Promise<
  | { ok: true; organization: ApolloOrgEnrichment }
  | { ok: false; error: string; status: number }
> {
  const clean = domain.trim().toLowerCase().replace(/^www\./, "");
  if (!clean) {
    return { ok: false, error: "domain is required", status: 400 };
  }

  const result = await apolloFetch<{ organization?: Record<string, unknown> }>(
    `/organizations/enrich?domain=${encodeURIComponent(clean)}`,
    { method: "GET" },
  );
  if (!result.ok) return result;

  const org = result.data.organization ?? {};
  return {
    ok: true,
    organization: {
      name: asString(org.name),
      domain: asString(org.primary_domain) ?? clean,
      websiteUrl: asString(org.website_url),
      phone: asString(org.phone),
      industry: asString(org.industry),
      estimatedNumEmployees: asNumber(org.estimated_num_employees),
      shortDescription: asString(org.short_description),
      linkedinUrl: asString(org.linkedin_url),
    },
  };
}

export async function enrichPersonByNameAndDomain(input: {
  name: string;
  domain: string;
  revealPersonalEmails?: boolean;
}): Promise<
  | { ok: true; person: ApolloPersonEnrichment | null; matched: boolean }
  | { ok: false; error: string; status: number }
> {
  const name = input.name.trim();
  const domain = input.domain.trim().toLowerCase().replace(/^www\./, "");
  if (!name || !domain) {
    return { ok: false, error: "name and domain are required", status: 400 };
  }

  const result = await apolloFetch<{
    person?: Record<string, unknown> | null;
  }>("/people/match", {
    method: "POST",
    body: JSON.stringify({
      name,
      domain,
      reveal_personal_emails: Boolean(input.revealPersonalEmails),
      reveal_phone_number: false,
    }),
  });
  if (!result.ok) return result;

  const person = result.data.person;
  if (!person || typeof person !== "object") {
    return { ok: true, person: null, matched: false };
  }

  return {
    ok: true,
    matched: true,
    person: {
      firstName: asString(person.first_name),
      lastName: asString(person.last_name),
      fullName:
        asString(person.name) ||
        [asString(person.first_name), asString(person.last_name)].filter(Boolean).join(" ") ||
        null,
      title: asString(person.title),
      email: asString(person.email),
      emailStatus: asString(person.email_status),
      linkedinUrl: asString(person.linkedin_url),
      organizationName: asString(
        (person.organization as Record<string, unknown> | undefined)?.name,
      ),
    },
  };
}
