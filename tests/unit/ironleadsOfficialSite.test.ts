import { describe, expect, it } from "vitest";

import {
  buildCompanyWebsiteProbeUrls,
  extractUsPostalAddress,
  pickOfficialWebsite,
  shortBrandLabel,
} from "@/app/lib/ironleadsOfficialSite";

describe("ironleadsOfficialSite", () => {
  it("probes the short brand before the compacted directory name", () => {
    const urls = buildCompanyWebsiteProbeUrls("TPx Communications");
    expect(shortBrandLabel("TPx Communications")).toBe("tpx");
    expect(urls[0]).toBe("https://tpx.com");
    expect(urls[1]).toBe("https://www.tpx.com");
  });

  it("does not treat ordinary words in a multi-word name as a brand domain", () => {
    expect(shortBrandLabel("Red River")).toBeNull();
    const urls = buildCompanyWebsiteProbeUrls("Red River");
    expect(urls[0]).toBe("https://www.redriver.com");
    expect(urls.some((url) => /https:\/\/(www\.)?river\.com/.test(url))).toBe(false);
    expect(urls.some((url) => /https:\/\/(www\.)?red\.com/.test(url))).toBe(false);
  });

  it("recovers an official site from a Wikipedia mention and ignores directories", () => {
    const picked = pickOfficialWebsite({
      company: "TPx Communications",
      urls: [
        "https://www.linkedin.com/company/tpx-communications",
        "https://www.zoominfo.com/c/tpx-communications/123",
        "https://en.wikipedia.org/wiki/TPx_Communications",
      ],
      htmlBlobs: [
        '<th>Website</th><td><a class="external" href="https://www.tpx.com">tpx.com</a></td>',
      ],
    });
    expect(picked).toBe("https://www.tpx.com");
  });

  it("extracts a US street address from page text", () => {
    const address = extractUsPostalAddress(
      "Headquarters 303 N Glenoaks Blvd, Burbank, CA 91502 United States",
    );
    expect(address).toEqual({
      street: "303 N Glenoaks Blvd",
      city: "Burbank",
      state: "CA",
      zip: "91502",
      country: "US",
    });
  });

  it("keeps a suite that follows a building-name street", () => {
    const address = extractUsPostalAddress(
      "Plaza 7000 North Mopac Expressway Suite 2080 Austin, TX 78731",
    );
    expect(address?.street).toBe("Plaza 7000 North Mopac Expressway Suite 2080");
    expect(address?.city).toBe("Austin");
    expect(address?.zip).toBe("78731");
  });
});
