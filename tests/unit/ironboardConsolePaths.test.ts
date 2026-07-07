import { describe, expect, it } from "vitest";

import {
  IRONBOARD_CONSOLE_PROXY_PREFIX,
  IRONBOARD_OPERATIONS_PORTAL_PATH,
  ironboardConsoleProxyPath,
} from "@/app/lib/ironboardConsolePaths";
import { injectIronboardConsoleBaseHref } from "@/app/lib/server/ironboardConsoleProxy";

describe("ironboard console paths", () => {
  it("routes GLOBAL_ADMIN portal through the secured same-origin proxy", () => {
    expect(IRONBOARD_OPERATIONS_PORTAL_PATH).toBe("/dashboard/operations/ironboard");
    expect(ironboardConsoleProxyPath()).toBe(`${IRONBOARD_CONSOLE_PROXY_PREFIX}/`);
    expect(ironboardConsoleProxyPath("api/query")).toBe(
      `${IRONBOARD_CONSOLE_PROXY_PREFIX}/api/query`,
    );
  });

  it("injects a base href so proxied boardroom assets stay on the proxy prefix", () => {
    const html = injectIronboardConsoleBaseHref(
      "<html><head><title>IronBoard</title></head><body></body></html>",
      "/api/admin/operations-hub/ironboard-console/",
    );
    expect(html).toContain('<base href="/api/admin/operations-hub/ironboard-console/" />');
  });
});
