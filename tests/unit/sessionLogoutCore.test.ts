import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { resolveSessionLogoutNextPath } from "@/app/lib/auth/sessionLogoutCore";

describe("resolveSessionLogoutNextPath", () => {
  it("defaults to /login when next is missing or unsafe", () => {
    expect(resolveSessionLogoutNextPath(new NextRequest("http://bwc.lvh.me:3000/api/auth/session-logout"))).toBe(
      "/login",
    );
    expect(
      resolveSessionLogoutNextPath(
        new NextRequest("http://bwc.lvh.me:3000/api/auth/session-logout?next=//evil.example"),
      ),
    ).toBe("/login");
  });

  it("allows same-origin relative paths", () => {
    expect(
      resolveSessionLogoutNextPath(
        new NextRequest("http://bwc.lvh.me:3000/api/auth/session-logout?next=/login"),
      ),
    ).toBe("/login");
  });
});
