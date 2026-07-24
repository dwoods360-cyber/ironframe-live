import { describe, expect, it } from "vitest";
import { isAdminOnboardingPath } from "@/app/lib/auth/adminOnboardingRoute";
import {
  isPublicRegistrationApiPath,
  isPublicRegistrationPath,
  isPublicDemoRegistrationPath,
  isSalesIntakeApiPath,
} from "@/app/lib/auth/publicRegistrationRoute";
import { SALES_CONTACT_PATH } from "@/config/registration";

describe("registration route guards", () => {
  it("identifies admin onboarding paths", () => {
    expect(isAdminOnboardingPath("/admin/onboarding")).toBe(true);
    expect(isAdminOnboardingPath("/admin/onboarding/test-assets")).toBe(true);
    expect(isAdminOnboardingPath("/register/setup")).toBe(false);
  });

  it("identifies public prospect registration", () => {
    expect(isPublicRegistrationPath("/register/setup")).toBe(true);
    expect(isPublicRegistrationPath(SALES_CONTACT_PATH)).toBe(false);
    // Path still classified as demo entry; page permanently redirects to sales contact.
    expect(isPublicDemoRegistrationPath("/register/demo")).toBe(true);
    expect(isPublicRegistrationPath("/admin/onboarding")).toBe(false);
  });

  it("identifies registration intake APIs", () => {
    expect(isPublicRegistrationApiPath("/api/register/public-intake")).toBe(true);
    expect(isPublicRegistrationApiPath("/api/register/public-lead")).toBe(true);
    expect(isSalesIntakeApiPath("/api/register/sales-intake")).toBe(true);
    expect(isPublicRegistrationApiPath("/api/register/other")).toBe(false);
  });
});
