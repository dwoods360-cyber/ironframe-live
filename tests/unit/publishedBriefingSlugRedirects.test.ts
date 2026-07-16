import { describe, expect, it } from "vitest";

import {
  PUBLISHED_BRIEFING_SLUG_REDIRECTS,
  resolvePublishedBriefingSlug,
} from "@/app/lib/governanceFrame/publishedBriefingSlugRedirects";

describe("publishedBriefingSlugRedirects", () => {
  it("maps the retired auto-briefing sovereignty slug to the canonical edition", () => {
    expect(
      resolvePublishedBriefingSlug("2026-07-15-auto-briefing-tenant-sovereignty"),
    ).toBe("2026-05-14-connector-count-sovereign-enclaves");
    expect(
      PUBLISHED_BRIEFING_SLUG_REDIRECTS["2026-07-15-auto-briefing-tenant-sovereignty"],
    ).toBe("2026-05-14-connector-count-sovereign-enclaves");
  });

  it("leaves canonical slugs unchanged", () => {
    expect(resolvePublishedBriefingSlug("2026-05-14-connector-count-sovereign-enclaves")).toBe(
      "2026-05-14-connector-count-sovereign-enclaves",
    );
  });
});
