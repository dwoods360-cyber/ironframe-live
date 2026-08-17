import { describe, expect, it } from "vitest";

import {
  buildDeploymentQuarantineResponse,
  isLocalDevelopmentHost,
  isPublicIngressAllowed,
  isTenantSubdomainHost,
  shouldBlockProductionIngress,
} from "@/app/lib/security/deploymentQuarantine";
import type { NextRequest } from "next/server";

function mockRequest(
  pathname: string,
  cookies: Record<string, string> = {},
  hostname = "ironframegrc.com",
) {
  return {
    nextUrl: { pathname, hostname },
    headers: {
      get: (name: string) => (name.toLowerCase() === "host" ? hostname : null),
    },
    cookies: {
      has: (name: string) => name in cookies,
      get: (name: string) => (cookies[name] ? { name, value: cookies[name] } : undefined),
      getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })),
    },
  } as unknown as NextRequest;
}

describe("deploymentQuarantine", () => {
  it("whitelists localhost, lvh.me, and private LAN IPv4 hosts", () => {
    expect(isLocalDevelopmentHost("localhost")).toBe(true);
    expect(isLocalDevelopmentHost("127.0.0.1")).toBe(true);
    expect(isLocalDevelopmentHost("vaultbank.lvh.me")).toBe(true);
    expect(isLocalDevelopmentHost("ironframegrc.com")).toBe(false);
    expect(isLocalDevelopmentHost("vaultbank.localhost")).toBe(true);
    expect(isLocalDevelopmentHost("192.168.4.20")).toBe(true);
    expect(isLocalDevelopmentHost("10.0.0.5")).toBe(true);
    expect(isLocalDevelopmentHost("172.16.1.1")).toBe(true);
    expect(isLocalDevelopmentHost("8.8.8.8")).toBe(false);
    expect(isLocalDevelopmentHost("172.32.0.1")).toBe(false);
  });

  it("does not quarantine dashboard when Host is a LAN IP", () => {
    delete process.env.IRONFRAME_ALLOW_PUBLIC_INGRESS;
    expect(
      shouldBlockProductionIngress(
        mockRequest("/dashboard/operations", {}, "192.168.4.20"),
        "/dashboard/operations",
      ),
    ).toBe(false);
    expect(
      shouldBlockProductionIngress(
        mockRequest("/dashboard/operations", {}, "192.168.4.20:3000"),
        "/dashboard/operations",
      ),
    ).toBe(false);
  });

  it("detects tenant subdomain hosts", () => {
    expect(isTenantSubdomainHost("vaultbank.ironframegrc.com")).toBe(true);
    expect(isTenantSubdomainHost("ironframegrc.com")).toBe(false);
  });

  it("allows narrow public funnel paths on cloud while workspace stays quarantined", () => {
    delete process.env.IRONFRAME_ALLOW_PUBLIC_INGRESS;

    expect(shouldBlockProductionIngress(mockRequest("/"), "/")).toBe(false);
    expect(shouldBlockProductionIngress(mockRequest("/marketing"), "/marketing")).toBe(false);
    expect(shouldBlockProductionIngress(mockRequest("/docs/hub"), "/docs/hub")).toBe(true);
    expect(shouldBlockProductionIngress(mockRequest("/login"), "/login")).toBe(false);
    expect(
      shouldBlockProductionIngress(mockRequest("/forgot-password"), "/forgot-password"),
    ).toBe(false);
    expect(
      shouldBlockProductionIngress(mockRequest("/reset-password"), "/reset-password"),
    ).toBe(false);
    expect(
      shouldBlockProductionIngress(
        mockRequest("/api/auth/callback"),
        "/api/auth/callback",
      ),
    ).toBe(false);
    expect(shouldBlockProductionIngress(mockRequest("/integrity"), "/integrity")).toBe(true);
    expect(
      shouldBlockProductionIngress(mockRequest("/login", {}, "vaultbank.ironframegrc.com"), "/login"),
    ).toBe(false);
    expect(
      shouldBlockProductionIngress(
        mockRequest("/dashboard", {}, "vaultbank.ironframegrc.com"),
        "/dashboard",
      ),
    ).toBe(true);
  });

  it("never blocks local development hosts", () => {
    delete process.env.IRONFRAME_ALLOW_PUBLIC_INGRESS;

    expect(shouldBlockProductionIngress(mockRequest("/login", {}, "localhost"), "/login")).toBe(
      false,
    );
    expect(
      shouldBlockProductionIngress(mockRequest("/dashboard", {}, "vaultbank.lvh.me"), "/dashboard"),
    ).toBe(false);
  });

  it("allows signed Stripe webhook ingress on cloud while UI stays quarantined", () => {
    delete process.env.IRONFRAME_ALLOW_PUBLIC_INGRESS;
    expect(
      shouldBlockProductionIngress(
        mockRequest("/api/webhooks/stripe"),
        "/api/webhooks/stripe",
      ),
    ).toBe(false);
    expect(
      shouldBlockProductionIngress(
        mockRequest("/api/billing/webhook"),
        "/api/billing/webhook",
      ),
    ).toBe(false);
    expect(shouldBlockProductionIngress(mockRequest("/pricing"), "/pricing")).toBe(false);
  });

  it("allows token-gated API ingress on cloud while UI stays quarantined", () => {
    delete process.env.IRONFRAME_ALLOW_PUBLIC_INGRESS;
    expect(
      shouldBlockProductionIngress(mockRequest("/api/board/feed"), "/api/board/feed"),
    ).toBe(false);
    expect(
      shouldBlockProductionIngress(
        mockRequest("/api/cron/narrate"),
        "/api/cron/narrate",
      ),
    ).toBe(false);
    expect(
      shouldBlockProductionIngress(
        mockRequest("/api/internal/cron/agent17-sentinel"),
        "/api/internal/cron/agent17-sentinel",
      ),
    ).toBe(false);
    expect(shouldBlockProductionIngress(mockRequest("/dashboard"), "/dashboard")).toBe(true);
  });

  it("opens non-local ingress only when IRONFRAME_ALLOW_PUBLIC_INGRESS=1", () => {
    delete process.env.IRONFRAME_ALLOW_PUBLIC_INGRESS;
    expect(isPublicIngressAllowed()).toBe(false);
    expect(shouldBlockProductionIngress(mockRequest("/"), "/")).toBe(false);
    expect(shouldBlockProductionIngress(mockRequest("/integrity"), "/integrity")).toBe(true);

    process.env.IRONFRAME_ALLOW_PUBLIC_INGRESS = "1";
    expect(isPublicIngressAllowed()).toBe(true);
    expect(shouldBlockProductionIngress(mockRequest("/integrity"), "/integrity")).toBe(false);

    delete process.env.IRONFRAME_ALLOW_PUBLIC_INGRESS;
  });

  it("returns 403 html for quarantined responses", () => {
    const res = buildDeploymentQuarantineResponse();
    expect(res.status).toBe(403);
    expect(res.headers.get("content-type")).toContain("text/html");
  });
});
