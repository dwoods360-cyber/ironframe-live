import { describe, expect, it } from "vitest";

import {
  IRONBOARD_CONSOLE_PROXY_PREFIX,
  IRONBOARD_OPERATIONS_PORTAL_PATH,
  ironboardConsoleBaseHref,
  ironboardConsoleProxyPath,
} from "@/app/lib/ironboardConsolePaths";
import { injectIronboardConsoleBaseHref } from "@/app/lib/server/ironboardConsoleProxy";

describe("ironboard console paths", () => {
  it("routes GLOBAL_ADMIN portal through the secured same-origin proxy", () => {
    expect(IRONBOARD_OPERATIONS_PORTAL_PATH).toBe("/dashboard/operations/ironboard");
    // No trailing slash on root — Next/Vercel 308-redirects slash → non-slash.
    expect(ironboardConsoleProxyPath()).toBe(IRONBOARD_CONSOLE_PROXY_PREFIX);
    expect(ironboardConsoleProxyPath("api/query")).toBe(
      `${IRONBOARD_CONSOLE_PROXY_PREFIX}/api/query`,
    );
    expect(ironboardConsoleBaseHref()).toBe(`${IRONBOARD_CONSOLE_PROXY_PREFIX}/`);
  });

  it("injects a directory-form base href so proxied boardroom APIs resolve correctly", () => {
    const html = injectIronboardConsoleBaseHref(
      "<html><head><title>IronBoard</title></head><body></body></html>",
      ironboardConsoleBaseHref(),
    );
    expect(html).toContain('<base href="/api/admin/operations-hub/ironboard-console/" />');
  });

  it("resolves board API paths under the console when baseURI lacks a trailing slash", () => {
    // Mirrors boardApiUrl() when Next lands the iframe on the non-slash console URL.
    const bare = "https://ironframegrc.com/api/admin/operations-hub/ironboard-console";
    const broken = new URL("api/query", bare).href;
    expect(broken).toBe("https://ironframegrc.com/api/admin/operations-hub/api/query");

    const fixedBase = bare.endsWith("/") ? bare : `${bare}/`;
    expect(new URL("api/query", fixedBase).href).toBe(
      "https://ironframegrc.com/api/admin/operations-hub/ironboard-console/api/query",
    );
  });
});
