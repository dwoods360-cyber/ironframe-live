import { describe, expect, it } from "vitest";

import { buildSupabaseRedirectAllowlist } from "@/app/lib/auth/supabaseRedirectAllowlist";

describe("supabaseRedirectAllowlist", () => {
  it("includes staging wildcard and lvh.me dev hosts", () => {
    const list = buildSupabaseRedirectAllowlist();
    expect(list.some((entry) => entry.includes("staging."))).toBe(true);
    expect(list.some((entry) => entry.includes("lvh.me"))).toBe(true);
  });
});
