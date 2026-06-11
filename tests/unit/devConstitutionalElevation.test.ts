import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEV_CONSTITUTIONAL_ROLE_BUNDLE,
  isDevConstitutionalAuthorityUser,
  isDevConstitutionalElevationEnabled,
} from "@/app/lib/grc/devConstitutionalElevation";

describe("devConstitutionalElevation", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllEnvs();
  });

  it("is disabled outside development", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isDevConstitutionalElevationEnabled()).toBe(false);
  });

  it("elevates configured dev email in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("IRONFRAME_DEV_SUPABASE_EMAIL", "po@ironframe.local");
    expect(
      isDevConstitutionalAuthorityUser({
        id: "uuid-1",
        email: "po@ironframe.local",
      } as never),
    ).toBe(true);
    expect(
      isDevConstitutionalAuthorityUser({
        id: "uuid-2",
        email: "other@ironframe.local",
      } as never),
    ).toBe(false);
  });

  it("includes Internal Auditor, Global Admin, CISO, and GRC Manager", () => {
    expect(DEV_CONSTITUTIONAL_ROLE_BUNDLE).toEqual(
      expect.arrayContaining(["INTERNAL_AUDITOR", "GLOBAL_ADMIN", "CISO", "GRC_MANAGER"]),
    );
  });
});
