import { describe, expect, it } from "vitest";

import {
  isSalesteamIngressPath,
  isSalesteamOutreachIngressPath,
  isSalesteamProspectsIngressPath,
} from "@/app/utils/grcRouteMatch";

describe("salesteam ingress routes", () => {
  it("recognizes salesteam poll and outreach paths", () => {
    expect(isSalesteamProspectsIngressPath("/api/v1/ingress/salesteam/prospects")).toBe(true);
    expect(isSalesteamOutreachIngressPath("/api/v1/ingress/salesteam/outreach")).toBe(true);
    expect(isSalesteamIngressPath("/api/v1/ingress/salesteam/prospects")).toBe(true);
    expect(isSalesteamIngressPath("/api/v1/ingress/salesteam/outreach")).toBe(true);
    expect(isSalesteamIngressPath("/api/v1/ingress/salesteam/other")).toBe(false);
  });
});
