import { describe, expect, it } from "vitest";

import { shouldSuppressPilotStubExport } from "@/app/lib/pilotStubExportGate";

describe("shouldSuppressPilotStubExport", () => {
  it("allows stub export only for anonymous local dev without billing hold", () => {
    expect(
      shouldSuppressPilotStubExport({
        activeTenantUuid: null,
        billingBlocked: false,
      }),
    ).toBe(process.env.NODE_ENV === "production");
  });

  it("suppresses when an active workspace session is bound", () => {
    expect(
      shouldSuppressPilotStubExport({
        activeTenantUuid: "tenant-uuid-abc",
        billingBlocked: false,
      }),
    ).toBe(true);
  });

  it("allows platform administrators on active workspace sessions", () => {
    expect(
      shouldSuppressPilotStubExport({
        activeTenantUuid: "tenant-uuid-abc",
        billingBlocked: false,
        platformAdminBypass: true,
      }),
    ).toBe(false);
  });

  it("suppresses when billing is blocked even without tenant cookie hydration", () => {
    expect(
      shouldSuppressPilotStubExport({
        activeTenantUuid: null,
        billingBlocked: true,
      }),
    ).toBe(true);
  });
});
