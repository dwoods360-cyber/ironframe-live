import "server-only";

import {
  isAllowlistedLeadershipUrl,
  isEmailAggregatorUrl,
} from "@/app/lib/server/ironleadsLeadershipSearchAllowlist";
import {
  leadershipHitMentionsCompany,
  refineLeadershipHits,
} from "@/app/lib/server/ironleadsLeadershipSearchHitRefine";

/**
 * Public-web buyer / email OSINT for Ironleads Research-only dossiers.
 *
 * Provider order:
 *   1. Brave Search API — BRAVE_SEARCH_API_KEY (or BRAVE_API_KEY)
 *   2. SerpAPI — SERPAPI_API_KEY (Google engine) — also used as **failover**
 *      when Brave is ok but returns zero usable hits (or Brave errors)
 *   3. Google Custom Search JSON API — GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX
 *      (closed to new GCP customers; kept for legacy entitlement only)
 *
 * Never scrapes google.com/search HTML. Hits are filtered to the press/cyber
 * allowlist in ironleadsLeadershipSearchAllowlist.ts, the prospect's own
 * domain, extra event/filing hosts, and (email query only) aggregator snippets
 * that stay pattern_guess until Hunter/Prospeo valid.
 *
 * Pipeline runs complementary queries (leadership, security leadership,
 * named people, email/contact, services pages, events, filings) whenever the
 * site scrape is missing a named buyer or a personal work email.
 */

const BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";
const SERPAPI_SEARCH_URL = "https://serpapi.com/search.json";
const CUSTOM_SEARCH_URL = "https://www.googleapis.com/customsearch/v1";

export type LeadershipSearchProvider = "brave" | "serpapi" | "google_cse";

export type ProspectOsintQueryKind =
  | "leadership"
  | "security_leadership"
  | "named_people"
  | "email"
  | "services"
  | "events"
  | "filings";

export const DEFAULT_PROSPECT_OSINT_KINDS: readonly ProspectOsintQueryKind[] = [
  "leadership",
  "security_leadership",
  "named_people",
  "email",
  "services",
  "events",
  "filings",
] as const;

export type ProspectOsintQuery = {
  kind: ProspectOsintQueryKind;
  query: string;
};

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
      /** When multi-query OSINT ran, one row per complementary search. */
      queries?: Array<{
        kind: ProspectOsintQueryKind;
        query: string;
        hitCount: number;
        provider: LeadershipSearchProvider;
      }>;
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

function sanitizeFirm(company: string): string {
  return company.trim().replace(/"/g, "");
}

function accountHost(domain?: string | null): string {
  return (domain ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0] ?? "";
}

function buildLeadershipQuery(company: string): string {
  const firm = sanitizeFirm(company);
  return `"${firm}" (CEO OR CISO OR CSO OR Founder OR "Managing Director" OR CFO OR COO OR "Chief Information Security" OR "Chief Security Officer" OR "co-founder") (appointed OR joins OR "is the" OR founder)`;
}

function sanitizePersonName(name: string): string {
  return name
    .trim()
    .replace(/"/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

/** Keep first+last only; drop single-token or junk labels. */
export function selectOsintKnownPeople(names: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of names) {
    const name = sanitizePersonName(String(raw || ""));
    if (!name) continue;
    const parts = name.split(" ").filter(Boolean);
    if (parts.length < 2) continue;
    if (parts[0]!.length < 2 || parts[parts.length - 1]!.length < 2) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= 4) break;
  }
  return out;
}

/** Complementary public-web queries — desk OSINT (Siemba / TechMagic-style). */
export function buildProspectOsintQueries(input: {
  company: string;
  domain?: string | null;
  /** Known buyer / sponsor names already on the dossier (first + last). */
  knownPeople?: Array<string | null | undefined>;
}): ProspectOsintQuery[] {
  const firm = sanitizeFirm(input.company);
  const host = accountHost(input.domain);
  const people = selectOsintKnownPeople(input.knownPeople ?? []);
  const emailClause = host
    ? `(email OR mailto OR contact OR "@${host}")`
    : `(email OR mailto OR "contact us" OR "book a demo")`;
  const siteClause = host ? `OR site:${host}` : "";
  const queries: ProspectOsintQuery[] = [
    { kind: "leadership", query: buildLeadershipQuery(firm) },
    {
      kind: "security_leadership",
      query: `"${firm}" (security OR cybersecurity OR compliance OR "cloud security" OR "cloud & cybersecurity" OR SOC OR CISO OR vCISO OR "Director of" OR "Head of Security" OR "practice lead") (leadership OR director OR founder OR team OR "co-founder")`,
    },
  ];
  if (people.length > 0) {
    const peopleClause = people.map((p) => `"${p}"`).join(" OR ");
    queries.push({
      kind: "named_people",
      query: `"${firm}" (${peopleClause}) (leadership OR director OR founder OR cybersecurity OR compliance OR email OR contact OR LinkedIn)`,
    });
  }
  queries.push(
    {
      kind: "email",
      query: `"${firm}" ${emailClause} (CEO OR CISO OR CSO OR founder OR "chief" OR director OR cybersecurity)`,
    },
    {
      kind: "services",
      query: `"${firm}" ("cybersecurity services" OR "SOC 2" OR "SOC2" OR compliance OR "managed security" OR vCISO OR "security consulting" OR "application security" OR "cloud security") (services OR about OR readiness ${siteClause})`,
    },
    {
      kind: "events",
      query: `"${firm}" (conference OR booth OR speaker OR exhibitor OR GISEC OR RSAC OR "Black Hat" OR "Venture Atlanta" OR ChannelCon)`,
    },
    {
      kind: "filings",
      query: `"${firm}" ("secretary of state" OR "registered agent" OR "articles of incorporation" OR officer OR director)`,
    },
  );
  return queries;
}

function hitLooksLikeEmailClue(hit: GoogleLeadershipHit, domain?: string | null): boolean {
  const hay = `${hit.title} ${hit.snippet}`.toLowerCase();
  if (hay.includes("mailto:") || hay.includes("@")) return true;
  const host = accountHost(domain);
  return Boolean(host && hay.includes(`@${host}`));
}

function finalizeHits(
  provider: LeadershipSearchProvider,
  company: string,
  query: string,
  rawHits: GoogleLeadershipHit[],
  accountDomain?: string | null,
  opts?: { acceptEmailClues?: boolean },
): Extract<GoogleLeadershipSearchResult, { ok: true }> {
  const allowlisted = rawHits
    .filter((h) => {
      if (!h.link || !(h.title || h.snippet)) return false;
      if (isAllowlistedLeadershipUrl(h.link, accountDomain)) return true;
      if (opts?.acceptEmailClues) {
        const emailClue =
          hitLooksLikeEmailClue(h, accountDomain) || isEmailAggregatorUrl(h.link);
        return emailClue && leadershipHitMentionsCompany(h, company);
      }
      return false;
    });

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
  accountDomain?: string | null,
  opts?: { acceptEmailClues?: boolean },
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

    return finalizeHits("brave", company, query, rawHits, accountDomain, opts);
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
  accountDomain?: string | null,
  opts?: { acceptEmailClues?: boolean },
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

    return finalizeHits("serpapi", company, query, rawHits, accountDomain, opts);
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
  accountDomain?: string | null,
  opts?: { acceptEmailClues?: boolean },
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

    return finalizeHits("google_cse", company, query, rawHits, accountDomain, opts);
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

function runProviderSearch(
  provider: LeadershipSearchProvider,
  company: string,
  query: string,
  num: number,
  accountDomain?: string | null,
  opts?: { acceptEmailClues?: boolean },
): Promise<GoogleLeadershipSearchResult> {
  if (provider === "brave") {
    return searchViaBrave(company, query, num, accountDomain, opts);
  }
  if (provider === "serpapi") {
    return searchViaSerpApi(company, query, num, accountDomain, opts);
  }
  return searchViaGoogleCse(company, query, num, accountDomain, opts);
}

async function searchWithProviderCascade(input: {
  company: string;
  query: string;
  num: number;
  domain?: string | null;
  acceptEmailClues?: boolean;
  cascade: boolean;
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

  const opts = { acceptEmailClues: Boolean(input.acceptEmailClues) };
  const primary = await runProviderSearch(
    provider,
    company,
    input.query,
    input.num,
    input.domain,
    opts,
  );
  if (!input.cascade || !shouldFailoverLeadershipSearch(primary)) return primary;

  const tried: LeadershipSearchProvider[] = primary.provider ? [primary.provider] : [];
  const failoverPlan: LeadershipSearchProvider[] = [];
  if (provider === "brave") {
    if (getSerpApiKey()) failoverPlan.push("serpapi");
    if (getCseApiKey() && getCseCx()) failoverPlan.push("google_cse");
  } else if (provider === "serpapi") {
    if (getCseApiKey() && getCseCx()) failoverPlan.push("google_cse");
  }

  let last: GoogleLeadershipSearchResult = primary;
  for (const next of failoverPlan) {
    const candidate = await runProviderSearch(
      next,
      company,
      input.query,
      input.num,
      input.domain,
      opts,
    );
    if (candidate.provider) tried.push(candidate.provider);
    if (!shouldFailoverLeadershipSearch(candidate)) {
      return withCascadeNote(candidate, tried.slice(0, -1));
    }
    if (candidate.ok || !last.ok) last = candidate;
  }

  return withCascadeNote(last, tried.slice(0, -1));
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
  const num = Math.min(Math.max(input.num ?? 8, 1), 10);
  return searchWithProviderCascade({
    company: input.company,
    query: buildLeadershipQuery(input.company),
    num,
    domain: input.domain,
    cascade: true,
  });
}

function mergeOsintHits(parts: Array<Extract<GoogleLeadershipSearchResult, { ok: true }>>): {
  hits: GoogleLeadershipHit[];
  corpus: string;
  sourceUrls: string[];
} {
  const hits: GoogleLeadershipHit[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    for (const hit of part.hits) {
      const key = hit.link.replace(/\/$/, "").toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      hits.push(hit);
    }
  }
  const corpus = parts
    .map((p) => p.corpus)
    .filter((c) => c.trim().length > 0)
    .join(" \n ");
  return {
    hits,
    corpus,
    sourceUrls: hits.map((h) => h.link).filter(Boolean),
  };
}

/**
 * Desk-style public-web pass: leadership + security leadership + named people
 * + email/contact + services + events + filings.
 * First query cascades providers; the rest reuse the winning/primary provider
 * so one Research invoke does not burn a full failover stack per query.
 */
export async function searchCompanyProspectOsint(input: {
  company: string;
  domain?: string | null;
  num?: number;
  kinds?: ProspectOsintQueryKind[];
  knownPeople?: Array<string | null | undefined>;
}): Promise<GoogleLeadershipSearchResult> {
  const company = input.company.trim();
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
  if (!company) {
    return {
      ok: false,
      configured: true,
      provider,
      error: "company is required",
      status: 400,
    };
  }

  const wanted = new Set(input.kinds ?? DEFAULT_PROSPECT_OSINT_KINDS);
  const queries = buildProspectOsintQueries({
    company,
    domain: input.domain,
    knownPeople: input.knownPeople,
  }).filter((q) => wanted.has(q.kind));
  const num = Math.min(Math.max(input.num ?? 8, 1), 10);

  const okParts: Array<Extract<GoogleLeadershipSearchResult, { ok: true }>> = [];
  const queryMeta: Array<{
    kind: ProspectOsintQueryKind;
    query: string;
    hitCount: number;
    provider: LeadershipSearchProvider;
  }> = [];
  let lastFail: GoogleLeadershipSearchResult | null = null;
  let cascadedFrom: LeadershipSearchProvider[] | undefined;

  for (let i = 0; i < queries.length; i += 1) {
    const q = queries[i]!;
    const result = await searchWithProviderCascade({
      company,
      query: q.query,
      num,
      domain: input.domain,
      acceptEmailClues: q.kind === "email" || q.kind === "named_people",
      cascade: i === 0,
    });
    if (!result.ok) {
      lastFail = result;
      continue;
    }
    if (result.cascadedFrom?.length) cascadedFrom = result.cascadedFrom;
    okParts.push(result);
    queryMeta.push({
      kind: q.kind,
      query: q.query,
      hitCount: result.hits.length,
      provider: result.provider,
    });
  }

  if (okParts.length === 0) {
    return (
      lastFail ?? {
        ok: false,
        configured: true,
        provider,
        error: "Prospect OSINT returned no usable provider results",
        status: 502,
      }
    );
  }

  const merged = mergeOsintHits(okParts);
  return {
    ok: true,
    configured: true,
    provider: okParts[0]!.provider,
    cascadedFrom,
    query: queryMeta.map((q) => q.query).join(" | "),
    hits: merged.hits,
    corpus: merged.corpus,
    sourceUrls: merged.sourceUrls,
    queries: queryMeta,
  };
}
