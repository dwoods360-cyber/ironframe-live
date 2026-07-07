import { describe, expect, it, vi } from "vitest";

import {
  assignTenantWorkspaceNav,
  isTenantWorkspaceHost,
  resolveLinkHref,
} from "@/app/lib/nav/tenantWorkspaceNav";

describe("tenantWorkspaceNav", () => {
  it("resolves string and object hrefs", () => {
    expect(resolveLinkHref("/integrity")).toBe("/integrity");
    expect(resolveLinkHref({ pathname: "/vendors", hash: "#top" })).toBe("/vendors#top");
  });

  it("detects tenant workspace hosts", () => {
    expect(isTenantWorkspaceHost("bwc.ironframegrc.com", null)).toBe(true);
    expect(isTenantWorkspaceHost("ironframegrc.com", null)).toBe(false);
    expect(isTenantWorkspaceHost(null, "bwc")).toBe(true);
  });

  it("assigns full navigation on tenant hosts", () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });

    const didAssign = assignTenantWorkspaceNav("/integrity", "bwc.ironframegrc.com", "bwc");

    expect(didAssign).toBe(true);
    expect(assign).toHaveBeenCalledWith("/integrity");
  });

  it("skips assign on apex control plane", () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });

    const didAssign = assignTenantWorkspaceNav("/integrity", "ironframegrc.com", null);

    expect(didAssign).toBe(false);
    expect(assign).not.toHaveBeenCalled();
  });
});
