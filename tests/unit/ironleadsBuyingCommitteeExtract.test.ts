import { describe, expect, it } from "vitest";

import {
  extractBuyingPersons,
  extractPublishedEmails,
  extractUsPhones,
  guessInitialLastEmail,
  inferInitialLastEmailPattern,
  isPlausiblePersonName,
} from "@/app/lib/server/ironleadsBuyingCommitteeExtract";

describe("ironleadsBuyingCommitteeExtract", () => {
  it("extracts CISO and CEO names from appointment prose", () => {
    const text = [
      "Western Alliance Appoints Stephen McMaster as Chief Information Security Officer.",
      "Kenneth A. Vecchione is Chairman, President and Chief Executive Officer.",
    ].join(" ");
    const people = extractBuyingPersons(text);
    const roles = people.map((p) => p.role);
    expect(roles).toContain("CISO");
    expect(roles).toContain("CEO");
    expect(people.find((p) => p.role === "CISO")?.fullName).toContain("McMaster");
    expect(people.find((p) => p.role === "CEO")?.fullName).toContain("Vecchione");
  });

  it("infers initial+last email pattern from published staff emails", () => {
    const emails = [
      "swhitlow@westernalliancebank.com",
      "mpondelik@westernalliancebank.com",
    ];
    expect(inferInitialLastEmailPattern(emails)).toEqual({
      domain: "westernalliancebank.com",
      pattern: "initial_last",
    });
    expect(guessInitialLastEmail("Stephen McMaster", "westernalliancebank.com")).toBe(
      "smcmaster@westernalliancebank.com",
    );
  });

  it("extracts phones and domain-scoped emails", () => {
    const text =
      "Call (602) 389-3500 or email mpondelik@westernalliancebank.com for investors.";
    expect(extractUsPhones(text)).toContain("+16023893500");
    expect(
      extractPublishedEmails(text, "westernalliancebancorporation.com"),
    ).toContain("mpondelik@westernalliancebank.com");
  });

  it("rejects award / board noise as person names", () => {
    expect(isPlausiblePersonName("and Best Company Board")).toBe(false);
    expect(isPlausiblePersonName("Stephen McMaster")).toBe(true);
    expect(isPlausiblePersonName("Kenneth A. Vecchione")).toBe(true);
  });
});
