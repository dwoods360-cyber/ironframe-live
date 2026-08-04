# Ironleads leadership search providers

Research-only fills **names** from press/cyber snippets when the company-site scrape finds zero plausible people. Emails still come from published site addresses, pattern guess + MX, or **Prospeo** enrichment.

Google Custom Search JSON API is **closed to new customers** — do not rely on `GOOGLE_CSE_*` for new GCP projects.

## Provider order

1. **Brave Search** — `BRAVE_SEARCH_API_KEY` (or `BRAVE_API_KEY`)
2. **SerpAPI** — `SERPAPI_API_KEY` (Google engine)
3. **Google CSE** — `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_CX` (legacy entitlement only)

Hits are filtered to `app/lib/server/ironleadsLeadershipSearchAllowlist.ts` (mirror of `docs/ops/google-cse-ironleads-sites.txt`).

## Setup — Brave (recommended)

1. Create an account at [Brave Search API](https://brave.com/search/api/)
2. Create a **Search** plan key
3. Vercel → `BRAVE_SEARCH_API_KEY` → Production + Preview
4. Redeploy
5. Ironleads → **Research only**

Smoke test:

```powershell
$key = "YOUR_BRAVE_KEY"
curl.exe "https://api.search.brave.com/res/v1/web/search?q=CISO&count=3" -H "Accept: application/json" -H "X-Subscription-Token: $key"
```

## Setup — SerpAPI (backup)

1. Create an account at [SerpAPI](https://serpapi.com/)
2. Copy API key from dashboard
3. Vercel → `SERPAPI_API_KEY` → Production + Preview
4. Redeploy (used only if Brave key is absent)

## After names land

- Pattern emails may appear when a company domain is known (still guesses until published/confirmed).
- Use **Prospeo** on the SUSPECT card for verified buyer email when available.
