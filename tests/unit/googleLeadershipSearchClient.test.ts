import { describe, expect, it, vi, afterEach } from "vitest";

import {
  isGoogleLeadershipSearchConfigured,
  resolveLeadershipSearchProvider,
  searchCompanyLeadership,
} from "@/app/lib/server/googleLeadershipSearchClient";
import { isAllowlistedLeadershipUrl } from "@/app/lib/server/ironleadsLeadershipSearchAllowlist";

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
});

describe("ironleadsLeadershipSearchAllowlist", () => {
  it("accepts allowlisted hosts and rejects others", () => {
    expect(isAllowlistedLeadershipUrl("https://www.darkreading.com/a")).toBe(true);
    expect(isAllowlistedLeadershipUrl("https://news.bloomberg.com/x")).toBe(true);
    expect(isAllowlistedLeadershipUrl("https://evil.example/x")).toBe(false);
  });
});
