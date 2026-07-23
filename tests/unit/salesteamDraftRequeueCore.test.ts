import { describe, expect, it } from "vitest";

import { resolveRequeueChannel } from "@/app/lib/server/salesteamDraftRequeueChannel";
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
