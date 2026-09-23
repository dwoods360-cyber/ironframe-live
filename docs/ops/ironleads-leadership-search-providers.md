# Ironleads leadership search providers

Research-only fills **names and email clues** from public web search when the company-site scrape is missing a named buyer **or** a personal work seat (not only when zero names were found). Complementary queries cover leadership, email/contact, events, and corporate filings. Emails still come from published site addresses, pattern guess + MX, or **Prospeo/Hunter** enrichment. Aggregator claims (`rocketreach`, `zoominfo`, …) stay **pattern_guess** — never Email PASS.

Google Custom Search JSON API is **closed to new customers** — do not rely on `GOOGLE_CSE_*` for new GCP projects.

## Provider order

1. **Brave Search** — `BRAVE_SEARCH_API_KEY` (or `BRAVE_API_KEY`)
2. **SerpAPI** — `SERPAPI_API_KEY` (Google engine)
3. **Google CSE** — `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_CX` (legacy entitlement only)

**Failover:** When Brave is configured and returns **zero usable hits** (or errors), Research automatically tries SerpAPI next (then CSE if present). Set `SERPAPI_API_KEY` on Vercel to unlock this path — free tier is 250 searches/mo.

Hits are filtered to `app/lib/server/ironleadsLeadershipSearchAllowlist.ts` (press/cyber list + the prospect's own domain + event/filing hosts), then company-relevance refined in `ironleadsLeadershipSearchHitRefine.ts` (drops generic CISO roundups / Wikipedia role pages; turns LinkedIn `/in/` and Forbes Councils profile slugs into extractable prose). Email queries may keep aggregator snippets as **hints only**. Brave requests use `extra_snippets=true` for richer corpus. Research also fetches up to **3** allowlisted result pages (never LinkedIn HTML).

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

## Setup — SerpAPI (backup + empty-hit failover)

1. Create an account at [SerpAPI](https://serpapi.com/)
2. Copy API key from dashboard
3. Vercel → `SERPAPI_API_KEY` → Production + Preview
4. Redeploy — used when Brave is absent **or** Brave returns zero usable leadership hits

## Research only batching (Vercel 120s)

Portal **Research only** processes **5 SUSPECTs per request** (thinnest first), with **2 contacts in parallel** per invoke. Named dossiers use a **2‑minute** cooldown so multi-batch runs advance; **thin / empty** dossiers stay eligible immediately (no 12‑minute idle wait). First click sends `forceResearch` to bypass cooldown on named rows. The UI auto-continues up to **8** batches. A **504** means the prior invoke hit `maxDuration` — partial progress is saved; click again.

## After names land

- Research then runs **Prospeo → Apollo → Hunter** (when keys are set) to fill a named-buyer work seat. Pattern guesses and `info@`/`sales@` never become Email PASS.
- Fit PASS + named buyer + promote-ready email auto-queues a **T1 Approvals draft**. DISPATCH stays human — review the message, then send.
- Weekday cron (`/api/internal/cron/ironleads-auto-enrich`) researches a few thin actives and retries leftover placeholders. Set `IRONLEADS_AUTO_ENRICH_ENABLED=0` to pause.

### Email syntax (MSSP / GRC / Enterprise IT)

Default guess order when no published staff mail proves a schema:

| Rank | Pattern | Example | ~Share |
| --- | --- | --- | --- |
| 1 | `{first}.{last}@` | `jane.doe@` | ~62% |
| 2 | `{f}{last}@` | `jdoe@` | ~22% |
| 3 | `{first}@` | `jane@` | ~8% |
| 4+ | `{first}{last}@`, `{first}_{last}@`, `{f}.{last}@` | … | ~8% |

- **Primary stored guess** = rank 1, unless ≥2 published addresses on the domain match another schema (then that schema leads).
- Research also stores up to **3** ordered `pattern_guess` failover candidates per person.
- **MX / format hygiene PASS ≠ ownership** — ~30–35% of security/IT firms use catch-all or gateways (Proofpoint, Mimecast, Barracuda). Do not Promote on pattern_guess alone.
