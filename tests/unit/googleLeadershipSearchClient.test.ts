import { describe, expect, it, vi, afterEach } from "vitest";

import {
  buildProspectOsintQueries,
  isGoogleLeadershipSearchConfigured,
  resolveLeadershipSearchProvider,
  searchCompanyLeadership,
  searchCompanyProspectOsint,
} from "@/app/lib/server/googleLeadershipSearchClient";
import {
  isAllowlistedLeadershipUrl,
  isEmailAggregatorUrl,
} from "@/app/lib/server/ironleadsLeadershipSearchAllowlist";

describe("googleLeadershipSearchClient", () => {
  const priorEnv = {
    BRAVE_SEARCH_API_KEY: process.env.BRAVE_SEARCH_API_KEY,
    BRAVE_API_KEY: process.env.BRAVE_API_KEY,
    SERPAPI_API_KEY: process.env.SERPAPI_API_KEY,
    GOOGLE_CSE_API_KEY: process.env.GOOGLE_CSE_API_KEY,
    GOOGLE_CSE_CX: process.env.GOOGLE_CSE_CX,
    GOOGLE_CUSTOM_SEARCH_API_KEY: process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
    GOOGLE_CUSTOM_SEARCH_CX: process.env.GOOGLE_CUSTOM_SEARCH_CX,
  };

  function clearProviderEnv() {
    delete process.env.BRAVE_SEARCH_API_KEY;
    delete process.env.BRAVE_API_KEY;
    delete process.env.SERPAPI_API_KEY;
    delete process.env.GOOGLE_CSE_API_KEY;
    delete process.env.GOOGLE_CSE_CX;
    delete process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    delete process.env.GOOGLE_CUSTOM_SEARCH_CX;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    clearProviderEnv();
    for (const [key, value] of Object.entries(priorEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("prefers Brave over SerpAPI and Google CSE", () => {
    clearProviderEnv();
    expect(isGoogleLeadershipSearchConfigured()).toBe(false);

    process.env.SERPAPI_API_KEY = "serp";
    process.env.GOOGLE_CSE_API_KEY = "gkey";
    process.env.GOOGLE_CSE_CX = "gcx";
    expect(resolveLeadershipSearchProvider()).toBe("serpapi");

    process.env.BRAVE_SEARCH_API_KEY = "brave";
    expect(resolveLeadershipSearchProvider()).toBe("brave");
    expect(isGoogleLeadershipSearchConfigured()).toBe(true);
  });

  it("parses Brave hits and filters to the press allowlist", async () => {
    clearProviderEnv();
    process.env.BRAVE_SEARCH_API_KEY = "test-brave";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const href = String(input);
      expect(href).toContain("extra_snippets=true");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          web: {
            results: [
              {
                title: "Acme MSSP Appoints Jordan Lee as Chief Information Security Officer",
                description: "Jordan Lee joins Acme as CISO to lead client GRC programs.",
                url: "https://www.prnewswire.com/news/acme-ciso",
                extra_snippets: ["Jordan Lee is Chief Information Security Officer at Acme MSSP."],
              },
              {
                title: "New CISO appointments 2026",
                description: "Industry roundup with no firm match",
                url: "https://www.csoonline.com/article/new-ciso-appointments-2026/",
              },
              {
                title: "Random blog",
                description: "Ignore me",
                url: "https://random-blog.example/post",
              },
            ],
          },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchCompanyLeadership({
      company: "Acme MSSP",
      domain: "acme-mssp.example",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.provider).toBe("brave");
    expect(result.hits).toHaveLength(1);
    expect(result.corpus).toMatch(/Jordan Lee/i);
    expect(result.corpus).toMatch(/Chief Information Security Officer at Acme MSSP/i);
    expect(result.sourceUrls[0]).toContain("prnewswire.com");
  });

  it("parses SerpAPI organic results", async () => {
    clearProviderEnv();
    process.env.SERPAPI_API_KEY = "test-serp";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          organic_results: [
            {
              title: "Acme names Pat Rivera CEO",
              snippet: "Pat Rivera is the new CEO of Acme.",
              link: "https://www.crn.com/news/acme-ceo",
            },
          ],
        }),
      })),
    );

    const result = await searchCompanyLeadership({ company: "Acme" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.provider).toBe("serpapi");
    expect(result.hits[0]?.link).toContain("crn.com");
  });

  it("cascades Brave empty usable hits to SerpAPI", async () => {
    clearProviderEnv();
    process.env.BRAVE_SEARCH_API_KEY = "test-brave";
    process.env.SERPAPI_API_KEY = "test-serp";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const href = String(input);
      if (href.includes("api.search.brave.com")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            web: {
              results: [
                {
                  title: "New CISO appointments 2026",
                  description: "Generic roundup",
                  url: "https://www.csoonline.com/article/new-ciso-appointments-2026/",
                },
              ],
            },
          }),
        };
      }
      expect(href).toContain("serpapi.com");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          organic_results: [
            {
              title: "GitSimple Appoints Alex Nguyen as CEO",
              snippet: "Alex Nguyen is the CEO of GitSimple.",
              link: "https://www.prnewswire.com/news/gitsimple-ceo",
            },
          ],
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchCompanyLeadership({ company: "GitSimple" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.provider).toBe("serpapi");
    expect(result.cascadedFrom).toEqual(["brave"]);
    expect(result.hits.some((h) => /Alex Nguyen/i.test(h.title + h.snippet))).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not call SerpAPI when Brave already has usable hits", async () => {
    clearProviderEnv();
    process.env.BRAVE_SEARCH_API_KEY = "test-brave";
    process.env.SERPAPI_API_KEY = "test-serp";

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        web: {
          results: [
            {
              title: "Acme MSSP Appoints Jordan Lee as Chief Information Security Officer",
              description: "Jordan Lee joins Acme as CISO.",
              url: "https://www.prnewswire.com/news/acme-ciso",
            },
          ],
        },
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchCompanyLeadership({ company: "Acme MSSP" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.provider).toBe("brave");
    expect(result.cascadedFrom).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("runs complementary Brave queries and keeps company-domain hits", async () => {
    clearProviderEnv();
    process.env.BRAVE_SEARCH_API_KEY = "test-brave";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const href = String(input);
      const q = decodeURIComponent(new URL(href).searchParams.get("q") ?? "");
      if (q.includes("secretary of state")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            web: {
              results: [
                {
                  title: "Siemba Inc — Georgia SOS",
                  description: "Kannan Udayarajan is an officer of Siemba Inc.",
                  url: "https://opencorporates.com/companies/us/siemba",
                },
              ],
            },
          }),
        };
      }
      if (q.includes("email") || q.includes("@siemba.io")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            web: {
              results: [
                {
                  title: "Kannan Udayarajan email — Siemba",
                  description: "Public aggregator lists kannan@siemba.io for Siemba.",
                  url: "https://rocketreach.co/kannan-udayarajan-email",
                },
              ],
            },
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          web: {
            results: [
              {
                title: "About Siemba — leadership",
                description:
                  "Kannan Udayarajan is Founder and Chief Executive Officer at Siemba.",
                url: "https://www.siemba.io/about-us",
              },
            ],
          },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchCompanyProspectOsint({
      company: "Siemba",
      domain: "siemba.io",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.queries?.map((q) => q.kind)).toEqual([
      "leadership",
      "email",
      "events",
      "filings",
    ]);
    expect(result.sourceUrls.some((u) => u.includes("siemba.io"))).toBe(true);
    expect(result.corpus).toMatch(/Kannan Udayarajan/i);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});

describe("ironleadsLeadershipSearchAllowlist", () => {
  it("accepts allowlisted hosts and rejects others", () => {
    expect(isAllowlistedLeadershipUrl("https://www.darkreading.com/a")).toBe(true);
    expect(isAllowlistedLeadershipUrl("https://news.bloomberg.com/x")).toBe(true);
    expect(isAllowlistedLeadershipUrl("https://evil.example/x")).toBe(false);
  });

  it("accepts the prospect's own domain and extra OSINT hosts", () => {
    expect(
      isAllowlistedLeadershipUrl("https://www.siemba.io/about-us", "siemba.io"),
    ).toBe(true);
    expect(isAllowlistedLeadershipUrl("https://opencorporates.com/companies/us/1")).toBe(
      true,
    );
    expect(isEmailAggregatorUrl("https://rocketreach.co/kannan-udayarajan-email")).toBe(
      true,
    );
  });
});

describe("prospect OSINT query bundle", () => {
  it("builds leadership, email, events, and filings queries", () => {
    const queries = buildProspectOsintQueries({
      company: "Siemba",
      domain: "siemba.io",
    });
    expect(queries.map((q) => q.kind)).toEqual([
      "leadership",
      "email",
      "events",
      "filings",
    ]);
    expect(queries.find((q) => q.kind === "email")?.query).toContain("@siemba.io");
    expect(queries.find((q) => q.kind === "leadership")?.query).toMatch(/CSO|Chief Security/);
    expect(queries.find((q) => q.kind === "events")?.query).toContain("GISEC");
  });
});
