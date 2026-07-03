import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildAuthCallbackUrl,
  isPasswordRecoveryNextPath,
  resolveAuthNextPathForHost,
  resolveLocalDevAppPort,
  resolvePublicAppUrl,
  resolveSupabaseInviteRedirectOrigin,
  resolveSupabasePasswordResetRedirectOrigin,
  resolveTenantAuthRedirectOrigin,
} from "@/app/lib/auth/publicAppUrl";

describe("publicAppUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolveLocalDevAppPort prefers NEXT_PUBLIC_APP_URL port", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3001");
    vi.stubEnv("PORT", "3000");
    expect(resolveLocalDevAppPort()).toBe(3001);
  });

  it("resolveSupabaseInviteRedirectOrigin uses tenant subdomain in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    expect(resolveSupabaseInviteRedirectOrigin("acmecorp")).toBe("http://acmecorp.lvh.me:3000");
  });

  it("resolveSupabaseInviteRedirectOrigin uses tenant subdomain in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("IRONFRAME_TENANT_APEX_DOMAIN", "ironframegrc.com");
    expect(resolveSupabaseInviteRedirectOrigin("acmecorp")).toBe("https://acmecorp.ironframegrc.com");
  });

  it("buildAuthCallbackUrl encodes safe next path on invite redirect", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    const origin = resolveSupabaseInviteRedirectOrigin("acmecorp");
    expect(buildAuthCallbackUrl(origin, "/integrity")).toBe(
      "http://acmecorp.lvh.me:3000/api/auth/callback?next=%2Fintegrity",
    );
    expect(buildAuthCallbackUrl(origin, "/get-started", { workspaceTenantSlug: "acmecorp" })).toBe(
      "http://acmecorp.lvh.me:3000/api/auth/callback?next=%2Fget-started&tenant=acmecorp",
    );
  });

  it("resolveTenantAuthRedirectOrigin uses dev port from NEXT_PUBLIC_APP_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3001");
    vi.stubEnv("NEXT_PUBLIC_DEVELOPMENT_DOMAIN", "lvh.me:3000");
    expect(resolveTenantAuthRedirectOrigin("acmecorp")).toBe("http://acmecorp.lvh.me:3001");
  });

  it("resolvePublicAppUrl strips trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000/");
    expect(resolvePublicAppUrl()).toBe("http://localhost:3000");
  });

  it("isPasswordRecoveryNextPath detects reset-password callback target", () => {
    expect(isPasswordRecoveryNextPath("/reset-password")).toBe(true);
    expect(isPasswordRecoveryNextPath("%2Freset-password")).toBe(false);
    expect(isPasswordRecoveryNextPath("/integrity")).toBe(false);
  });

  it("resolveAuthNextPathForHost preserves get-started on tenant subdomain", () => {
    expect(resolveAuthNextPathForHost("bwc.lvh.me:3000", "/get-started")).toBe("/get-started");
    expect(resolveAuthNextPathForHost("bwc.lvh.me:3000", "/exports")).toBe("/exports");
    expect(resolveAuthNextPathForHost("localhost:3000", "/get-started")).toBe("/get-started");
    expect(resolveAuthNextPathForHost("bwc.lvh.me:3000", null)).toBe("/");
    expect(resolveAuthNextPathForHost("localhost:3000", null)).toBe("/integrity");
    expect(resolveAuthNextPathForHost("bwc.lvh.me:3000", "/integrity")).toBe("/");
  });

  it("resolveSupabasePasswordResetRedirectOrigin uses NEXT_PUBLIC_APP_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    expect(resolveSupabasePasswordResetRedirectOrigin()).toBe("http://localhost:3000");
  });
});
