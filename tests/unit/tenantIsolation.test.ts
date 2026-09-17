import { describe, expect, it } from "vitest";

import {
  assertTenantAccess,
  requireTenantAccess,
  TenantAccessViolationError,
  UnauthorizedError,
} from "@/app/utils/tenantIsolation";

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";

describe("tenantIsolation fail-closed guards", () => {
  it("denies missing active tenant in boolean checks", () => {
    expect(assertTenantAccess(null, A)).toBe(false);
    expect(assertTenantAccess("", A)).toBe(false);
  });

  it("allows matching tenants and denies mismatches", () => {
    expect(assertTenantAccess(A, A)).toBe(true);
    expect(assertTenantAccess(A, B)).toBe(false);
  });

  it("throws unauthorized when requireTenantAccess has no active tenant", () => {
    expect(() => requireTenantAccess(null, A)).toThrow(UnauthorizedError);
  });

  it("throws access violation on tenant mismatch", () => {
    expect(() => requireTenantAccess(A, B)).toThrow(TenantAccessViolationError);
  });
});
