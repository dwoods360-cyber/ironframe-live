import { describe, expect, it } from "vitest";

import {
  extractBuyingPersons,
  extractPublishedEmails,
  extractPublicSocialLinks,
  extractUsPhones,
  guessInitialLastEmail,
  inferInitialLastEmailPattern,
  isPlausiblePersonName,
  socialAboutFetchUrl,
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

  it("extracts public LinkedIn/YouTube/Facebook links and never marks LinkedIn fetchable", () => {
    const html = `
      <a href="https://www.linkedin.com/company/acme-grc">LinkedIn</a>
      <a href="https://www.linkedin.com/in/jane-ciso">Jane</a>
      <a href="https://www.youtube.com/@AcmeGRC">YouTube</a>
      <a href="https://www.facebook.com/AcmeGRC">Facebook</a>
    `;
    const links = extractPublicSocialLinks(html);
    expect(links.some((l) => l.network === "linkedin" && l.kind === "company_page")).toBe(true);
    expect(links.some((l) => l.network === "linkedin" && l.kind === "person_profile")).toBe(true);
    expect(links.filter((l) => l.network === "linkedin").every((l) => !l.fetchable)).toBe(true);
    const yt = links.find((l) => l.network === "youtube");
    expect(yt?.fetchable).toBe(true);
    expect(socialAboutFetchUrl(yt!)).toMatch(/\/about$/);
    const fb = links.find((l) => l.network === "facebook");
    expect(fb?.fetchable).toBe(true);
    expect(socialAboutFetchUrl(fb!)).toMatch(/\/about$/);
  });
});
