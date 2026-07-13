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
    expect(isTenantWorkspaceHost("acorp.ironframegrc.com", null)).toBe(true);
    expect(isTenantWorkspaceHost("ironframegrc.com", null)).toBe(false);
    expect(isTenantWorkspaceHost(null, "acorp")).toBe(true);
  });

  it("assigns full navigation on tenant hosts", () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });

    const didAssign = assignTenantWorkspaceNav("/integrity", "acorp.ironframegrc.com", "acorp");

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

  it("assigns full navigation from heavy apex surfaces like /integrity", () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });

    const didAssign = assignTenantWorkspaceNav(
      "/vendors",
      "localhost:3000",
      null,
      "/integrity",
    );

    expect(didAssign).toBe(true);
    expect(assign).toHaveBeenCalledWith("/vendors");
  });

  it("assigns full navigation for any apex cross-route hop", () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });

    const didAssign = assignTenantWorkspaceNav(
      "/config",
      "localhost:3000",
      null,
      "/dashboard/operations",
    );

    expect(didAssign).toBe(true);
    expect(assign).toHaveBeenCalledWith("/config");
  });

  it("does not assign when heavy source path matches target", () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });

    const didAssign = assignTenantWorkspaceNav(
      "/integrity",
      "localhost:3000",
      null,
      "/integrity",
    );

    expect(didAssign).toBe(false);
    expect(assign).not.toHaveBeenCalled();
  });
});
