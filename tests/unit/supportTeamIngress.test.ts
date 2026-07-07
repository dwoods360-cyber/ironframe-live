import { describe, expect, it } from "vitest";

import {
  isSupportTeamContextSnapshotIngressPath,
  isSupportTeamIngressPath,
  isSupportTeamReplyIngressPath,
  isSupportTeamTicketsIngressPath,
} from "@/app/utils/grcRouteMatch";

describe("support-team ingress routes", () => {
  it("recognizes support-team poll, reply, and context snapshot paths", () => {
    expect(isSupportTeamTicketsIngressPath("/api/v1/ingress/support-team/tickets")).toBe(true);
    expect(isSupportTeamReplyIngressPath("/api/v1/ingress/support-team/reply")).toBe(true);
    expect(
      isSupportTeamContextSnapshotIngressPath("/api/v1/ingress/support-team/context-snapshot"),
    ).toBe(true);
    expect(isSupportTeamIngressPath("/api/v1/ingress/support-team/tickets")).toBe(true);
    expect(isSupportTeamIngressPath("/api/v1/ingress/support-team/reply")).toBe(true);
    expect(isSupportTeamIngressPath("/api/v1/ingress/support-team/other")).toBe(false);
  });
});
