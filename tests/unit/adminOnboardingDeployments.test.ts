import { describe, expect, it } from "vitest";

import {
  resolveActivatedOperatorEmails,
  resolveInfrastructureStatus,
  resolvePrimaryInviteEmail,
  type TenantLegalSignoffStatus,
} from "@/app/lib/server/adminOnboardingDeployments";
import { TENANT_BILLING_STATUS } from "@/app/lib/billing/constants";
import { WORKSPACE_INVITATION_STATUS } from "@/app/utils/invitation-core";
import { IRONFRAME_PRIVACY_VERSION, IRONFRAME_TERMS_VERSION } from "@/config/legal";

function resolveLegalSignoffForTest(input: {
  tenantUserIds: string[];
  invitations: Array<{ status: string }>;
  consents: Array<{ userId: string; termsVersion: string; privacyVersion: string }>;
}): TenantLegalSignoffStatus {
  const { tenantUserIds, invitations, consents } = input;
  const currentConsentCount = consents.filter(
    (row) =>
      row.termsVersion === IRONFRAME_TERMS_VERSION &&
      row.privacyVersion === IRONFRAME_PRIVACY_VERSION &&
      tenantUserIds.includes(row.userId),
  ).length;

  if (tenantUserIds.length > 0 && currentConsentCount >= tenantUserIds.length) {
    return "COMPLETE";
  }

  const hasActiveInvite = invitations.some(
    (row) => row.status === WORKSPACE_INVITATION_STATUS.ACTIVE,
  );
  const hasConsumedInvite = invitations.some(
    (row) => row.status === WORKSPACE_INVITATION_STATUS.CONSUMED,
  );

  if (hasActiveInvite || hasConsumedInvite || currentConsentCount > 0) {
    return "PENDING_SIGNATURE";
  }

  return "AWAITING_INITIALIZATION";
}

describe("admin onboarding deployment mapping", () => {
  it("maps billing ACTIVE to PROVISIONED infrastructure", () => {
    expect(resolveInfrastructureStatus(TENANT_BILLING_STATUS.ACTIVE)).toBe("PROVISIONED");
    expect(resolveInfrastructureStatus(TENANT_BILLING_STATUS.PENDING)).toBe("STAGED");
  });

  it("maps legal consent completion for all tenant operators", () => {
    expect(
      resolveLegalSignoffForTest({
        tenantUserIds: ["user-1"],
        invitations: [],
        consents: [
          {
            userId: "user-1",
            termsVersion: IRONFRAME_TERMS_VERSION,
            privacyVersion: IRONFRAME_PRIVACY_VERSION,
          },
        ],
      }),
    ).toBe("COMPLETE");
  });

  it("maps active invitations to pending signature posture", () => {
    expect(
      resolveLegalSignoffForTest({
        tenantUserIds: [],
        invitations: [{ status: WORKSPACE_INVITATION_STATUS.ACTIVE }],
        consents: [],
      }),
    ).toBe("PENDING_SIGNATURE");
  });

  it("prefers the newest invitation email for the operator roster", () => {
    const result = resolvePrimaryInviteEmail([
      {
        email: "older@example.com",
        status: WORKSPACE_INVITATION_STATUS.CONSUMED,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
      {
        email: "newest@example.com",
        status: WORKSPACE_INVITATION_STATUS.ACTIVE,
        createdAt: new Date("2026-06-01T00:00:00Z"),
      },
    ]);

    expect(result.email).toBe("newest@example.com");
    expect(result.status).toBe(WORKSPACE_INVITATION_STATUS.ACTIVE);
  });

  it("deduplicates activated operator emails from Supabase auth index", () => {
    const emailByUserId = new Map<string, string>([
      ["user-1", "operator@example.com"],
      ["user-2", "operator@example.com"],
      ["user-3", "other@example.com"],
    ]);

    expect(resolveActivatedOperatorEmails(["user-1", "user-2", "user-3", "missing"], emailByUserId)).toEqual([
      "operator@example.com",
      "other@example.com",
    ]);
  });
});
