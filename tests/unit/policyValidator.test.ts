import { describe, expect, it } from "vitest";
import {
  hardBanRequiresPolicyMatch,
  validateGovernedOverrideRationale,
} from "@/src/services/irontally/policyValidator";

const THIN_VALID =
  "error: quarantine false positive due to misconfiguration. identity: verified operator credential via mfa and manager check. mitigation: will ensure patch and change request before traffic resumes.";

const SUBSTANTIVE = `${THIN_VALID} ${" Additional operational context and timeline narrative for depth. ".repeat(12)}`;

describe("validateGovernedOverrideRationale", () => {
  it("rejects short rationale", () => {
    const r = validateGovernedOverrideRationale("x".repeat(49));
    expect(r.isValidComplianceStatement).toBe(false);
  });

  it("requires explanation, identity, and mitigation keywords", () => {
    const r = validateGovernedOverrideRationale("x".repeat(50));
    expect(r.isValidComplianceStatement).toBe(false);
  });

  it("returns isValidComplianceStatement when all three dimensions present", () => {
    const r = validateGovernedOverrideRationale(THIN_VALID);
    expect(r.isValidComplianceStatement).toBe(true);
    expect(r.hasExplanation).toBe(true);
    expect(r.hasIdentityVerification).toBe(true);
    expect(r.hasMitigation).toBe(true);
  });

  it("strike-tier policy match requires substantive depth", () => {
    const thin = validateGovernedOverrideRationale(THIN_VALID);
    expect(hardBanRequiresPolicyMatch(thin)).toBe(false);

    const deep = validateGovernedOverrideRationale(SUBSTANTIVE);
    expect(deep.isValidComplianceStatement).toBe(true);
    expect(hardBanRequiresPolicyMatch(deep)).toBe(true);
  });
});
