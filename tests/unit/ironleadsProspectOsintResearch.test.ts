import { describe, expect, it } from "vitest";

import {
  dossierNeedsPublicOsint,
  mergeBuyingCommitteeMembers,
  type BuyingCommitteeMember,
} from "@/app/lib/server/ironleadsBuyingCommitteeResearchCore";

function member(
  overrides: Partial<BuyingCommitteeMember> &
    Pick<BuyingCommitteeMember, "role" | "fullName">,
): BuyingCommitteeMember {
  return {
    title: overrides.title ?? overrides.role,
    emails: overrides.emails ?? [],
    phones: overrides.phones ?? [],
    sourceUrls: overrides.sourceUrls ?? [],
    note: overrides.note ?? null,
    ...overrides,
  };
}

describe("prospect OSINT research helpers", () => {
  it("runs public OSINT when names exist but only intake inboxes are published", () => {
    expect(
      dossierNeedsPublicOsint({
        members: [
          member({
            role: "CEO",
            fullName: "Kannan Udayarajan",
            emails: [
              {
                email: "sales@siemba.io",
                status: "published",
                source: "contact",
              },
            ],
          }),
        ],
        publishedEmails: ["sales@siemba.io", "support@siemba.io"],
      }),
    ).toBe(true);
  });

  it("skips public OSINT when a named buyer already has a personal published email", () => {
    expect(
      dossierNeedsPublicOsint({
        members: [
          member({
            role: "CISO",
            fullName: "Sandhya Prashanth",
            emails: [
              {
                email: "sandhya.prashanth@siemba.io",
                status: "published",
                source: "about",
              },
            ],
          }),
        ],
        publishedEmails: ["sandhya.prashanth@siemba.io"],
      }),
    ).toBe(false);
  });

  it("merges later public-web emails onto an existing named buyer", () => {
    const merged = mergeBuyingCommitteeMembers(
      [
        member({
          role: "CEO",
          fullName: "Kannan Udayarajan",
          emails: [
            {
              email: "kannan@siemba.io",
              status: "pattern_guess",
              source: "assumed_first_only",
            },
          ],
          sourceUrls: ["https://www.siemba.io/about-us"],
        }),
      ],
      [
        member({
          role: "CEO",
          fullName: "Kannan Udayarajan",
          emails: [
            {
              email: "kannan@siemba.io",
              status: "published",
              source: "company_website_mailto_or_directory",
            },
          ],
          sourceUrls: ["https://www.msspalert.com/siemba"],
          note: "Public-web OSINT — confirm before Promote",
        }),
      ],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.emails[0]).toMatchObject({
      email: "kannan@siemba.io",
      status: "published",
    });
    expect(merged[0]?.sourceUrls).toEqual(
      expect.arrayContaining([
        "https://www.siemba.io/about-us",
        "https://www.msspalert.com/siemba",
      ]),
    );
  });
});
