import { describe, expect, it } from "vitest";

import {
  enrichLeadershipCorpusLine,
  isGenericLeadershipNoiseUrl,
  leadershipHitMentionsCompany,
  personAndRoleFromForbesProfileSlug,
  personNameFromLinkedInSlug,
  refineLeadershipHits,
} from "@/app/lib/server/ironleadsLeadershipSearchHitRefine";
import { extractBuyingPersons } from "@/app/lib/server/ironleadsBuyingCommitteeExtract";

describe("ironleadsLeadershipSearchHitRefine", () => {
  it("detects company mentions in title/snippet/url", () => {
    expect(
      leadershipHitMentionsCompany(
        {
          title: "CoreStack Co-Founder joins Forbes council",
          snippet: "Profile page",
          link: "https://councils.forbes.com/profile/x",
        },
        "CoreStack",
      ),
    ).toBe(true);
    expect(
      leadershipHitMentionsCompany(
        {
          title: "New CISO appointments 2026",
          snippet: "Industry roundup",
          link: "https://www.csoonline.com/article/new-ciso-appointments-2026",
        },
        "AI4IT",
      ),
    ).toBe(false);
  });

  it("flags generic CISO roundup / Wikipedia noise URLs", () => {
    expect(
      isGenericLeadershipNoiseUrl(
        "https://www.csoonline.com/article/new-ciso-appointments-2026/",
      ),
    ).toBe(true);
    expect(
      isGenericLeadershipNoiseUrl(
        "https://en.wikipedia.org/wiki/Chief_information_security_officer",
      ),
    ).toBe(true);
    expect(
      isGenericLeadershipNoiseUrl("https://www.prnewswire.com/news/acme-ciso"),
    ).toBe(false);
  });

  it("parses LinkedIn and Forbes profile slugs into names", () => {
    expect(
      personNameFromLinkedInSlug(
        "https://www.linkedin.com/in/christa-heibel-48b31a20/",
      ),
    ).toBe("Christa Heibel");
    expect(
      personAndRoleFromForbesProfileSlug(
        "https://councils.forbes.com/profile/Rathinasabapathy-Arumugam-Co-Founder-CTO-CoreStack/abc",
      ),
    ).toEqual({
      fullName: "Rathinasabapathy Arumugam",
      rolePhrase: "Co-Founder",
    });
  });

  it("drops generic roundups and enriches Forbes/LinkedIn into extractable corpus", () => {
    const { hits, corpus } = refineLeadershipHits("CoreStack", [
      {
        title: "New CISO appointments 2026",
        snippet: "A roundup of CISOs",
        link: "https://www.csoonline.com/article/new-ciso-appointments-2026/",
      },
      {
        title: "Rathinasabapathy Arumugam — Forbes Councils",
        snippet: "Member profile",
        link: "https://councils.forbes.com/profile/Rathinasabapathy-Arumugam-Co-Founder-CTO-CoreStack/abc",
      },
    ]);

    expect(hits).toHaveLength(1);
    expect(corpus).toMatch(/Rathinasabapathy Arumugam is Co-Founder at CoreStack/i);

    const people = extractBuyingPersons(corpus);
    expect(people.some((p) => p.fullName === "Rathinasabapathy Arumugam")).toBe(true);
  });

  it("keeps LinkedIn when slug overlaps company tokens", () => {
    const line = enrichLeadershipCorpusLine(
      {
        title: "Amy Bittle | LinkedIn",
        snippet: "",
        link: "https://www.linkedin.com/in/amy-bittle-12345/",
      },
      "Amy Bittle Consulting",
    );
    expect(line).toMatch(/Amy Bittle is Chief Executive Officer/);
  });
});
