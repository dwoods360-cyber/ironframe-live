import { describe, expect, it, vi, afterEach } from "vitest";

import {
  buildSupabaseMagicLinkVerifyUrl,
  exchangePasswordForSession,
  exchangeSupabaseMagicLinkForSession,
  isSupabaseExistingUserError,
} from "@/app/lib/server/supabaseAuthAdminHelpers";

describe("isSupabaseExistingUserError", () => {
  it("detects Supabase duplicate registration messages", () => {
    expect(isSupabaseExistingUserError("A user with this email address has already been registered")).toBe(
      true,
    );
    expect(isSupabaseExistingUserError("User already registered")).toBe(true);
    expect(isSupabaseExistingUserError("email already exists")).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isSupabaseExistingUserError("Invalid email")).toBe(false);
    expect(isSupabaseExistingUserError("rate limit exceeded")).toBe(false);
  });
});

describe("buildSupabaseMagicLinkVerifyUrl", () => {
  it("includes apikey for browser verify navigation", () => {
    const url = buildSupabaseMagicLinkVerifyUrl({
      supabaseUrl: "https://example.supabase.co/",
      anonKey: "public-anon-key",
      hashedToken: "token-hash",
      redirectTo: "http://bwc.lvh.me:3000/api/auth/callback?next=%2Fget-started",
    });

    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/auth/v1/verify");
    expect(parsed.searchParams.get("token")).toBe("token-hash");
    expect(parsed.searchParams.get("type")).toBe("magiclink");
    expect(parsed.searchParams.get("apikey")).toBe("public-anon-key");
    expect(parsed.searchParams.get("redirect_to")).toBe(
      "http://bwc.lvh.me:3000/api/auth/callback?next=%2Fget-started",
    );
  });
});

describe("exchangePasswordForSession", () => {
  const originalFetch = global.fetch;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnon;
    vi.restoreAllMocks();
  });

  it("redeems password grant via POST token endpoint", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "access",
        refresh_token: "refresh",
      }),
    });

    const result = await exchangePasswordForSession("ops@example.com", "secret-pass");

    expect(result).toEqual({ accessToken: "access", refreshToken: "refresh" });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.supabase.co/auth/v1/token?grant_type=password",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ apikey: "anon-key" }),
      }),
    );
  });
});

describe("exchangeSupabaseMagicLinkForSession", () => {
  const originalFetch = global.fetch;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnon;
    vi.restoreAllMocks();
  });

  it("redeems hashed_token via POST verify", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "access",
        refresh_token: "refresh",
      }),
    });

    const result = await exchangeSupabaseMagicLinkForSession("ops@example.com", {
      hashed_token: "hash-123",
    });

    expect(result).toEqual({ accessToken: "access", refreshToken: "refresh" });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.supabase.co/auth/v1/verify",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ apikey: "anon-key" }),
      }),
    );
  });
});
