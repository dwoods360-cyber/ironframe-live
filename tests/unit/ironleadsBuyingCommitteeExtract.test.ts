import { describe, expect, it } from "vitest";

import {
  extractBuyingPersons,
  extractPublishedEmails,
  extractMailtoEmails,
  extractDirectoryEmailClues,
  discoverPublishedEmails,
  extractTradeShowAndEventSignals,
  publishedEmailMatchesPerson,
  extractPublicSocialLinks,
  extractSameOriginTeamPageUrls,
  extractUsPhones,
  buildEmailPermutationCandidates,
  EMAIL_PATTERN_TEST_ORDER,
  guessFirstDotLastEmail,
  guessInitialLastEmail,
  inferEmailLocalPattern,
  inferInitialLastEmailPattern,
  isPlausiblePersonName,
  isRoleLocalPart,
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
    expect(inferEmailLocalPattern(emails)).toEqual({
      domain: "westernalliancebank.com",
      pattern: "initial_last",
    });
    expect(guessInitialLastEmail("Stephen McMaster", "westernalliancebank.com")).toBe(
      "smcmaster@westernalliancebank.com",
    );
  });

  it("infers first.last pattern and guesses MSSP-default first.last emails", () => {
    expect(
      inferEmailLocalPattern([
        "jane.doe@acme-mssp.com",
        "alex.chen@acme-mssp.com",
      ]),
    ).toEqual({ domain: "acme-mssp.com", pattern: "first_dot_last" });
    expect(guessFirstDotLastEmail("Al Alper", "absolutelogic.com")).toBe(
      "al.alper@absolutelogic.com",
    );
    expect(guessFirstDotLastEmail("Ruppert Vernon", "absolutelogic.com")).toBe(
      "ruppert.vernon@absolutelogic.com",
    );
  });

  it("builds industry failover order first.last → f.last → first@", () => {
    expect(EMAIL_PATTERN_TEST_ORDER.slice(0, 3)).toEqual([
      "first_dot_last",
      "initial_last",
      "first_only",
    ]);
    const candidates = buildEmailPermutationCandidates("Al Alper", "absolutelogic.com", {
      max: 3,
    });
    expect(candidates.map((c) => c.email)).toEqual([
      "al.alper@absolutelogic.com",
      "aalper@absolutelogic.com",
      "al@absolutelogic.com",
    ]);
    expect(
      buildEmailPermutationCandidates("Stephen McMaster", "westernalliancebank.com", {
        primary: "initial_last",
        max: 2,
      }).map((c) => c.pattern),
    ).toEqual(["initial_last", "first_dot_last"]);
  });

  it("extracts phones and domain-scoped emails", () => {
    const text =
      "Call (602) 389-3500 or email mpondelik@westernalliancebank.com for investors.";
    expect(extractUsPhones(text)).toContain("+16023893500");
    expect(
      extractPublishedEmails(text, "westernalliancebancorporation.com"),
    ).toContain("mpondelik@westernalliancebank.com");
  });

  it("initial search: mailto hrefs survive HTML strip (Contact link text alone)", () => {
    const html = `
      <a href="mailto:Hello@dynamiccomply.com">Contact</a>
      <a href="mailto:support@fablesecurity.com?subject=Help">Support</a>
      <p>Visible body has no address.</p>
    `;
    expect(extractMailtoEmails(html, "dynamiccomply.com")).toContain(
      "hello@dynamiccomply.com",
    );
    expect(extractMailtoEmails(html, "fablesecurity.com")).toContain(
      "support@fablesecurity.com",
    );
    // Text-only extract would miss href-only mailtos after strip.
    expect(extractPublishedEmails("Contact Support", "dynamiccomply.com")).toEqual([]);
  });

  it("initial search: directory/bio E-Mail labels and discoverPublishedEmails priority", () => {
    const text =
      "Key Contact Name Nicole Jiang Title CEO E-Mail nicole@fablesecurity.com Funding Events";
    expect(extractDirectoryEmailClues(text, "fablesecurity.com")).toContain(
      "nicole@fablesecurity.com",
    );
    const hits = discoverPublishedEmails({
      html: `<a href="mailto:hello@fablesecurity.com">hello</a>`,
      text: "Email: press@fablesecurity.com and stray other@gmail.com",
      accountDomain: "fablesecurity.com",
    });
    const byEmail = Object.fromEntries(hits.map((h) => [h.email, h]));
    expect(byEmail["hello@fablesecurity.com"]?.kind).toBe("mailto");
    expect(byEmail["press@fablesecurity.com"]?.kind).toBe("directory_label");
    expect(byEmail["other@gmail.com"]).toBeUndefined();
    expect(isRoleLocalPart("hello")).toBe(true);
    expect(isRoleLocalPart("nicole")).toBe(false);
  });

  it("matches published first@ / first.last@ locals to people; ignores role inboxes", () => {
    expect(publishedEmailMatchesPerson("nicole@fablesecurity.com", "Nicole Jiang-Gibson")).toBe(
      true,
    );
    expect(
      publishedEmailMatchesPerson("nicole.jiang@fablesecurity.com", "Nicole Jiang-Gibson"),
    ).toBe(true);
    expect(publishedEmailMatchesPerson("hello@fablesecurity.com", "Nicole Jiang-Gibson")).toBe(
      false,
    );
    expect(publishedEmailMatchesPerson("ross@dynamiccomply.com", "Ross J.")).toBe(true);
    expect(publishedEmailMatchesPerson("ali@ocsecurityaudit.com", "Ali Hassani")).toBe(true);
  });

  it("extracts trade show booth and hosted-event registration clues", () => {
    const text = `
      Come find us at Black Hat USA 2026 booth 6011 in Startup Alley.
      We are hosting a private threat briefing suite and an executive dinner.
      Also exhibiting at RSA Conference booth S-0263.
    `;
    const signals = extractTradeShowAndEventSignals(
      text,
      "https://fablesecurity.com/resources/blog/fable-at-black-hat-2026/",
    );
    expect(signals.some((s) => s.kind === "booth" && /6011/.test(s.detail ?? ""))).toBe(
      true,
    );
    expect(signals.some((s) => /Black Hat/i.test(s.eventName))).toBe(true);
    expect(signals.some((s) => /RSA/i.test(s.eventName) && s.kind === "booth")).toBe(true);
  });

  it("seeds first_only schema from a single published personal first@ (not hello@)", () => {
    expect(
      inferEmailLocalPattern(["hello@fablesecurity.com", "nicole@fablesecurity.com"]),
    ).toEqual({ domain: "fablesecurity.com", pattern: "first_only" });
    expect(
      buildEmailPermutationCandidates("Sanny Liao", "fablesecurity.com", {
        primary: "first_only",
        max: 2,
      }).map((c) => c.email),
    ).toEqual(["sanny@fablesecurity.com", "sanny.liao@fablesecurity.com"]);
  });

  it("rejects award / board / product-UI noise as person names", () => {
    expect(isPlausiblePersonName("and Best Company Board")).toBe(false);
    expect(isPlausiblePersonName("Scorecard Free")).toBe(false);
    expect(isPlausiblePersonName("Readiness Tool")).toBe(false);
    expect(isPlausiblePersonName("IT Manager")).toBe(false);
    expect(isPlausiblePersonName("Phishing Simulation")).toBe(false);
    expect(isPlausiblePersonName("Knowledge Center")).toBe(false);
    expect(isPlausiblePersonName("Us Your")).toBe(false);
    expect(isPlausiblePersonName("Adviser Global")).toBe(false);
    expect(isPlausiblePersonName("National Defense")).toBe(false);
    expect(isPlausiblePersonName("Dameon Jeremy")).toBe(false);
    expect(isPlausiblePersonName("Andrew B. Quiming")).toBe(true);
    expect(isPlausiblePersonName("Al Alper")).toBe(true);
    expect(isPlausiblePersonName("Stephen McMaster")).toBe(true);
    expect(isPlausiblePersonName("Kenneth A. Vecchione")).toBe(true);
    expect(isPlausiblePersonName("Ali Hassani")).toBe(true);
    expect(isPlausiblePersonName("Marguerite Fleming")).toBe(true);
  });

  it("extracts Meet the Leadership Team cards (Absolute Logic style)", () => {
    const text = `
Meet the Leadership Team
dameon jeremy soarin
Al Alper
CEO & Founder
dameon jeremy soarin
Ruppert Vernon
Director of Operations
`;
    const people = extractBuyingPersons(text);
    expect(people.some((p) => p.fullName === "Al Alper" && p.role === "CEO")).toBe(true);
    expect(
      people.some((p) => p.fullName === "Ruppert Vernon" && p.role === "DIRECTOR_OPS"),
    ).toBe(true);
    expect(people.some((p) => /dameon|soarin/i.test(p.fullName))).toBe(false);
  });

  it("discovers Meet the Team URLs from homepage nav (e.g. /company/meet-the-team/)", () => {
    const html = `
      <a href="/company/meet-the-team/">Meet The Team</a>
      <a href="https://www.pivotpointsecurity.com/about/leadership">Leadership</a>
      <a href="https://other.com/team">Ignore</a>
    `;
    const urls = extractSameOriginTeamPageUrls(
      html,
      "https://www.pivotpointsecurity.com",
    );
    expect(urls).toContain("https://www.pivotpointsecurity.com/company/meet-the-team");
    expect(urls).toContain("https://www.pivotpointsecurity.com/about/leadership");
    expect(urls.some((u) => u.includes("other.com"))).toBe(false);
  });

  it("extracts MSSP leadership from Meet the Team prose", () => {
    const text = [
      "John Verry Lead Managing Director",
      "As Pivot Point Security's Managing Partner and CEO John Verry guides organizations.",
      "Rich Stever GRC Practice Lead",
      "Richard Rebetti has been Pivot Point Security's Chief Operating Officer",
    ].join(" ");
    const people = extractBuyingPersons(text);
    expect(people.some((p) => p.role === "CEO" && /Verry/i.test(p.fullName))).toBe(true);
    expect(
      people.some((p) => p.role === "GRC_PRACTICE_LEAD" && /Stever/i.test(p.fullName)),
    ).toBe(true);
    expect(
      people.some((p) => p.role === "DIRECTOR_OPS" && /Rebetti/i.test(p.fullName)),
    ).toBe(true);
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
