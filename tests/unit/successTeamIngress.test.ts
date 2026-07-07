import { describe, expect, it } from "vitest";

import {
  isSuccessTeamAccountsIngressPath,
  isSuccessTeamAdvisoryIngressPath,
  isSuccessTeamHealthSnapshotIngressPath,
  isSuccessTeamIngressPath,
} from "@/app/utils/grcRouteMatch";

describe("success-team ingress routes", () => {
  it("recognizes success-team poll and advisory paths", () => {
    expect(isSuccessTeamAccountsIngressPath("/api/v1/ingress/success-team/accounts")).toBe(true);
    expect(isSuccessTeamHealthSnapshotIngressPath("/api/v1/ingress/success-team/health-snapshot")).toBe(
      true,
    );
    expect(isSuccessTeamAdvisoryIngressPath("/api/v1/ingress/success-team/advisory")).toBe(true);
    expect(isSuccessTeamIngressPath("/api/v1/ingress/success-team/accounts")).toBe(true);
    expect(isSuccessTeamIngressPath("/api/v1/ingress/success-team/advisory")).toBe(true);
    expect(isSuccessTeamIngressPath("/api/v1/ingress/success-team/other")).toBe(false);
  });
});
