import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signOut = vi.fn().mockResolvedValue({ error: null });
const replace = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signOut },
  }),
}));

vi.mock("@/app/utils/purgeClientTenantScope", () => ({
  resetAllStoresAndTenantScopeCache: vi.fn(),
}));

describe("performClientSessionLogout", () => {
  beforeEach(() => {
    vi.resetModules();
    signOut.mockClear();
    replace.mockClear();
    vi.stubGlobal("location", { replace: replace });
    document.cookie = "ironframe-tenant=tenant-uuid; path=/";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.cookie = "ironframe-tenant=; path=/; max-age=0";
  });

  it("clears tenant cookie, signs out locally, and hard-redirects to /login", async () => {
    const { performClientSessionLogout } = await import(
      "@/app/lib/auth/performClientSessionLogout"
    );

    await performClientSessionLogout();

    expect(document.cookie).not.toContain("ironframe-tenant=tenant-uuid");
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(replace).toHaveBeenCalledWith("/login");
  });
});
