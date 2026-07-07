import { afterEach, describe, expect, it, vi } from "vitest";
import {
  tenantSlugFromHost,
  tenantUuidFromSlug,
  pathTenantSlugFromPathname,
  buildTenantSubdomainOrigin,
  formatLocalTenantWorkspaceUrl,
  buildTenantLoginRedirectUrl,
  resolvePostAuthLandingPath,
  resolveTenantSlugFromRequestHost,
} from "@/app/lib/tenantSubdomain";

describe("tenantSubdomain", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("parses lvh.me dev hosts via resolveTenantSlugFromRequestHost", () => {
    expect(resolveTenantSlugFromRequestHost("medshield.lvh.me:3000")).toBe("medshield");
    expect(tenantSlugFromHost("medshield.lvh.me:3000")).toBe("medshield");
  });

  it("parses legacy localhost dev hosts when suffix is localhost", () => {
    vi.stubEnv("IRONFRAME_LOCAL_TENANT_HOST", "localhost");
    expect(tenantSlugFromHost("vaultbank.localhost:3000")).toBe("vaultbank");
    expect(buildTenantSubdomainOrigin("vaultbank", 3000)).toBe("http://vaultbank.localhost:3000");
  });

  it("returns null for bare localhost apex", () => {
    expect(tenantSlugFromHost("localhost:3000")).toBeNull();
    expect(tenantSlugFromHost("127.0.0.1:3000")).toBeNull();
  });

  it("parses configured production apex", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("IRONFRAME_TENANT_APEX_DOMAIN", "ironframegrc.com");
    expect(tenantSlugFromHost("vaultbank.ironframegrc.com")).toBe("vaultbank");
    expect(tenantSlugFromHost("ironframegrc.com")).toBeNull();
    expect(tenantSlugFromHost("www.ironframegrc.com")).toBeNull();
  });

  it("returns null for PaaS managed hosts (Cloud Run, Vercel)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("IRONFRAME_TENANT_APEX_DOMAIN", "ironframegrc.com");
    expect(tenantSlugFromHost("sovereign-sentinel-433091252568.us-central1.run.app")).toBeNull();
    expect(tenantSlugFromHost("ironframe-live.vercel.app")).toBeNull();
  });

  it("detects path tenant prefixes", () => {
    expect(pathTenantSlugFromPathname("/medshield/vendors")).toBe("medshield");
    expect(pathTenantSlugFromPathname("/integrity")).toBeNull();
    expect(pathTenantSlugFromPathname("/exports")).toBeNull();
    expect(pathTenantSlugFromPathname("/register/sample-token")).toBeNull();
    expect(pathTenantSlugFromPathname("/boardroom/admin/audit-logs")).toBeNull();
  });

  it("parses dynamic client slugs from host labels", () => {
    expect(tenantSlugFromHost("acmecorp.lvh.me:3000")).toBe("acmecorp");
    expect(tenantSlugFromHost("integrity.lvh.me:3000")).toBeNull();
  });

  it("builds local subdomain origin with lvh.me by default", () => {
    expect(buildTenantSubdomainOrigin("vaultbank", 3000)).toBe("http://vaultbank.lvh.me:3000");
    expect(formatLocalTenantWorkspaceUrl("acmecorp", 3000)).toBe("http://acmecorp.lvh.me:3000");
  });

  it("builds tenant login redirect from NEXT_PUBLIC_DEVELOPMENT_DOMAIN", () => {
    vi.stubEnv("NEXT_PUBLIC_DEVELOPMENT_DOMAIN", "lvh.me:3000");
    expect(buildTenantLoginRedirectUrl("acmecorp")).toBe("http://acmecorp.lvh.me:3000/login");
  });

  it("resolves seed tenant UUID from slug", () => {
    expect(tenantUuidFromSlug("vaultbank")).toBe("c6932d16-a716-4a07-9bc4-6ec987f641e2");
  });

  it("resolves post-auth landing by host", () => {
    expect(resolvePostAuthLandingPath("localhost:3000")).toBe("/integrity");
    expect(resolvePostAuthLandingPath("vaultbank.lvh.me:3000")).toBe("/");
  });
});
