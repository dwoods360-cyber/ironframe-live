import { describe, expect, it } from "vitest";

import {
  assessCatchAllRisk,
  classifyMailProvider,
  parseDmarcPolicy,
  resolveFootprintDomain,
} from "@/app/lib/server/domainMailFootprint";

describe("domainMailFootprint heuristics", () => {
  it("classifies Microsoft 365 MX", () => {
    expect(
      classifyMailProvider(["acme-com.mail.protection.outlook.com"]),
    ).toBe("microsoft365");
  });

  it("classifies Google Workspace MX", () => {
    expect(classifyMailProvider(["aspmx.l.google.com", "alt1.aspmx.l.google.com"])).toBe(
      "google",
    );
  });

  it("classifies Proofpoint / Mimecast as gateways", () => {
    expect(classifyMailProvider(["mx0a-000.ppe-hosted.com"])).toBe("proofpoint");
    expect(classifyMailProvider(["us-smtp-inbound-1.mimecast.com"])).toBe("mimecast");
  });

  it("marks gateway providers as high catch-all risk", () => {
    expect(assessCatchAllRisk("proofpoint")).toBe("high");
    expect(assessCatchAllRisk("mimecast")).toBe("high");
    expect(assessCatchAllRisk("microsoft365")).toBe("elevated");
    expect(assessCatchAllRisk("unknown")).toBe("unknown");
  });

  it("parses DMARC policy", () => {
    expect(parseDmarcPolicy("v=DMARC1; p=quarantine; rua=mailto:d@acme.com")).toBe(
      "quarantine",
    );
    expect(parseDmarcPolicy(null)).toBeNull();
  });

  it("resolves footprint domain preference order", () => {
    expect(
      resolveFootprintDomain({
        accountDomain: "Acme.COM",
        websiteUrl: "https://www.other.com",
        contactEmail: "x@third.com",
      }),
    ).toBe("acme.com");
    expect(
      resolveFootprintDomain({
        accountDomain: null,
        websiteUrl: "https://www.Other.com/about",
        contactEmail: "x@third.com",
      }),
    ).toBe("other.com");
    expect(
      resolveFootprintDomain({
        accountDomain: null,
        websiteUrl: null,
        contactEmail: "buyer@real.co",
      }),
    ).toBe("real.co");
    expect(
      resolveFootprintDomain({
        accountDomain: null,
        websiteUrl: null,
        contactEmail: "seed@ironleads.local",
      }),
    ).toBeNull();
  });
});
