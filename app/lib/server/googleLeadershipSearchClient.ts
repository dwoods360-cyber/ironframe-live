import "server-only";

import { isAllowlistedLeadershipUrl } from "@/app/lib/server/ironleadsLeadershipSearchAllowlist";
import { refineLeadershipHits } from "@/app/lib/server/ironleadsLeadershipSearchHitRefine";

/**
 * Leadership OSINT search for Ironleads Research-only thin dossiers.
 *
 * Provider order:
 *   1. Brave Search API — BRAVE_SEARCH_API_KEY (or BRAVE_API_KEY)
 *   2. SerpAPI — SERPAPI_API_KEY (Google engine) — also used as **failover**
 *      when Brave is ok but returns zero usable hits (or Brave errors)
 *   3. Google Custom Search JSON API — GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX
 *      (closed to new GCP customers; kept for legacy entitlement only)
 *
 * Never scrapes google.com/search HTML. Hits are filtered to the press/cyber
 * allowlist in ironleadsLeadershipSearchAllowlist.ts.
 *
 * Research only calls this when the company-site scrape left zero plausible names.
 */

const BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";
const SERPAPI_SEARCH_URL = "https://serpapi.com/search.json";
const CUSTOM_SEARCH_URL = "https://www.googleapis.com/customsearch/v1";

export type LeadershipSearchProvider = "brave" | "serpapi" | "google_cse";

export type GoogleLeadershipHit = {
  title: string;
  snippet: string;
  link: string;
};

export type GoogleLeadershipSearchResult =
  | {
      ok: true;
      configured: true;
      provider: LeadershipSearchProvider;
      /** Prior provider(s) tried before this result (e.g. brave → serpapi). */
      cascadedFrom?: LeadershipSearchProvider[];
      query: string;
      hits: GoogleLeadershipHit[];
      corpus: string;
      sourceUrls: string[];
    }
  | {
      ok: false;
      configured: boolean;
      provider: LeadershipSearchProvider | null;
      cascadedFrom?: LeadershipSearchProvider[];
      error: string;
      status: number;
    };

function getBraveApiKey(): string | null {
  return (
    process.env.BRAVE_SEARCH_API_KEY?.trim() ||
    process.env.BRAVE_API_KEY?.trim() ||
    null
  );
}

function getSerpApiKey(): string | null {
  return process.env.SERPAPI_API_KEY?.trim() || null;
}

function getCseApiKey(): string | null {
  return (
    process.env.GOOGLE_CSE_API_KEY?.trim() ||
    process.env.GOOGLE_CUSTOM_SEARCH_API_KEY?.trim() ||
    null
  );
}

function getCseCx(): string | null {
  return (
    process.env.GOOGLE_CSE_CX?.trim() ||
    process.env.GOOGLE_CUSTOM_SEARCH_CX?.trim() ||
    null
  );
}

export function resolveLeadershipSearchProvider(): LeadershipSearchProvider | null {
  if (getBraveApiKey()) return "brave";
  if (getSerpApiKey()) return "serpapi";
  if (getCseApiKey() && getCseCx()) return "google_cse";
  return null;
}

/** @deprecated Prefer isLeadershipSearchConfigured — kept for call-site compatibility. */
export function isGoogleLeadershipSearchConfigured(): boolean {
  return resolveLeadershipSearchProvider() != null;
}

export function isLeadershipSearchConfigured(): boolean {
  return resolveLeadershipSearchProvider() != null;
}

function buildLeadershipQuery(company: string): string {
  const firm = company.trim().replace(/"/g, "");
  return `"${firm}" (CEO OR CISO OR Founder OR "Managing Director" OR CFO OR "Chief Information Security") (appointed OR joins OR "is the" OR founder)`;
}

function finalizeHits(
  provider: LeadershipSearchProvider,
  company: string,
  query: string,
  rawHits: GoogleLeadershipHit[],
): Extract<GoogleLeadershipSearchResult, { ok: true }> {
  const allowlisted = rawHits
    .filter((h) => h.link && isAllowlistedLeadershipUrl(h.link))
    .filter((h) => h.title || h.snippet);

  const { hits, corpus } = refineLeadershipHits(company, allowlisted);
  const sourceUrls = hits.map((h) => h.link).filter(Boolean);

  return {
    ok: true,
    configured: true,
    provider,
    query,
    hits,
    corpus,
    sourceUrls,
  };
}

async function searchViaBrave(
  company: string,
  query: string,
  num: number,
): Promise<GoogleLeadershipSearchResult> {
  const apiKey = getBraveApiKey();
  if (!apiKey) {
    return {
      ok: false,
      configured: false,
      provider: null,
      error: "BRAVE_SEARCH_API_KEY is not set",
      status: 503,
    };
  }

  const url = new URL(BRAVE_SEARCH_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(num));
  url.searchParams.set("safesearch", "moderate");
  url.searchParams.set("extra_snippets", "true");

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      signal: AbortSignal.timeout(20_000),
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
    });
    const body = (await response.json().catch(() => ({}))) as {
      error?: {
        meta?: { errors?: Array<{ detail?: string; message?: string }> };
        message?: string;
      };
      message?: string;
      web?: {
        results?: Array<{
          title?: string;
          description?: string;
          url?: string;
          extra_snippets?: string[];
        }>;
      };
    };

    if (!response.ok) {
      const detail =
        body.error?.meta?.errors?.[0]?.detail ||
        body.error?.meta?.errors?.[0]?.message ||
        body.error?.message ||
        body.message ||
        `Brave Search ${response.status}`;
      return {
        ok: false,
        configured: true,
        provider: "brave",
        error: String(detail).slice(0, 240),
        status: response.status,
      };
    }

    const rawHits: GoogleLeadershipHit[] = (body.web?.results ?? []).map((item) => {
      const description =
        typeof item.description === "string" ? item.description.trim() : "";
      const extras = Array.isArray(item.extra_snippets)
        ? item.extra_snippets
            .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
            .map((s) => s.trim())
        : [];
      return {
        title: typeof item.title === "string" ? item.title.trim() : "",
        snippet: [description, ...extras].filter(Boolean).join(" "),
        link: typeof item.url === "string" ? item.url.trim() : "",
      };
    });

    return finalizeHits("brave", company, query, rawHits);
  } catch (err) {
    return {
      ok: false,
      configured: true,
      provider: "brave",
      error: err instanceof Error ? err.message : "Brave Search request failed",
      status: 502,
    };
  }
}

async function searchViaSerpApi(
  company: string,
  query: string,
  num: number,
): Promise<GoogleLeadershipSearchResult> {
  const apiKey = getSerpApiKey();
  if (!apiKey) {
    return {
      ok: false,
      configured: false,
      provider: null,
      error: "SERPAPI_API_KEY is not set",
      status: 503,
    };
  }

  const url = new URL(SERPAPI_SEARCH_URL);
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("num", String(num));

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      signal: AbortSignal.timeout(25_000),
      headers: { Accept: "application/json" },
    });
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
      organic_results?: Array<{
        title?: string;
        snippet?: string;
        link?: string;
      }>;
    };

    if (!response.ok || body.error) {
      return {
        ok: false,
        configured: true,
        provider: "serpapi",
        error: (body.error || `SerpAPI ${response.status}`).slice(0, 240),
        status: response.ok ? 502 : response.status,
      };
    }

    const rawHits: GoogleLeadershipHit[] = (body.organic_results ?? []).map((item) => ({
      title: typeof item.title === "string" ? item.title.trim() : "",
      snippet: typeof item.snippet === "string" ? item.snippet.trim() : "",
      link: typeof item.link === "string" ? item.link.trim() : "",
    }));

    return finalizeHits("serpapi", company, query, rawHits);
  } catch (err) {
    return {
      ok: false,
      configured: true,
      provider: "serpapi",
      error: err instanceof Error ? err.message : "SerpAPI request failed",
      status: 502,
    };
  }
}

async function searchViaGoogleCse(
  company: string,
  query: string,
  num: number,
): Promise<GoogleLeadershipSearchResult> {
  const apiKey = getCseApiKey();
  const cx = getCseCx();
  if (!apiKey || !cx) {
    return {
      ok: false,
      configured: false,
      provider: null,
      error: "GOOGLE_CSE_API_KEY and GOOGLE_CSE_CX are not set",
      status: 503,
    };
  }

  const url = new URL(CUSTOM_SEARCH_URL);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);
  url.searchParams.set("num", String(num));

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      signal: AbortSignal.timeout(20_000),
      headers: { Accept: "application/json" },
    });
    const body = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      items?: Array<{ title?: string; snippet?: string; link?: string }>;
    };

    if (!response.ok) {
      return {
        ok: false,
        configured: true,
        provider: "google_cse",
        error: body.error?.message || `Google CSE ${response.status}`,
        status: response.status,
      };
    }

    const rawHits: GoogleLeadershipHit[] = (body.items ?? []).map((item) => ({
      title: typeof item.title === "string" ? item.title.trim() : "",
      snippet: typeof item.snippet === "string" ? item.snippet.trim() : "",
      link: typeof item.link === "string" ? item.link.trim() : "",
    }));

    return finalizeHits("google_cse", company, query, rawHits);
  } catch (err) {
    return {
      ok: false,
      configured: true,
      provider: "google_cse",
      error: err instanceof Error ? err.message : "Google CSE request failed",
      status: 502,
    };
  }
}

function withCascadeNote(
  result: GoogleLeadershipSearchResult,
  cascadedFrom: LeadershipSearchProvider[],
): GoogleLeadershipSearchResult {
  if (cascadedFrom.length === 0) return result;
  return { ...result, cascadedFrom };
}

/**
 * True when the primary result should try the next provider:
 * API failure, or success with zero allowlisted/refined hits.
 */
export function shouldFailoverLeadershipSearch(
  result: GoogleLeadershipSearchResult,
): boolean {
  if (!result.ok) return true;
  return result.hits.length === 0;
}

/**
 * Search press/cyber media for leadership mentions for one company.
 * Returns title+snippet corpus for extractBuyingPersons (plausibility filtered upstream).
 *
 * When Brave is primary: on empty usable hits or Brave error, automatically
 * tries SerpAPI (then Google CSE) if those keys are configured.
 */
export async function searchCompanyLeadership(input: {
  company: string;
  domain?: string | null;
  num?: number;
}): Promise<GoogleLeadershipSearchResult> {
  const provider = resolveLeadershipSearchProvider();
  if (!provider) {
    return {
      ok: false,
      configured: false,
      provider: null,
      error:
        "No leadership search provider configured. Set BRAVE_SEARCH_API_KEY and/or SERPAPI_API_KEY (preferred). Google CSE is closed to new customers.",
      status: 503,
    };
  }

  const company = input.company.trim();
  if (!company) {
    return {
      ok: false,
      configured: true,
      provider,
      error: "company is required",
      status: 400,
    };
  }

  const query = buildLeadershipQuery(company);
  const num = Math.min(Math.max(input.num ?? 8, 1), 10);

  const runPrimary = (): Promise<GoogleLeadershipSearchResult> => {
    if (provider === "brave") return searchViaBrave(company, query, num);
    if (provider === "serpapi") return searchViaSerpApi(company, query, num);
    return searchViaGoogleCse(company, query, num);
  };

  const primary = await runPrimary();
  if (!shouldFailoverLeadershipSearch(primary)) return primary;

  const tried: LeadershipSearchProvider[] = primary.provider ? [primary.provider] : [];
  const failoverPlan: Array<() => Promise<GoogleLeadershipSearchResult>> = [];

  if (provider === "brave") {
    if (getSerpApiKey()) failoverPlan.push(() => searchViaSerpApi(company, query, num));
    if (getCseApiKey() && getCseCx()) {
      failoverPlan.push(() => searchViaGoogleCse(company, query, num));
    }
  } else if (provider === "serpapi") {
    if (getCseApiKey() && getCseCx()) {
      failoverPlan.push(() => searchViaGoogleCse(company, query, num));
    }
  }

  let last: GoogleLeadershipSearchResult = primary;
  for (const next of failoverPlan) {
    const candidate = await next();
    if (candidate.provider) tried.push(candidate.provider);
    if (!shouldFailoverLeadershipSearch(candidate)) {
      return withCascadeNote(candidate, tried.slice(0, -1));
    }
    // Prefer last ok-empty over hard fail when both empty
    if (candidate.ok || !last.ok) last = candidate;
  }

  return withCascadeNote(last, tried.slice(0, -1));
}
