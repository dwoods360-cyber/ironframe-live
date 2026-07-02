import { describe, expect, it, vi } from "vitest";

import {
  isCommandPostNavigationReady,
  isTenantWorkspaceBootstrapUrl,
  resolveApexCommandPostWorkspaceTarget,
  resolveCommandPostWorkspaceTarget,
} from "@/app/lib/commandPostNavigation";

vi.mock("@/app/lib/tenantSubdomain", () => ({
  buildTenantSubdomainOrigin: (slug: string) => `http://${slug}.lvh.me:3000`,
  isApexControlPlaneHost: (host: string | null | undefined) => {
    const value = host?.trim().toLowerCase() ?? "";
    return value.startsWith("localhost") || value.startsWith("127.0.0.1");
  },
}));

describe("resolveCommandPostWorkspaceTarget", () => {
  const tenants = [
    { id: "uuid-bwc", slug: "bwc", name: "BWC" },
    { id: "uuid-med", slug: "medshield", name: "Medshield" },
  ];

  it("keeps / on tenant subdomain hosts", () => {
    expect(resolveCommandPostWorkspaceTarget("medshield", tenants, null)).toEqual({
      href: "/",
      usesWorkspaceOrigin: false,
      workspaceSlug: null,
    });
  });

  it("routes apex operators to cookie-selected workspace", () => {
    expect(resolveCommandPostWorkspaceTarget(null, tenants, "bwc")).toEqual({
      href: "http://bwc.lvh.me:3000",
      usesWorkspaceOrigin: true,
      workspaceSlug: "bwc",
    });
  });

  it("falls back to first assigned tenant on apex for scoped operators", () => {
    expect(resolveCommandPostWorkspaceTarget(null, tenants, null)).toEqual({
      href: "http://bwc.lvh.me:3000",
      usesWorkspaceOrigin: true,
      workspaceSlug: "bwc",
    });
  });

  it("does not auto-pick first tenant for GLOBAL_ADMIN without a cookie", () => {
    expect(resolveCommandPostWorkspaceTarget(null, tenants, null, true)).toEqual({
      href: "#",
      usesWorkspaceOrigin: false,
      workspaceSlug: null,
    });
  });

  it("routes GLOBAL_ADMIN to cookie-selected workspace on apex", () => {
    expect(resolveCommandPostWorkspaceTarget(null, tenants, "medshield", true)).toEqual({
      href: "http://medshield.lvh.me:3000",
      usesWorkspaceOrigin: true,
      workspaceSlug: "medshield",
    });
  });

  it("uses primary assignment slug when cookie scope is empty on apex", () => {
    expect(resolveApexCommandPostWorkspaceTarget(tenants, null, "gridcore", true)).toEqual({
      href: "http://gridcore.lvh.me:3000",
      usesWorkspaceOrigin: true,
      workspaceSlug: "gridcore",
    });
  });

  it("falls back to first scoped tenant when landing slug is missing on apex", () => {
    expect(resolveApexCommandPostWorkspaceTarget(tenants, null, null, true)).toEqual({
      href: "http://bwc.lvh.me:3000",
      usesWorkspaceOrigin: true,
      workspaceSlug: "bwc",
    });
  });

  it("uses primary assignment slug for scoped operators without a cookie", () => {
    expect(resolveApexCommandPostWorkspaceTarget([], null, "run3")).toEqual({
      href: "http://run3.lvh.me:3000",
      usesWorkspaceOrigin: true,
      workspaceSlug: "run3",
    });
  });

  it("marks apex workspace targets ready only when a slug is bound", () => {
    expect(
      isCommandPostNavigationReady({
        href: "http://bwc.lvh.me:3000",
        usesWorkspaceOrigin: true,
        workspaceSlug: "bwc",
      }, "localhost:3000"),
    ).toBe(true);
    expect(
      isCommandPostNavigationReady({
        href: "#",
        usesWorkspaceOrigin: false,
        workspaceSlug: null,
      }, "localhost:3000"),
    ).toBe(false);
    expect(
      isCommandPostNavigationReady({
        href: "/",
        usesWorkspaceOrigin: false,
        workspaceSlug: null,
      }, "localhost:3000"),
    ).toBe(false);
    expect(
      isCommandPostNavigationReady({
        href: "/",
        usesWorkspaceOrigin: false,
        workspaceSlug: null,
      }, "run3.lvh.me:3000"),
    ).toBe(true);
  });

  it("rejects apex-localhost bootstrap redeem URLs", () => {
    expect(
      isTenantWorkspaceBootstrapUrl(
        "http://localhost:3000/api/auth/session-bootstrap?token=bt_test",
        "run3",
      ),
    ).toBe(false);
    expect(
      isTenantWorkspaceBootstrapUrl(
        "http://run3.lvh.me:3000/api/auth/session-bootstrap?token=bt_test",
        "run3",
      ),
    ).toBe(true);
  });
});
