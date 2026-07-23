import { describe, expect, it } from "vitest";

import { resolveRequeueChannel } from "@/app/lib/server/salesteamDraftRequeueChannel";
import { buildC1LockedEmailBody } from "@/app/lib/server/salesteamC1LockedCopy";
import type { SalesteamProspectWire } from "@/app/lib/server/salesteamIngressCore";

function prospect(partial: Partial<SalesteamProspectWire>): SalesteamProspectWire {
  return {
    dealId: "11111111-1111-4111-8111-111111111111",
    contactId: "22222222-2222-4222-8222-222222222222",
    tenantId: "33333333-3333-4333-8333-333333333333",
    stage: "PROSPECT",
    dealTitle: "Test",
    valueCents: "0",
    company: "BlueRadius Cyber",
    fullName: "Ops Contact",
    email: "info@blueradius.io",
    phone: null,
    industrySector: "MSSP_ENCLAVE",
    detectedTrigger: "COMPLIANCE_JOB_POST",
    priorityScore: 80,
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

describe("resolveRequeueChannel", () => {
  it("uses EMAIL for real destinations (BlueRadius)", () => {
    expect(resolveRequeueChannel(prospect({ email: "info@blueradius.io" }))).toBe("EMAIL");
  });

  it("uses SMS when email is ironleads.local and phone exists", () => {
    expect(
      resolveRequeueChannel(
        prospect({
          company: "Pivot Point Security",
          email: "lead@ironleads.local",
          phone: "+18774540039",
        }),
      ),
    ).toBe("SMS");
  });

  it("returns null when neither usable email nor phone", () => {
    expect(
      resolveRequeueChannel(
        prospect({ email: "x@ironleads.local", phone: null }),
      ),
    ).toBeNull();
  });
});

describe("buildC1LockedEmailBody", () => {
  it("uses Option A opener, Command Design Partner, no Path B, founder sign-off", () => {
    const { body } = buildC1LockedEmailBody(prospect({}));
    expect(body).toContain("Noticed BlueRadius Cyber is expanding its compliance / GRC team recently");
    expect(body).toContain("Command Design Partner");
    expect(body).toContain("$4,999");
    expect(body).toContain("10–15 minute workflow review");
    expect(body).toContain("Dereck");
    expect(body).toContain("Founder, Ironframe");
    expect(body.toLowerCase()).not.toContain("path b");
    expect(body.toLowerCase()).not.toContain("hiring signal");
    expect(body).not.toMatch(/— Ironframe\s*$/m);
  });
});

describe("buildC1LockedSmsBody", () => {
  it("stays under 160 chars with Command Design Partner and workflow review CTA", async () => {
    const { buildC1LockedSmsBody, C1_LOCKED_SMS_BODY_GENERIC } = await import(
      "@/app/lib/server/salesteamC1LockedCopy"
    );
    const { body } = buildC1LockedSmsBody(prospect({}));
    expect(body.length).toBeLessThanOrEqual(160);
    expect(body).toContain("Command Design Partner");
    expect(body).toContain("$4,999");
    expect(body).toContain("10–15 min workflow review");
    expect(body.toLowerCase()).not.toContain("path b");
    expect(C1_LOCKED_SMS_BODY_GENERIC.length).toBeLessThanOrEqual(160);
  });
});
