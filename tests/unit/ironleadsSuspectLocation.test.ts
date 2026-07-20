import { describe, expect, it } from "vitest";

import {
  formatSuspectAddressLine,
  resolveSuspectLocationFields,
  websiteUrlFromDomainOrUrl,
} from "@/app/lib/server/ironleadsSuspectLocation";

describe("ironleadsSuspectLocation", () => {
  it("builds https website URLs from domains and preserves absolute URLs", () => {
    expect(websiteUrlFromDomainOrUrl("hhs.gov")).toBe("https://hhs.gov");
    expect(websiteUrlFromDomainOrUrl("https://www.example.com/path")).toBe(
      "https://www.example.com/path",
    );
    expect(websiteUrlFromDomainOrUrl("not a domain")).toBeNull();
  });

  it("prefers metadata website/address over domain derivation", () => {
    const location = resolveSuspectLocationFields({
      accountDomain: "example.com",
      metadata: {
        websiteUrl: "https://www.westernalliancebancorporation.com",
        address: {
          street: "1 East Washington Street, Suite 1400",
          city: "Phoenix",
          state: "AZ",
          zip: "85004",
          country: "United States",
        },
      },
    });
    expect(location.websiteUrl).toBe("https://www.westernalliancebancorporation.com");
    expect(location.addressLine).toContain("Phoenix");
    expect(formatSuspectAddressLine(location.address)).toContain("85004");
  });

  it("falls back to accountDomain when metadata has no website", () => {
    const location = resolveSuspectLocationFields({
      accountDomain: "msrc.microsoft.com",
      metadata: {},
    });
    expect(location.websiteUrl).toBe("https://msrc.microsoft.com");
    expect(location.addressLine).toBeNull();
    expect(location.websiteContact).toBeNull();
  });

  it("reads websiteContact phone/email from metadata", () => {
    const location = resolveSuspectLocationFields({
      accountDomain: "westernalliancebancorporation.com",
      metadata: {
        websiteContact: {
          phone: "+16023893500",
          email: null,
          contactPageUrl: "https://www.westernalliancebancorporation.com/contact-us",
          note: "HQ switchboard",
        },
      },
    });
    expect(location.websiteContact?.phone).toBe("+16023893500");
    expect(location.websiteContact?.contactPageUrl).toContain("contact-us");
  });

  it("reads namedBuyer appointment facts from metadata", () => {
    const location = resolveSuspectLocationFields({
      accountDomain: "westernalliancebancorporation.com",
      metadata: {
        namedBuyer: {
          fullName: "Stephen McMaster",
          title: "Chief Information Security Officer",
          location: "Phoenix, AZ",
          trigger: "NEW_CISO",
          announcedAt: "2026-01-21",
          sourceUrls: [
            "https://www.businesswire.com/news/home/20260121262396/en/Western-Alliance-Appoints-Stephen-McMaster-as-Chief-Information-Security-Officer",
          ],
          note: "Public CISO appointment",
        },
      },
    });
    expect(location.namedBuyer?.fullName).toBe("Stephen McMaster");
    expect(location.namedBuyer?.trigger).toBe("NEW_CISO");
    expect(location.namedBuyer?.sourceUrls[0]).toContain("businesswire.com");
  });

  it("reads executiveSponsor board/CEO context from metadata", () => {
    const location = resolveSuspectLocationFields({
      accountDomain: "westernalliancebancorporation.com",
      metadata: {
        executiveSponsor: {
          fullName: "Kenneth A. Vecchione",
          title: "Chairman, President and Chief Executive Officer",
          roleSince: "2018-04-01",
          chairmanSince: "2026-06-10",
          sourceUrls: [
            "https://www.businesswire.com/news/home/20260615498168/en/Western-Alliance-Appoints-CEO-Kenneth-Vecchione-as-Chairman",
          ],
          note: "Board context",
        },
      },
    });
    expect(location.executiveSponsor?.fullName).toBe("Kenneth A. Vecchione");
    expect(location.executiveSponsor?.chairmanSince).toBe("2026-06-10");
  });
});
