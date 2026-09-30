import "server-only";

/**
 * GetProspect email finder (confirmed buyer + domain). Never auto-DISPATCH.
 * Auth: GETPROSPECT_API_KEY in the x-api-key header.
 * Docs: POST https://api.getprospect.com/v2/email/find
 *
 * A credit is spent only when status is "valid". not_found and catch-all
 * domains come back as not_found and are not saved.
 * status "valid" is the mailbox verdict. domain_status "accept_all" on that
 * same payload means the domain is catch-all but this mailbox was confirmed.
 */

const GETPROSPECT_FIND_URL = "https://api.getprospect.com/v2/email/find";

export type GetProspectPersonEnrichment = {
  email: string | null;
  emailStatus: string | null;
  domain: string | null;
  domainStatus: string | null;
  freeEmail: boolean;
};

export type GetProspectEnrichSnapshot = {
  enrichedAt: string;
  domain: string;
  person: GetProspectPersonEnrichment | null;
  personMatched: boolean;
  appliedEmail: boolean;
  notes: string[];
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function getApiKey(): string | null {
  const key = process.env.GETPROSPECT_API_KEY?.trim();
  if (!key || key === "[SENSITIVE]") return null;
  return key;
}

export function isGetProspectConfigured(): boolean {
  return Boolean(getApiKey());
}

export function isGetProspectEmailPromoteReady(input: {
  emailStatus: string | null | undefined;
  freeEmail?: boolean;
}): boolean {
  if (input.freeEmail) return false;
  return String(input.emailStatus ?? "").trim().toLowerCase() === "valid";
}

export function parseGetProspectFindPayload(payload: unknown): GetProspectPersonEnrichment | null {
  const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  const data =
    root?.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : null;
  if (!data) return null;
  const emailStatus = asString(data.status);
  const email = asString(data.email);
  if (!email || !emailStatus || emailStatus.toLowerCase() === "not_found") {
    return emailStatus
      ? {
          email: null,
          emailStatus,
          domain: asString(data.domain),
          domainStatus: asString(data.domain_status),
          freeEmail: data.free_email === true,
        }
      : null;
  }
  return {
    email,
    emailStatus,
    domain: asString(data.domain),
    domainStatus: asString(data.domain_status),
    freeEmail: data.free_email === true,
  };
}

export async function enrichPersonWithGetProspect(input: {
  domain: string;
  firstName: string;
  lastName: string;
}): Promise<
  | { ok: true; person: GetProspectPersonEnrichment | null; matched: boolean }
  | { ok: false; error: string; status: number }
> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { ok: false, error: "GETPROSPECT_API_KEY is not configured", status: 503 };
  }
  const domain = input.domain.trim().toLowerCase().replace(/^www\./, "");
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!domain || !firstName || !lastName) {
    return {
      ok: false,
      error: "first name, last name, and domain are required for GetProspect",
      status: 400,
    };
  }

  try {
    const response = await fetch(GETPROSPECT_FIND_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        data: { first_name: firstName, last_name: lastName, domain },
      }),
      signal: AbortSignal.timeout(45_000),
    });
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      return {
        ok: false,
        error: asString(body.message) || asString(body.error) || `GetProspect API ${response.status}`,
        status: response.status,
      };
    }
    const person = parseGetProspectFindPayload(body);
    const matched = Boolean(person?.email);
    return { ok: true, person: matched ? person : person, matched };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "GetProspect request failed",
      status: 502,
    };
  }
}
