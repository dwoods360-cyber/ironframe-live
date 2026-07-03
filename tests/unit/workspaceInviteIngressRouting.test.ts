import { beforeEach, describe, expect, it, vi } from "vitest";

import { operatorSupabaseAccountExists, shouldRedirectInviteToTenantHost } from "@/app/lib/server/workspaceInviteIngressRouting";

const findSupabaseAuthUserByEmail = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({})),
}));

vi.mock("@/app/lib/server/supabaseAuthAdminHelpers", () => ({
  findSupabaseAuthUserByEmail: (...args: unknown[]) => findSupabaseAuthUserByEmail(...args),
}));

describe("workspaceInviteIngressRouting", () => {
  beforeEach(() => {
    findSupabaseAuthUserByEmail.mockReset();
  });

  it("returns true when Supabase auth user exists for invite email", async () => {
    findSupabaseAuthUserByEmail.mockResolvedValue({ id: "user-1" });
    await expect(operatorSupabaseAccountExists("operator@acmecorp.com")).resolves.toBe(true);
  });

  it("returns false when Supabase auth user is absent", async () => {
    findSupabaseAuthUserByEmail.mockResolvedValue(null);
    await expect(operatorSupabaseAccountExists("new@acmecorp.com")).resolves.toBe(false);
  });

  it("requires tenant-host redirect when invite slug does not match apex localhost", () => {
    expect(shouldRedirectInviteToTenantHost(null, "wil")).toBe(true);
    expect(shouldRedirectInviteToTenantHost("run8", "wil")).toBe(true);
    expect(shouldRedirectInviteToTenantHost("wil", "wil")).toBe(false);
  });
});
