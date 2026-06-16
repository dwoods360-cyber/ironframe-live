import { describe, expect, it } from "vitest";

import { isBillingGateActiveStatus, TENANT_BILLING_STATUS } from "@/app/lib/billing/constants";
import { buildLegalAcceptanceHash } from "@/app/lib/legal/acceptanceHash";

describe("tenant billing constants", () => {
  it("gates PENDING and PAST_DUE only", () => {
    expect(isBillingGateActiveStatus(TENANT_BILLING_STATUS.PENDING)).toBe(true);
    expect(isBillingGateActiveStatus(TENANT_BILLING_STATUS.PAST_DUE)).toBe(true);
    expect(isBillingGateActiveStatus(TENANT_BILLING_STATUS.ACTIVE)).toBe(false);
  });
});

describe("legal acceptance hash", () => {
  it("produces deterministic sha256 hex", () => {
    const a = buildLegalAcceptanceHash("user-1", "2026-06-15T00:00:00.000Z");
    const b = buildLegalAcceptanceHash("user-1", "2026-06-15T00:00:00.000Z");
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
});
