import { describe, expect, it } from "vitest";

import { isFellowsPortalHost } from "@/config/fellowsPortal";

describe("fellowsPortal hosts", () => {
  it("recognizes production and local fellows hosts", () => {
    expect(isFellowsPortalHost("fellows.ironframegrc.com")).toBe(true);
    expect(isFellowsPortalHost("lab.ironframegrc.com")).toBe(true);
    expect(isFellowsPortalHost("fellows.localhost:3000")).toBe(true);
    expect(isFellowsPortalHost("app.ironframegrc.com")).toBe(false);
    expect(isFellowsPortalHost(null)).toBe(false);
  });
});
