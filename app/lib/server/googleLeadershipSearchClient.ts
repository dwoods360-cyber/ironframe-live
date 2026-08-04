import "server-only";

/**
 * Google Programmable Search (Custom Search JSON API) — leadership OSINT only.
 * Never scrapes google.com/search HTML (blocked / ToS). Requires:
 *   GOOGLE_CSE_API_KEY (or GOOGLE_CUSTOM_SEARCH_API_KEY)
 *   GOOGLE_CSE_CX (Programmable Search Engine ID)
 *
 * As of 2026-01-20, new CSE engines cannot "Search the entire web" — they are
 * limited to ≤50 Sites to search. Seed those from
 * docs/ops/google-cse-ironleads-sites.txt (press / cyber / channel media).
 * Do not add *.com or per-MSSP domains (50-domain cap + public-suffix ban).
 *
 * Free tier is typically 100 queries/day — Research only calls this when the
 * site scrape left the dossier thin.
 */

const CUSTOM_SEARCH_URL = "https://www.googleapis.com/customsearch/v1";

export type GoogleLeadershipHit = {
  title: string;
  snippet: string;
  link: string;
};

export type GoogleLeadershipSearchResult =
  | {
      ok: true;
      configured: true;
      query: string;
      hits: GoogleLeadershipHit[];
      corpus: string;
      sourceUrls: string[];
    }
  | { ok: false; configured: boolean; error: string; status: number };

function getCseApiKey(): string | null {
  const key =
    process.env.GOOGLE_CSE_API_KEY?.trim() ||
    process.env.GOOGLE_CUSTOM_SEARCH_API_KEY?.trim() ||
    null;
  return key || null;
}

function getCseCx(): string | null {
  const cx = process.env.GOOGLE_CSE_CX?.trim() || process.env.GOOGLE_CUSTOM_SEARCH_CX?.trim();
  return cx || null;
}

export function isGoogleLeadershipSearchConfigured(): boolean {
  return Boolean(getCseApiKey() && getCseCx());
}

function buildLeadershipQuery(company: string, _domain: string | null): string {
  const firm = company.trim().replace(/"/g, "");
  // Do not append site:{prospectDomain} — new CSE engines only search the ≤50
  // allowlisted media domains (see docs/ops/google-cse-ironleads-sites.txt).
  return `"${firm}" (CEO OR CISO OR Founder OR "Managing Director" OR CFO OR "Chief Information Security") (appointed OR joins OR "is the" OR founder)`;
}

/**
 * Search allowlisted press/cyber media for leadership mentions for one company.
 * Returns title+snippet corpus for extractBuyingPersons (plausibility filtered upstream).
 */
export async function searchCompanyLeadership(input: {
  company: string;
  domain?: string | null;
  num?: number;
}): Promise<GoogleLeadershipSearchResult> {
  const apiKey = getCseApiKey();
  const cx = getCseCx();
  if (!apiKey || !cx) {
    return {
      ok: false,
      configured: false,
      error:
        "GOOGLE_CSE_API_KEY and GOOGLE_CSE_CX are not set. Create a Programmable Search Engine, add ≤50 Sites to search (docs/ops/google-cse-ironleads-sites.txt), and enable Custom Search API.",
      status: 503,
    };
  }

  const company = input.company.trim();
  if (!company) {
    return { ok: false, configured: true, error: "company is required", status: 400 };
  }

  const query = buildLeadershipQuery(company, input.domain ?? null);
  const num = Math.min(Math.max(input.num ?? 5, 1), 8);
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
        error: body.error?.message || `Google CSE ${response.status}`,
        status: response.status,
      };
    }

    const hits: GoogleLeadershipHit[] = (body.items ?? [])
      .map((item) => ({
        title: typeof item.title === "string" ? item.title.trim() : "",
        snippet: typeof item.snippet === "string" ? item.snippet.trim() : "",
        link: typeof item.link === "string" ? item.link.trim() : "",
      }))
      .filter((h) => h.title || h.snippet);

    const corpus = hits
      .map((h) => [h.title, h.snippet].filter(Boolean).join(". "))
      .join(" \n ");
    const sourceUrls = hits.map((h) => h.link).filter(Boolean);

    return {
      ok: true,
      configured: true,
      query,
      hits,
      corpus,
      sourceUrls,
    };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      error: err instanceof Error ? err.message : "Google CSE request failed",
      status: 502,
    };
  }
}
