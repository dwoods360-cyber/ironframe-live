import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/app/lib/tenantSubdomain", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/lib/tenantSubdomain")>();
  return {
    ...actual,
    isSubdomainTenancyEnabled: () => true,
    resolveTenantSlugFromRequestHost: () => "bwc",
    tenantUuidFromSlug: () => null,
  };
});

describe("applySubdomainTenancy", () => {
  it("does not throw when resolving host tenant uuid on tenant-bound hosts", async () => {
    const { applySubdomainTenancy } = await import("@/app/lib/middlewareSubdomainTenancy");
    const request = new NextRequest("http://bwc.lvh.me:3000/register/sample-token");
    const base = NextResponse.next();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, tenant: { id: "tenant-bwc-uuid" } }),
    }) as unknown as typeof fetch;

    await expect(applySubdomainTenancy(request, base)).resolves.toBeInstanceOf(NextResponse);
  });

  it("does not strip /register invite paths on tenant workspace hosts", async () => {
    const { applySubdomainTenancy } = await import("@/app/lib/middlewareSubdomainTenancy");
    const request = new NextRequest("http://run3.lvh.me:3000/register/sample-token", {
      headers: { host: "run3.lvh.me:3000" },
    });
    const base = NextResponse.next();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, tenant: { id: "tenant-run3-uuid" } }),
    }) as unknown as typeof fetch;

    const response = await applySubdomainTenancy(request, base);
    expect(response.status).not.toBe(307);
    expect(response.headers.get("location")).toBeNull();
  });

  it("preserves auth redirect on tenant subdomain hosts", async () => {
    const { applySubdomainTenancy } = await import("@/app/lib/middlewareSubdomainTenancy");
    const request = new NextRequest("http://bwc.ironframegrc.com/reports/audit-trail", {
      headers: { host: "bwc.ironframegrc.com" },
    });
    const loginUrl = new URL(
      "http://bwc.ironframegrc.com/login?next=%2Freports%2Faudit-trail",
    );
    const base = NextResponse.redirect(loginUrl);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, tenant: { id: "487b37d0-7942-4b6f-a637-274115b06476" } }),
    }) as unknown as typeof fetch;

    const response = await applySubdomainTenancy(request, base);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(loginUrl.toString());
  });

  it("does not stamp ironframe-tenant on /login when the cookie is absent (post-logout)", async () => {
    const { applySubdomainTenancy } = await import("@/app/lib/middlewareSubdomainTenancy");
    const request = new NextRequest("http://bwc.lvh.me:3000/login", {
      headers: { host: "bwc.lvh.me:3000" },
    });
    const base = NextResponse.next();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, tenant: { id: "487b37d0-7942-4b6f-a637-274115b06476" } }),
    }) as unknown as typeof fetch;

    const response = await applySubdomainTenancy(request, base);
    expect(response.cookies.get("ironframe-tenant")).toBeUndefined();
  });

  it("does not strip /boardroom namespace paths on tenant subdomain hosts", async () => {
    const { applySubdomainTenancy } = await import("@/app/lib/middlewareSubdomainTenancy");
    const request = new NextRequest(
      "http://bwc.ironframegrc.com/boardroom/admin/audit-logs?tenant=bwc",
      { headers: { host: "bwc.ironframegrc.com" } },
    );
    const base = NextResponse.next();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, tenant: { id: "487b37d0-7942-4b6f-a637-274115b06476" } }),
    }) as unknown as typeof fetch;

    const response = await applySubdomainTenancy(request, base);
    expect(response.status).not.toBe(307);
    expect(response.headers.get("location")).toBeNull();
  });

  it("preserves tenant host when stripping a conflicting path-prefix slug", async () => {
    vi.resetModules();
    vi.doMock("@/app/lib/tenantSubdomain", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/app/lib/tenantSubdomain")>();
      return {
        ...actual,
        isSubdomainTenancyEnabled: () => true,
        resolveTenantSlugFromRequestHost: () => "run3",
        tenantUuidFromSlug: () => null,
        pathTenantSlugFromPathname: () => "other-tenant",
      };
    });

    const { applySubdomainTenancy } = await import("@/app/lib/middlewareSubdomainTenancy");
    const request = new NextRequest("http://localhost:3000/other-tenant/vendors", {
      headers: { host: "run3.lvh.me:3000" },
    });
    const base = NextResponse.next();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, tenant: { id: "tenant-run3-uuid" } }),
    }) as unknown as typeof fetch;

    const response = await applySubdomainTenancy(request, base);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://run3.lvh.me:3000/vendors");
  });
});
