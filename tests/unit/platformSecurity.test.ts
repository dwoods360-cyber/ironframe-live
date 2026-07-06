import { describe, expect, it, vi } from "vitest";

import {
  IRONFRAME_PLATFORM_GLOBAL_ADMIN_EMAIL,
  isPlatformGlobalAdminEmail,
} from "@/config/platformSecurity";

describe("platformSecurity", () => {
  it("defaults to the platform owner GLOBAL_ADMIN email", () => {
    expect(IRONFRAME_PLATFORM_GLOBAL_ADMIN_EMAIL).toBe("dwoods360@gmail.com");
  });

  it("recognizes the canonical GLOBAL_ADMIN email case-insensitively", () => {
    expect(isPlatformGlobalAdminEmail("dwoods360@gmail.com")).toBe(true);
    expect(isPlatformGlobalAdminEmail("  Dwoods360@Gmail.COM  ")).toBe(true);
    expect(isPlatformGlobalAdminEmail("other@example.com")).toBe(false);
    expect(isPlatformGlobalAdminEmail(null)).toBe(false);
  });

  it("honors IRONFRAME_PLATFORM_GLOBAL_ADMIN_EMAIL override", () => {
    vi.stubEnv("IRONFRAME_PLATFORM_GLOBAL_ADMIN_EMAIL", "security@ironframe.local");
    vi.resetModules();
    return import("@/config/platformSecurity").then((mod) => {
      expect(mod.IRONFRAME_PLATFORM_GLOBAL_ADMIN_EMAIL).toBe("security@ironframe.local");
      expect(mod.isPlatformGlobalAdminEmail("security@ironframe.local")).toBe(true);
      expect(mod.isPlatformGlobalAdminEmail("dwoods360@gmail.com")).toBe(false);
    });
  });
});
