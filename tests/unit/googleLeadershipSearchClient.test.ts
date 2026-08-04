import { describe, expect, it, vi, afterEach } from "vitest";

import {
  isGoogleLeadershipSearchConfigured,
  searchCompanyLeadership,
} from "@/app/lib/server/googleLeadershipSearchClient";

describe("googleLeadershipSearchClient", () => {
  const priorKey = process.env.GOOGLE_CSE_API_KEY;
  const priorCx = process.env.GOOGLE_CSE_CX;
  const priorKeyAlt = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const priorCxAlt = process.env.GOOGLE_CUSTOM_SEARCH_CX;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (priorKey === undefined) delete process.env.GOOGLE_CSE_API_KEY;
    else process.env.GOOGLE_CSE_API_KEY = priorKey;
    if (priorCx === undefined) delete process.env.GOOGLE_CSE_CX;
    else process.env.GOOGLE_CSE_CX = priorCx;
    if (priorKeyAlt === undefined) delete process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    else process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = priorKeyAlt;
    if (priorCxAlt === undefined) delete process.env.GOOGLE_CUSTOM_SEARCH_CX;
    else process.env.GOOGLE_CUSTOM_SEARCH_CX = priorCxAlt;
  });

  it("reports configured only when CSE key and CX are set", () => {
    delete process.env.GOOGLE_CSE_API_KEY;
    delete process.env.GOOGLE_CSE_CX;
    delete process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    delete process.env.GOOGLE_CUSTOM_SEARCH_CX;
    expect(isGoogleLeadershipSearchConfigured()).toBe(false);

    process.env.GOOGLE_CSE_API_KEY = "test-key";
    process.env.GOOGLE_CSE_CX = "test-cx";
    expect(isGoogleLeadershipSearchConfigured()).toBe(true);
  });

  it("parses Custom Search hits into a leadership corpus", async () => {
    process.env.GOOGLE_CSE_API_KEY = "test-key";
    process.env.GOOGLE_CSE_CX = "test-cx";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              title: "Acme MSSP Appoints Jordan Lee as Chief Information Security Officer",
              snippet: "Jordan Lee joins Acme as CISO to lead client GRC programs.",
              link: "https://news.example/acme-ciso",
            },
          ],
        }),
      })),
    );

    const result = await searchCompanyLeadership({
      company: "Acme MSSP",
      domain: "acme-mssp.example",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.hits).toHaveLength(1);
    expect(result.corpus).toMatch(/Jordan Lee/i);
    expect(result.sourceUrls[0]).toContain("news.example");
  });
});
