import "server-only";

/**
 * Snov.io email finder (confirmed buyer + domain). Never auto-DISPATCH.
 * Auth: SNOV_CLIENT_ID + SNOV_CLIENT_SECRET → Bearer token.
 * Docs: POST /v2/emails-by-domain-by-name/start then GET /result.
 *
 * Gatekeeper: smtp_status === "valid" only. unknown / not_valid / catch-all
 * and disposable, webmail, or gibberish addresses never auto-apply.
 */

const SNOV_TOKEN_URL = "https://api.snov.io/v1/oauth/access_token";
const SNOV_START_URL = "https://api.snov.io/v2/emails-by-domain-by-name/start";
const SNOV_RESULT_URL = "https://api.snov.io/v2/emails-by-domain-by-name/result";

export type SnovPersonEnrichment = {
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string | null;
  emailStatus: string | null;
  isDisposable: boolean;
  isWebmail: boolean;
  isGibberish: boolean;
};

export type SnovEnrichSnapshot = {
  enrichedAt: string;
  domain: string;
  person: SnovPersonEnrichment | null;
  personMatched: boolean;
  appliedEmail: boolean;
  notes: string[];
};

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function asBool(value: unknown): boolean {
  return value === true || value === "true" || value === 1;
}

function clientCredentials(): { id: string; secret: string } | null {
  const id = process.env.SNOV_CLIENT_ID?.trim();
  const secret = process.env.SNOV_CLIENT_SECRET?.trim();
  if (!id || !secret || id === "[SENSITIVE]" || secret === "[SENSITIVE]") return null;
  return { id, secret };
}

export function isSnovConfigured(): boolean {
  return Boolean(clientCredentials());
}

export function isSnovEmailPromoteReady(input: {
  emailStatus: string | null | undefined;
  isDisposable?: boolean;
  isWebmail?: boolean;
  isGibberish?: boolean;
}): boolean {
  if (input.isDisposable || input.isWebmail || input.isGibberish) return false;
  return String(input.emailStatus ?? "").trim().toLowerCase() === "valid";
}

/** Pick the first valid employer hit, otherwise the first returned address. */
export function pickSnovEmailHit(payload: unknown): SnovPersonEnrichment | null {
  const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  const data = Array.isArray(root?.data) ? root.data : [];
  const hits: SnovPersonEnrichment[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const person = row as Record<string, unknown>;
    const fullName = asString(person.people);
    const results = Array.isArray(person.result) ? person.result : [];
    for (const raw of results) {
      if (!raw || typeof raw !== "object") continue;
      const hit = raw as Record<string, unknown>;
      const email = asString(hit.email);
      if (!email) continue;
      const parts = (fullName ?? "").split(/\s+/).filter(Boolean);
      hits.push({
        firstName: parts[0] ?? null,
        lastName: parts.length > 1 ? parts[parts.length - 1]! : null,
        fullName,
        email,
        emailStatus: asString(hit.smtp_status),
        isDisposable: asBool(hit.is_disposable),
        isWebmail: asBool(hit.is_webmail),
        isGibberish: asBool(hit.is_gibberish),
      });
    }
  }
  return (
    hits.find((hit) => isSnovEmailPromoteReady(hit)) ??
    hits[0] ??
    null
  );
}

async function getAccessToken(): Promise<{ ok: true; token: string } | { ok: false; error: string; status: number }> {
  const creds = clientCredentials();
  if (!creds) {
    return { ok: false, error: "SNOV_CLIENT_ID and SNOV_CLIENT_SECRET are not configured", status: 503 };
  }
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return { ok: true, token: tokenCache.token };
  }
  try {
    const body = new URLSearchParams();
    body.set("grant_type", "client_credentials");
    body.set("client_id", creds.id);
    body.set("client_secret", creds.secret);
    const response = await fetch(SNOV_TOKEN_URL, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const token = asString(json.access_token);
    if (!response.ok || !token) {
      return {
        ok: false,
        error: asString(json.error_description) || asString(json.error) || `Snov auth ${response.status}`,
        status: response.status || 502,
      };
    }
    const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 3600;
    tokenCache = { token, expiresAt: Date.now() + expiresIn * 1000 };
    return { ok: true, token };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Snov auth failed",
      status: 502,
    };
  }
}

function taskStatus(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  return asString((payload as Record<string, unknown>).status);
}

export async function enrichPersonWithSnov(input: {
  domain: string;
  firstName: string;
  lastName: string;
  fullName?: string | null;
}): Promise<
  | { ok: true; person: SnovPersonEnrichment | null; matched: boolean }
  | { ok: false; error: string; status: number }
> {
  const auth = await getAccessToken();
  if (!auth.ok) return auth;

  const domain = input.domain.trim().toLowerCase().replace(/^www\./, "");
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!domain || !firstName || !lastName) {
    return { ok: false, error: "first name, last name, and domain are required for Snov", status: 400 };
  }

  try {
    const start = await fetch(SNOV_START_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rows: [{ first_name: firstName, last_name: lastName, domain }],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    const started = (await start.json().catch(() => ({}))) as Record<string, unknown>;
    if (!start.ok) {
      return {
        ok: false,
        error: asString(started.message) || asString(started.error) || `Snov API ${start.status}`,
        status: start.status,
      };
    }
    const data = started.data && typeof started.data === "object" ? (started.data as Record<string, unknown>) : null;
    const taskHash = asString(data?.task_hash) || asString(started.task_hash);
    if (!taskHash) {
      return { ok: false, error: "Snov did not return a task hash", status: 502 };
    }

    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1_500));
      const result = await fetch(`${SNOV_RESULT_URL}?task_hash=${encodeURIComponent(taskHash)}`, {
        method: "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${auth.token}` },
        signal: AbortSignal.timeout(20_000),
      });
      const body = (await result.json().catch(() => ({}))) as Record<string, unknown>;
      if (!result.ok) {
        return {
          ok: false,
          error: asString(body.message) || asString(body.error) || `Snov result ${result.status}`,
          status: result.status,
        };
      }
      const status = (taskStatus(body) ?? "").toLowerCase();
      if (status === "not_enough_credits") {
        return { ok: false, error: "Snov account is out of credits", status: 402 };
      }
      if (status && status !== "completed") continue;
      const person = pickSnovEmailHit(body);
      return { ok: true, person, matched: Boolean(person?.email) };
    }
    return { ok: false, error: "Snov search still in progress", status: 504 };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Snov request failed",
      status: 502,
    };
  }
}
