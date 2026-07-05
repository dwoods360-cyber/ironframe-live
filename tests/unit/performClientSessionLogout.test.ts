import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();

describe("performClientSessionLogout", () => {
  beforeEach(() => {
    vi.resetModules();
    replace.mockClear();
    vi.stubGlobal("location", { replace: replace, protocol: "https:" });
    document.cookie = "ironframe-tenant=tenant-uuid; path=/";
    document.cookie = "ironframe-simulation-mode=0; path=/";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.cookie = "ironframe-tenant=; path=/; max-age=0; Secure";
    document.cookie = "ironframe-simulation-mode=; path=/; max-age=0; Secure";
  });

  it("clears workspace cookies client-side and hard-navigates to server logout redirect", async () => {
    const { performClientSessionLogout } = await import(
      "@/app/lib/auth/performClientSessionLogout"
    );

    performClientSessionLogout();

    expect(document.cookie).not.toContain("ironframe-tenant=tenant-uuid");
    expect(document.cookie).not.toContain("ironframe-simulation-mode=0");
    expect(replace).toHaveBeenCalledWith("/api/auth/session-logout?next=%2Flogin");
  });
});
