import { describe, expect, it } from "vitest";
import { directiveKeyFromIronguardErrorCode } from "@/src/services/ironscribe/constitutionalAuditDirectives";

describe("constitutionalAuditDirectives", () => {
  it("maps cross-tenant and Ironguard codes to Ironguard-13 bucket", () => {
    expect(directiveKeyFromIronguardErrorCode("CROSS_TENANT_API_BLOCKED")).toBe("IRONGUARD_13");
    expect(directiveKeyFromIronguardErrorCode("IRONGUARD_SESSION_HEADER_MISMATCH")).toBe("IRONGUARD_13");
    expect(directiveKeyFromIronguardErrorCode("IRONGUARD_NO_TENANT_HEADER")).toBe("IRONGUARD_13");
  });

  it("treats unknown codes as residue gap", () => {
    expect(directiveKeyFromIronguardErrorCode("UNKNOWN")).toBe("RESIDUE_GAP");
    expect(directiveKeyFromIronguardErrorCode("")).toBe("RESIDUE_GAP");
    expect(directiveKeyFromIronguardErrorCode("MYSTERY_BLOCK")).toBe("RESIDUE_GAP");
  });
});
